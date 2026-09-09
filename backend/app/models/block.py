from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text
from app.core.database import Base
from datetime import datetime


class BlockWindow(Base):
    __tablename__ = "block_windows"

    id = Column(Integer, primary_key=True, index=True)
    section = Column(String(100), nullable=False, index=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    maintenance_ids = Column(Text, nullable=True)  # comma-separated task_ids
    impact_score = Column(Float, default=0.0)
    affected_trains = Column(Integer, default=0)
    priority_trains_affected = Column(Integer, default=0)
    conflicts = Column(Integer, default=0)
    tsr_required = Column(Boolean, default=False)
    estimated_delay = Column(Float, default=0.0)  # total minutes
    status = Column(String(20), default="candidate")  # candidate|recommended|approved|rejected|scheduled
    recommendation_reason = Column(Text, nullable=True)
    controller_decision = Column(String(20), nullable=True)
    approved_by = Column(Integer, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
