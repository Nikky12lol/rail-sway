from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.maintenance import MaintenanceStatus


class MaintenanceBase(BaseModel):
    task_id: str = Field(..., examples=["MT-ENG-041"])
    department: str
    section: str
    location: str
    work_type: str
    description: Optional[str] = None
    duration: float = 2.0
    urgency: str = "normal"
    compatibility: Optional[str] = None
    planning_status: Optional[str] = "unplanned"
    block_required: bool = True


class MaintenanceCreate(MaintenanceBase):
    pass


class MaintenanceUpdate(BaseModel):
    department: Optional[str] = None
    section: Optional[str] = None
    location: Optional[str] = None
    work_type: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[float] = None
    urgency: Optional[str] = None
    compatibility: Optional[str] = None
    planning_status: Optional[str] = None
    block_required: Optional[bool] = None
    status: Optional[MaintenanceStatus] = None
    scheduled_window_id: Optional[int] = None


class MaintenanceOut(MaintenanceBase):
    id: int
    status: MaintenanceStatus
    scheduled_window_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True
