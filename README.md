# Sudoku Web App

Browser Sudoku with a Python/FastAPI backend.

## Local development

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
API: `http://localhost:8000`; docs at `/docs`.

### Frontend
Serve `frontend/` with any static server, e.g.:
```bash
cd frontend
python -m http.server 8080
```
Open `http://localhost:8080`. The default API URL is `http://localhost:8000`.

## Deploy

1. Push this repository to GitHub.
2. In GitHub, enable Pages: **Settings → Pages → GitHub Actions**. The included workflow publishes `frontend/`.
3. Deploy the Python API on Render using the included `render.yaml` (New Blueprint → connect repository). Copy the deployed API URL.
4. In `frontend/app.js`, replace `API_BASE` with your Render service URL and push the change. The Pages workflow redeploys the frontend.

The backend uses in-memory game sessions. For a small personal app this is fine; sessions reset whenever the service restarts. Add persistent storage if you need durable sessions or high traffic.
