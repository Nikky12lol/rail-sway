from sqlalchemy import Column, Integer, String, DateTime, Date, Float, Boolean, Text, Enum
from app.core.database import Base
import enum
from datetime import datetime


class MaintenanceStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SCHEDULED = "scheduled"
    COMPLETED = "completed"


class MaintenanceRequest(Base):
    __tablename__ = "maintenance_requests"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String(50), unique=True, nullable=False, index=True)
    department = Column(String(50), nullable=False, index=True)  # ENG, SNT, TRD, etc.
    section = Column(String(100), nullable=False, index=True)
    location = Column(String(200), nullable=False)
    work_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    duration = Column(Float, nullable=False, default=2.0)  # hours
    urgency = Column(String(20), nullable=False, default="normal")  # low|normal|high|critical
    requested_date = Column(Date, nullable=True)  # planned operating date (defaults to created date)
    compatibility = Column(Text, nullable=True)
    planning_status = Column(String(50), nullable=True, default="unplanned")
    block_required = Column(Boolean, default=True)
    status = Column(Enum(MaintenanceStatus), default=MaintenanceStatus.PENDING, index=True)
    requested_by = Column(Integer, nullable=True)
    scheduled_window_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
