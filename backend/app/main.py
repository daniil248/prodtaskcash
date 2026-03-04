from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, tasks, profile, bonuses, withdrawals, admin

app = FastAPI(title="TaskCash API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(bonuses.router, prefix="/api")
app.include_router(withdrawals.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
