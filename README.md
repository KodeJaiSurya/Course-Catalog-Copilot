# Husky Course Intelligence Advisor

Course: **CS 5170 – Human-Centered AI (Spring 2025)**  
Team: **Jai Surya Kode · Lokesh Saipureddi · Annamayya Vennelakanti · Venkata Krishna Garapati**

---

## 1. What This Project Delivers
- AI assistant that routes student questions through a LangGraph agent to:
  - search/ingest Northeastern professor reviews and course catalogs (RAG over pgvector)
  - surface professor/course recommendations, fairness/ethics disclosures, and profile-aware suggestions
- FastAPI backend with JWT auth, LangChain/OpenAI tooling, and a Postgres checkpointer
- React + TypeScript + Tailwind frontend (Vite) with multi-step onboarding, conversation history, and policy pages

---

## 2. Tech Stack at a Glance
- **Backend:** FastAPI, SQLAlchemy, LangChain/LangGraph, pgvector, sentence-transformers/OpenAI, DuckDuckGo search helper
- **Database:** PostgreSQL 16 + `pgvector` extension (via `pgvector/pgvector` image) with optional PGAdmin 4 dashboard
- **Frontend:** React 19, React Router, Tailwind, Radix UI primitives, Fuse.js fuzzy course selector
- **Tooling:** Docker Compose, Python `venv`, npm, uvicorn, Alembic-ready schema (simple `Base.metadata.create_all`)

Repository layout (top-level):
```
HCAI-Project/
├── backend source (main.py, router/, services/, models/, db/, utils/, data/)
├── frontend/ (Vite app)
├── docker-compose.yaml (Postgres + PGAdmin)
├── requirements.txt / package-lock.json
└── README.md (this guide)
```

---

## 3. Prerequisites
- macOS/Linux/Windows with Docker Desktop (or podman) running
- Python 3.11+ (`python3 --version`)
- Node.js 20+ (`node --version`) and npm 10+
- Git
- OpenAI API key (required for the LangGraph agent) and optional SERP/DuckDuckGo keys

---

## 4. Backend Environment
### 4.1. Create and activate a virtual environment
```bash
cd HCAI-Project
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 4.2. Environment variables
Create `.env` in the repo root:
```dotenv
OPENAI_API_KEY=sk-...
SERP_API_KEY=your-serp-api-key             # optional – DuckDuckGo fallback is built in

POSTGRES_USER=teamuser
POSTGRES_PASSWORD=secretpassword
POSTGRES_DB=teamdb
POSTGRES_HOST=localhost                    # or the container name when deployed
POSTGRES_PORT=5432

BACKEND_URL=http://localhost:8000
```
> The FastAPI app reads `DATABASE_URL` from these fields and shares it with LangGraph’s `PostgresSaver`.

If you prefer local sentence-transformers instead of paid OpenAI embeddings, edit `services/embedding_service.py` (the model loader is already configured) and leave `OPENAI_API_KEY` blank. **The LangGraph router still needs an OpenAI chat model**, so replace `ChatOpenAI` with your preferred local model before doing so.

---

## 5. Database + PGAdmin
### 5.1. Start PostgreSQL and PGAdmin
```bash
docker compose up -d
```
Services exposed:
- Postgres (`pgvector/pgvector:pg16`) on `localhost:5432`
- PGAdmin 4 on `http://localhost:8080` (default login `admin@example.com` / `admin`)

The Postgres image already contains the `pgvector` extension. Enable it inside `teamdb` once:
```sql
-- Run inside psql or PGAdmin's query tool
CREATE EXTENSION IF NOT EXISTS vector;
```

### 5.2. PGAdmin connection walkthrough
1. Visit `http://localhost:8080`, log in with the default credentials above.
2. Click “Add New Server” → **General** tab: Name it `HCAI-Postgres`.
3. **Connection** tab:
   - Host name/address: `db` (container name) or `localhost`
   - Port: `5432`
   - Maintenance DB: `teamdb`
   - Username: `teamuser`
   - Password: `secretpassword`
4. Save. You can now inspect schemas, tables, and run SQL. PGAdmin stores the credentials in its container volume.

To stop services:
```bash
docker compose down
```

---

## 6. Initialize the Database Schema
With the virtualenv active and `.env` loaded:
```bash
python -c "from db.init_db import init_db; init_db()"
```
This calls `Base.metadata.create_all` for users, chat history, professor/course embeddings, and LangGraph checkpoints.

---

## 7. Launch the FastAPI Backend
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
- Interactive docs: `http://localhost:8000/docs`
- Health check: `GET /health`
- Courses cached for autocomplete: `GET /cleaned_titles`

Keep this terminal running while you test the frontend or ingestion scripts.

---

## 8. Bootstrapping an Account & JWT
1. **Register** (run once):
   ```bash
   curl -X POST http://localhost:8000/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "demo@student.edu",
       "username": "demo",
       "password": "pass1234",
       "degree": "MSCS",
       "course": "AI",
       "courses_taken": ["CS 5001"]
     }'
   ```
2. **Login** to get a bearer token:
   ```bash
   curl -X POST http://localhost:8000/auth/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=demo@student.edu&password=pass1234"
   ```
