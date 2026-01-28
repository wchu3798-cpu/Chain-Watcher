from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
import uvicorn
import os

app = FastAPI()

# API endpoints
@app.get("/api/")
def read_root():
    return {"message": "Hello from Chain-Watcher!"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

# Mount the entire client directory to serve all static files
# This needs to be at the end, after API routes
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # Try to serve the requested file from client directory
    file_path = Path("client") / full_path
    if file_path.is_file():
        return FileResponse(file_path)
    # If file doesn't exist, serve index.html (SPA fallback)
    return FileResponse('client/index.html')

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)