from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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

# Mount static files and serve the frontend
app.mount("/static", StaticFiles(directory="client"), name="static")

# Serve index.html at the root
@app.get("/")
async def serve_frontend():
    return FileResponse('client/index.html')

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
