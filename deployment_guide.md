# Deployment Guide (Railway + Vercel)

This guide provides step-by-step instructions for deploying the Agentic RAG system across Railway (Backend) and Vercel (Frontend). 

Since this system is **stateful** (it persists ChromaDB vectors and BM25s lexical indexes to the hard drive), it requires specific Volume mounting on the backend to ensure data isn't lost during deployments.

---

## Part 1: Deploying the Backend (Railway)

We use Railway for the backend because it natively supports Dockerfiles, easily handles system-level dependencies (like Tesseract OCR), and provides attachable persistent volumes.

### 1. Preparation
1. Ensure your code is pushed to a GitHub repository.
2. Log into [Railway.app](https://railway.app/).

### 2. Create the Service
1. Click **"New Project"** -> **"Deploy from GitHub repo"**.
2. Select your repository.
3. *Important:* If your backend is in a subfolder (e.g., `rag_system/backend`), you need to tell Railway to build from that specific directory.
   - Go to your service **Settings** -> **Build** -> **Root Directory** and set it to `/backend`.
4. Ensure the **Buildpack** is set to `Dockerfile`.

### 3. Add Persistent Storage (CRITICAL)
If you skip this step, all uploaded documents will be deleted every time your server restarts.
1. Go to your service **Volumes** tab.
2. Click **"Add Volume"**.
3. Set the **Mount Path** EXACTLY to: `/app/backend/data`
   - *Note: Our Dockerfile defines `ENV CHROMA_PATH="/app/backend/data/chroma"`, so this mount path ensures the app writes the databases directly to the persistent disk.*

### 4. Configure Environment Variables
1. Go to the **Variables** tab.
2. Add the following variable:
   - `GEMINI_API_KEY` = `your_actual_api_key_here`

### 5. Generate Public Domain
1. Go to the **Settings** tab.
2. Under "Networking", click **"Generate Domain"**.
3. **Copy this URL.** You will need it for the frontend deployment. (e.g., `https://rag-backend-production.up.railway.app`)

---

## Part 2: Deploying the Frontend (Vercel)

We use Vercel for the frontend because it provides world-class global CDNs, instant invalidation, and zero-config React/Vite deployments.

### 1. Create the Project
1. Log into [Vercel](https://vercel.com/).
2. Click **"Add New..."** -> **"Project"**.
3. Import your GitHub repository.

### 2. Configure Build Settings
1. In the "Configure Project" screen, look for **"Root Directory"**.
2. Click "Edit" and select the `frontend/` folder.
3. The "Framework Preset" should automatically detect **Vite**. Leave the build command as `npm run build` and output directory as `dist`.

### 3. Configure Environment Variables
1. Expand the **Environment Variables** section.
2. Add the following variable:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://your-railway-backend-url.up.railway.app` *(Paste the URL you copied from Railway in Step 5)*

### 4. Deploy
1. Click **Deploy**.
2. Wait 1-2 minutes for Vercel to build and publish the frontend.

---

## Part 3: Security Hardening (Post-Deployment)

By default, the backend's `CORSMiddleware` (in `app/main.py`) allows all origins (`allow_origins=["*"]`). Once your Vercel frontend is live, you should lock this down for production security.

1. Copy your new Vercel domain (e.g., `https://my-rag-app.vercel.app`).
2. Go to `backend/app/main.py`.
3. Update the CORS middleware:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://my-rag-app.vercel.app"], # Replace with your actual Vercel URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
4. Commit and push the code to GitHub. Railway will automatically redeploy the backend with the tightened security.

---

## Troubleshooting

- **The UI says "Thinking..." but never generates an answer:**
  Check your Railway logs. Ensure that your `GEMINI_API_KEY` is valid and hasn't exhausted its quota.
- **Documents disappear after a few days:**
  You likely missed "Part 1, Step 3". Verify in Railway that the Volume is attached and mounted strictly to `/app/backend/data`.
- **Uploads fail instantly:**
  Check the Vercel console network tab. If it's a CORS error, verify `VITE_API_URL` doesn't have a trailing slash (e.g., `https://api.domain.com` NOT `https://api.domain.com/`).
