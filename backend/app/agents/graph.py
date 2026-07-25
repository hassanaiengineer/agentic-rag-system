from typing import TypedDict, Sequence, Annotated
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field

import logging

logger = logging.getLogger(__name__)


class GraphState(TypedDict):
    question: str
    tenant_id: str
    context: str
    documents: list
    search_queries: list[str]
    iteration_count: int
    is_relevant: bool
    available_documents: list[str]
    intent: str

class GraderOutput(BaseModel):
    is_relevant: str = Field(description="Binary 'yes' or 'no' indicating if the documents or system notes contain the answer to the question.")

class SearchQueriesOutput(BaseModel):
    queries: list[str] = Field(description="List of exactly 3 diverse search queries (1 semantic, 2 keyword-focused).")

class IntentOutput(BaseModel):
    intent: str = Field(description="Either 'chitchat' for greetings, small talk, thanks, or general/meta questions about the assistant itself; or 'document' for anything that should be answered from the uploaded knowledge base (including questions about which documents exist).")

class AgenticRAGGraph:
    def __init__(self, retrieval_service, llm_service):
        self.retrieval_service = retrieval_service
        self.llm_service = llm_service
        
        self.grader_llm = self.llm_service.chat_model.with_structured_output(GraderOutput)
        self.expander_llm = self.llm_service.chat_model.with_structured_output(SearchQueriesOutput)
        self.classifier_llm = self.llm_service.chat_model.with_structured_output(IntentOutput)

        workflow = StateGraph(GraphState)

        workflow.add_node("classify", self.classify)
        workflow.add_node("retrieve", self.retrieve)
        workflow.add_node("grade_context", self.grade_context)
        workflow.add_node("expand_search", self.expand_search)
        workflow.add_node("generate", self.generate)

        workflow.set_entry_point("classify")

        workflow.add_conditional_edges(
            "classify",
            self.route_intent,
            {
                "chitchat": "generate",
                "document": "retrieve"
            }
        )

        workflow.add_edge("retrieve", "grade_context")

        workflow.add_conditional_edges(
            "grade_context",
            self.should_expand,
            {
                "expand": "expand_search",
                "generate": "generate"
            }
        )

        workflow.add_edge("expand_search", "retrieve")
        workflow.add_edge("generate", END)

        self.app = workflow.compile()

    def _format_docs(self, docs):
        parts = []
        for d in docs:
            parts.append(
                f"[doc={d.metadata.get('document_name', 'unknown')} "
                f"page={d.metadata.get('page_number', '?')} "
                f"chunk={d.metadata.get('chunk_id', -1)}]\n{d.text}"
            )
        return "\n\n---\n\n".join(parts)

    async def classify(self, state: GraphState):
        logger.info("---CLASSIFY---")
        question = state["question"]

        prompt = f"""You are an intent router for a document-intelligence assistant.
        Classify the user's message into exactly one of two intents:

        - 'chitchat': greetings, small talk, thanks, or general/meta questions about you (the assistant),
          your capabilities or who you are. Examples: "hey", "hello", "hi there", "how are you",
          "what can you do", "who are you", "thanks", "good morning".
        - 'document': any question that should be answered using the uploaded knowledge base, OR any
          question about which/how many documents are currently available. Examples: "summarize the contract",
          "what does the report say about revenue", "what documents do you have".

        When in doubt, choose 'document'.

        User message: {question}"""

        try:
            result = await self.classifier_llm.ainvoke([HumanMessage(content=prompt)])
            intent = (result.intent or "").strip().lower()
            if intent not in ("chitchat", "document"):
                intent = "document"
        except Exception as e:
            logger.error(f"Classifier error: {e}")
            intent = "document"

        logger.info(f"Intent classified as: {intent}")
        return {"intent": intent}

    def route_intent(self, state: GraphState):
        if state.get("intent") == "chitchat":
            logger.info("---DECISION: CHITCHAT---")
            return "chitchat"
        logger.info("---DECISION: DOCUMENT---")
        return "document"

    @property
    def _config(self):
        return self.retrieval_service.runtime_config

    async def retrieve(self, state: GraphState):
        logger.info("---RETRIEVE---")
        question = state["question"]
        tenant_id = state.get("tenant_id", "system_default")
        queries = state.get("search_queries", [question])
        documents = state.get("documents", [])
        available_docs = state.get("available_documents", [])

        top_k = self._config.retrieval_top_k

        # Build System Note regarding workspace status
        if not available_docs:
            workspace_info = "[SYSTEM NOTE: The knowledge base is currently EMPTY. Zero documents are uploaded.]"
        else:
            workspace_info = f"[SYSTEM NOTE: The knowledge base currently contains {len(available_docs)} document(s): {', '.join(available_docs)}]"

        all_docs = []
        # Only query vector store if there are actual queries
        if queries:
            for q in queries:
                docs = self.retrieval_service.retrieve(query=q, top_k=top_k, tenant_id=tenant_id)
                all_docs.extend(docs)
            
        seen = set()
        deduped = documents.copy()
        for d in deduped:
            seen.add(d.text)
            
        for d in all_docs:
            if d.text not in seen:
                seen.add(d.text)
                deduped.append(d)
                
        deduped.sort(key=lambda x: x.score, reverse=True)
        deduped = deduped[:15]
        
        context = workspace_info + "\n\n" + self._format_docs(deduped)
        return {"documents": deduped, "context": context}

    async def grade_context(self, state: GraphState):
        logger.info("---GRADE CONTEXT---")
        question = state["question"]
        context = state["context"]
        documents = state.get("documents", [])
        iteration_count = state.get("iteration_count", 0)

        # Admins can disable the self-correction grader from the dashboard.
        if not self._config.grader_enabled:
            logger.info("Grader disabled via runtime config; treating context as relevant.")
            return {"iteration_count": iteration_count, "is_relevant": True}

        # Optimization: Only grade the system note + top 3 chunks to vastly reduce LLM processing time
        top_docs = documents[:3]
        workspace_info = context.split("\n\n---")[0] if "\n\n---" in context else context
        context_to_grade = workspace_info + "\n\n" + self._format_docs(top_docs)
        
        prompt = f"""You are a grader assessing relevance of a retrieved document or system note to a user question.
        Here is the context: \n\n {context_to_grade} \n\n
        Here is the user question: {question} \n
        If the document OR the SYSTEM NOTE contains information related to the user question, grade it as relevant.
        Give a binary score 'yes' or 'no' to indicate whether the context is relevant to the question."""
        
        try:
            result = await self.grader_llm.ainvoke([HumanMessage(content=prompt)])
            is_relevant = result.is_relevant.lower() == "yes"
        except Exception as e:
            logger.error(f"Grader error: {e}")
            is_relevant = False
            
        if not is_relevant:
            iteration_count += 1
            logger.info(f"Context not relevant. Iteration count: {iteration_count}")
        else:
            logger.info("Context relevant.")
            
        return {"iteration_count": iteration_count, "is_relevant": is_relevant}

    def should_expand(self, state: GraphState):
        is_relevant = state.get("is_relevant", False)
        iteration_count = state.get("iteration_count", 0)
        
        if not is_relevant and iteration_count < self._config.max_iterations:
            logger.info("---DECISION: EXPAND SEARCH---")
            return "expand"
        else:
            logger.info("---DECISION: GENERATE---")
            return "generate"

    async def expand_search(self, state: GraphState):
        logger.info("---EXPAND SEARCH---")
        question = state["question"]
        
        prompt = f"""You are an expert search strategist. The original search query failed to find the right information.
        Original Query: {question}
        Generate exactly 3 diverse search queries (1 semantic, 2 keyword-focused) to broaden the search."""
        
        try:
            result = await self.expander_llm.ainvoke([HumanMessage(content=prompt)])
            queries = result.queries
        except Exception as e:
            logger.error(f"Expand search error: {e}")
            queries = [question]
            
        return {"search_queries": queries}

    async def generate(self, state: GraphState):
        logger.info("---GENERATE---")
        question = state["question"]
        context = state["context"]

        if state.get("intent") == "chitchat":
            # Conversational reply: no document retrieval involved. Stream a warm, natural response.
            available = state.get("available_documents", [])
            if available:
                doc_status = (
                    f"The knowledge base currently contains {len(available)} document(s): "
                    f"{', '.join(available)}."
                )
            else:
                doc_status = "The knowledge base is currently empty (no documents uploaded yet)."

            prompt = f"""You are RAG.ai, a friendly and professional AI document-intelligence assistant.
            The user sent a conversational message (a greeting, small talk, or a general question about you).
            Reply warmly and concisely in 1-3 sentences. Do NOT pretend to search any documents and do NOT say
            you couldn't find information. Briefly invite the user to ask questions about their uploaded documents.

            Workspace status (only mention if relevant): {doc_status}

            User message: {question}
            Your reply:"""
            return {"question": prompt}

        if not state.get("is_relevant", False):
            # Bypass the LLM entirely if the context was graded as irrelevant and we couldn't expand successfully.
            # We just return the exact string we want streamed.
            prompt = (
                "SYSTEM OVERRIDE: Do not answer the user's question. Instead, output EXACTLY this text and nothing else: "
                "\"I have carefully checked the uploaded documents, but unfortunately, I couldn't find "
                "the specific information needed to answer this question. "
                "\\n\\nWould you like to explore another topic or ask something else about your documents?\""
            )
        else:
            prompt = f"""You are a helpful assistant for question-answering tasks. 
            Use the following pieces of retrieved context (and SYSTEM NOTES) to answer the question. 
            
            CRITICAL INSTRUCTIONS FOR 'WORKSPACE STATUS' QUESTIONS:
            If the user asks what documents you have, how many you have, or what is in your knowledge base:
            1. If the SYSTEM NOTE says the knowledge base is EMPTY, reply EXACTLY with: "I currently don't have any documents in my knowledge base. You can upload them to start questioning."
            2. If the SYSTEM NOTE lists documents, reply naturally starting with: "Here are the documents I currently have:\n" then list each document as a bullet point on a NEW LINE, and end with a new line "\nAsk me questions about these documents!"

            For all other general questions:
            Answer concisely based strictly on the provided context.
            DO NOT use your general knowledge to answer the question. If the answer cannot be deduced entirely from the context, reply EXACTLY with: "I couldn't find the specific information needed to answer this question."

            FORMATTING RULES (very important):
            - Format your answer in clean Markdown. Use short paragraphs and bullet points (with "- ") where it improves readability.
            - The context blocks are tagged internally like [doc=FILENAME page=N chunk=N]. These are INTERNAL tags.
              NEVER copy or output these raw tags (do not write "[doc=...]", "page=", or "chunk=" anywhere).
            - To cite, end your answer with a final separate line in EXACTLY this Markdown format, listing only the
              distinct source file name(s) you actually used, comma-separated, and nothing else:
              *Source: filename.pdf*   (or, for multiple)   *Sources: fileA.pdf, fileB.pdf*

            Question: {question}
            Context: {context}
            Answer:"""
            
        return {"question": prompt}

