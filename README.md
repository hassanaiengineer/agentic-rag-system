# Document Intelligence Engine (Agentic RAG MVP)

A production-grade, multi-tenant Document Intelligence system featuring Agentic LangGraph orchestration, true Reciprocal Rank Fusion (RRF), and a premium React SaaS dashboard with real-time streaming token generation.

![RAG.ai Dashboard](dashboard.png)

## 🚀 Key Architectural Upgrades

- **Agentic RAG Orchestration (`LangGraph`)**: 
  - **Self-Correction:** The `Grade Context` node utilizes structured LLM outputs to evaluate retrieved context relevance. If relevance is low, the graph autonomously routes to an `Expand Search` node to generate diverse fallback queries (Semantic + Keyword) before retrying.
- **Premium SaaS Frontend**:
  - React 18 dashboard featuring an Agentic "Thinking Timeline" that visualizes LangGraph state changes (`retrieve` → `grade` → `expand`) to the user.
  - Multi-tenant state management via Zustand and TanStack Query.
- **High-Performance Streaming**: 
  - Leverages LangChain's `astream_events` piped through FastAPI's `StreamingResponse` using Server-Sent Events (SSE). Emits `{"type": "node"}` statuses for the UI (e.g., "Thinking..."), followed by `{"type": "token"}` for real-time answer generation.
- **Enterprise Multi-Tenancy**: 
  - Enforced isolation across all API endpoints using the `X-Tenant-ID` header. 
  - Documents, Vector Stores (ChromaDB filters), and Lexical Indexes are scoped securely by tenant.
- **Scalable BM25s Lexical Memory**:
  - Migrated to the highly-scalable `bm25s`. Features `mmap=True` lazy-loading to keep FastAPI startup times under 2 seconds regardless of index size.
- **True Reciprocal Rank Fusion (RRF)**:
  - Industry-standard RRF formula `score = 1 / (60 + rank)`, ensuring mathematical robustness when merging Dense (Semantic) and Sparse (BM25s) retrieval pools.

---

## 🏗️ Architecture

**Backend (`FastAPI` - Python 3.12):**
- `app/agents/graph.py`: LangGraph State Machine (Retrieve -> Grade -> Expand -> Generate).
- `app/services/ingestion.py`: Hybrid extraction (PyMuPDF + Tesseract OCR fallback) + Edge Case handling.
- `app/services/chunking.py`: Context-aware boundary chunking preserving `page_number` logic.
- `app/services/vector_store.py`: Tenant-scoped ChromaDB persistence.
- `app/services/retrieval.py`: Reciprocal Rank Fusion (Semantic + Keyword).

**Frontend (`React + Vite + Tailwind`):**
- `src/store/useUIStore.ts`: Global state (Zustand) for chat history and active tenant.
- `src/hooks/useStreamingChat.ts`: SSE parser that converts NDJSON into typing effects.
- `src/components/ThinkingTimeline.tsx`: Visual feedback for AI agent actions.

---

## 🐳 Quick Start (Docker Compose)

The easiest way to run the entire stack (Frontend + Backend) is using Docker Compose.

1. Create env file at `rag_system/.env`:
```env
GEMINI_API_KEY=<your_key_here>
```

2. Build and run the stack:
```bash
docker-compose up --build
```

3. Access the application:
- **Frontend Dashboard:** `http://localhost:5173`
- **Backend API Docs:** `http://localhost:8000/docs`

---

## 🚀 Deployment (Vercel + Railway)

This repository is strictly configured for stateless frontend hosting (Vercel) and stateful backend hosting with persistent volumes (Railway).

For a complete, step-by-step production deployment tutorial covering volume mounting, CORS hardening, and environment configuration, please read the [**Deployment Guide**](deployment_guide.md).

---

## ⚙️ Manual Setup (Local Development)

If you prefer to run the services locally without Docker:

### 1. Backend Setup
**Prerequisites:** Tesseract OCR (`sudo apt-get install tesseract-ocr`) & Poppler (`sudo apt-get install poppler-utils`)

```bash
cd rag_system/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run Backend
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd rag_system/frontend
npm install

# Run Frontend
npm run dev
```

---

## 📡 API Reference

### `POST /query` (Streaming Endpoint)
Asynchronous stream yielding LangGraph node traversal states, followed by text tokens.
- **Headers:** `X-Tenant-ID: <tenant_string>`

Stream Output (SSE `text/event-stream`):
```text
data: {"type": "node", "node_name": "retrieve"}
data: {"type": "node", "node_name": "grade_context"}
data: {"type": "token", "content": "The "}
data: {"type": "token", "content": "termination "}
data: [DONE]
```

---

## 🧪 Automated Benchmarking
A production benchmark suite is provided utilizing `pytest-asyncio`. Run it via:
```bash
cd backend
PYTHONPATH=. pytest tests/performance_bench.py -v -s
```