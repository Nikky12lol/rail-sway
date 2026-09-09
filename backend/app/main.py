from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
import app.models  # noqa: F401  (register all models)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    Base.metadata.create_all(bind=engine)
    # Seed demo data on first run
    try:
        db = SessionLocal()
        from app.services.maintenance_service import MaintenanceService
        from app.services.train_service import TrainService

        MaintenanceService().seed_if_empty(db)
        TrainService().seed_if_empty(db)
        db.close()
    except Exception as e:
        print(f"Seed skipped: {e}")
    yield


def create_app() -> FastAPI:
    from app.api.v1 import auth, maintenance, trains, blocks, ai, decisions

    app = FastAPI(title="Rail-Sway API", version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
    app.include_router(maintenance.router, prefix="/api/v1/maintenance", tags=["maintenance"])
    app.include_router(trains.router, prefix="/api/v1/trains", tags=["trains"])
    app.include_router(blocks.router, prefix="/api/v1/blocks", tags=["blocks"])
    app.include_router(ai.router, prefix="/api/v1/ai", tags=["ai"])
    app.include_router(decisions.router, prefix="/api/v1/decisions", tags=["decisions"])

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    @app.get("/")
    async def root():
        return {"service": "Rail-Sway API", "version": "1.0.0", "docs": "/docs"}

    return app


app = create_app()
