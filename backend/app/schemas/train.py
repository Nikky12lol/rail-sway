from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TrainBase(BaseModel):
    train_number: str
    train_name: str
    train_type: str = "passenger"
    priority: int = 3
    section: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    scheduled_time: datetime
    status: str = "on_time"
    delay_minutes: float = 0.0
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class TrainCreate(TrainBase):
    pass


class TrainOut(TrainBase):
    id: int

    class Config:
        from_attributes = True
