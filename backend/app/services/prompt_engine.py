class PromptEngine:
    SYSTEM_PROMPTS = {
        "qa": (
            "You are a strict retrieval-grounded assistant. "
            "Answer ONLY using provided context. "
            "If answer is not explicitly in context, output exactly: NOT FOUND. "
            "Do not infer, guess, or use external knowledge."
        ),
        "summary": (
            "You are a strict summarization assistant. "
            "Summarize only facts from provided context using concise bullet points. "
            "Do not add outside knowledge."
        ),
        "insights": (
            "You are a strict analysis assistant. "
            "Extract key insights, risks, and important information from context only. "
            "No external assumptions."
        ),
    }

    @classmethod
    def build_messages(cls, mode: str, query: str, context: str) -> str:
        system = cls.SYSTEM_PROMPTS[mode]
        return (
            f"System Instruction:\n{system}\n\n"
            f"User Request:\n{query}\n\n"
            f"Retrieved Context:\n{context}\n\n"
            "Return the response as plain text."
        )