3. Copy the `access_token` field; pass it as `Authorization: Bearer <token>` for all protected APIs (chat, RAG ingestion, profile updates).

---

## 9. Load Academic Data into pgvector
Sample datasets live under `data/`:
- `neu_professors_stream.jsonl`
- `neu_courses.json`

### Option A: Local files endpoint
```bash
curl -X POST http://localhost:8000/rag/ingest-from-files \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "professors_file": "data/neu_professors_stream.jsonl",
    "courses_file": "data/neu_courses.json"
  }'
```

### Option B: Directory sweep
```bash
curl -X POST http://localhost:8000/rag/ingest-from-directory \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"directory": "data"}'
```

### Option C: Upload JSON via `/rag/professors/upload-json` or `/rag/courses/upload-json`
Use multipart form-data to push curated subsets from the UI or tooling.

After ingestion:
- Verify table counts via `GET /rag/stats`
- Check embeddings in PGAdmin (`SELECT course_code, embedding[1:5] FROM courses LIMIT 5;`)

---

## 10. LangGraph Agent Expectations
- `services/langgraph_agent.py` orchestrates:
  - LLM router (`ChatOpenAI` GPT-4o) deciding professor vs. course vs. multi-tool path
  - Tool nodes hitting DuckDuckGo-backed scrapers plus local pgvector similarity search (`suggest_courses`)
  - Postgres checkpointer storing per-conversation graph state (`langgraph.checkpoint.postgres`)
- Requires a valid `OPENAI_API_KEY` and reachable Postgres URL.
- If you deploy without internet access, replace `ChatOpenAI` + DuckDuckGo utilities with local models or cached content.

---

## 11. Frontend Setup (Vite React App)
```bash
cd frontend
npm install
npm run dev
```
- Development server: `http://localhost:5173`
- The UI expects the backend at `http://localhost:8000`. If you change ports/hosts, update the `API_BASE_URL` constants inside:
  - `frontend/src/pages/LoginPage.tsx`
  - `frontend/src/pages/HomePage.tsx`
  - `frontend/src/pages/UserProfilePage.tsx` and policy pages if needed.

Key UI capabilities:
- Two-step onboarding (identity + academic background) with Fuse.js-powered course search
- JWT stored in `localStorage`, auto-attached to API calls
- Chat workspace with thread list, rename/delete actions, markdown rendering, and fairness/privacy docs accessible from the footer

Build for production:
```bash
npm run build
npm run preview
```

---

## 12. PGAdmin + QA Checklist
Use this table as a reproducibility checklist for grading:

| Task | Command/URL | Expected result |
|------|-------------|-----------------|
| Containers up | `docker compose up -d` | `postgres_team` and `pgadmin_team` running |
| Backend deps | `pip install -r requirements.txt` | No errors, `.venv` created |
| Tables created | `python -c "from db.init_db import init_db; init_db()"` | Tables visible in PGAdmin |
| Extension | `CREATE EXTENSION vector;` | Query returns `CREATE EXTENSION` |
| Backend live | `uvicorn main:app --reload` | `GET /health` returns `{"status":"healthy"}` |
| Token issued | `/auth/register` + `/auth/token` | Valid JWT |
| Data ingested | `/rag/ingest-from-directory` | `GET /rag/stats` shows >0 rows |
| Frontend dev | `npm run dev` | UI at `http://localhost:5173` loads login page |
| Chat flow | Send prompt on `/home` | Assistant responds with sourced answer |

---

## 13. Troubleshooting Tips
- **Database connection errors:** confirm `.env` matches Docker credentials and Postgres is reachable. `psql postgres://teamuser:secretpassword@localhost:5432/teamdb` is a quick sanity check.
- **`pgvector` complaints:** run `CREATE EXTENSION vector;` inside `teamdb`. The first migration needs it.
- **OpenAI quota/auth errors:** ensure `OPENAI_API_KEY` is set before starting uvicorn. Restart backend after any env change.
- **Frontend CORS issues:** the backend allows `*` origins for development; if deployed, set `CORSMiddleware.allow_origins` accordingly.
- **Stale cached course titles:** restart the FastAPI app after re-ingesting courses so `/cleaned_titles` repopulates on startup.
- **PGAdmin cannot connect:** if using Docker Desktop on Windows, try host `host.docker.internal` or ensure the server is added with the service name `db`.

---

## 14. Academic Integrity & Notes
- This README documents every step required to reproduce the system for university grading.
- Cite all third-party data sources within the UI (see `frontend/src/pages/DataSources.tsx`) and respect OpenAI/SerpAPI TOS.
- Logs may contain student inputs; scrub them before sharing beyond the course.

---

## 15. Contacts
For CS 5170 evaluation or handoff questions, reach out to any teammate:
- **Jai Surya Kode** – Backend & LangGraph
- **Lokesh Saipureddi** – Frontend UX, fairness & privacy flows
- **Annamayya Vennelakanti** – Data ingestion & scraping
- **Venkata Krishna Garapati** – Infrastructure, PGAdmin, QA

Good luck replicating, and feel free to iterate on this foundation for future cohorts.
