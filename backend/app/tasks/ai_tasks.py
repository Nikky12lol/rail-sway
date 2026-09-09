import os
from celery import Celery

celery_app = Celery(
    "railsway",
    broker=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
)
celery_app.conf.update(task_track_started=True, timezone="Asia/Kolkata")


@celery_app.task(name="ai.compute_windows")
def compute_windows_task(section: str, date_iso: str, task_ids: list):
    """Heavy window computation offloaded to worker."""
    from datetime import datetime
    from app.core.database import SessionLocal
    from app.services.ai_service import RailSwayAI
    from app.services.maintenance_service import MaintenanceService
    from app.services.train_service import TrainService
    import asyncio

    db = SessionLocal()
    try:
        day = datetime.fromisoformat(date_iso)
        reqs = MaintenanceService().get_by_task_ids(db, task_ids)
        req_dicts = [
            {"task_id": r.task_id, "department": r.department, "section": r.section,
             "work_type": r.work_type, "duration": r.duration, "urgency": r.urgency}
            for r in reqs
        ]
        trains = asyncio.run(TrainService().get_for_section(db, section, day))
        ai = RailSwayAI()
        windows = ai.find_optimal_windows(req_dicts, trains, day)
        rec = ai.generate_recommendation(windows)
        return {"windows": windows, "recommendation": rec}
    finally:
        db.close()
