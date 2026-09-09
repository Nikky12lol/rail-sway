from sqlalchemy import Column, Integer, String, DateTime, Float
from app.core.database import Base


class Train(Base):
    __tablename__ = "trains"

    id = Column(Integer, primary_key=True, index=True)
    train_number = Column(String(20), unique=True, nullable=False, index=True)
    train_name = Column(String(200), nullable=False)
    train_type = Column(String(30), default="passenger")  # passenger|express|freight|vande_bharat|memu
    priority = Column(Integer, default=3)  # 1 = highest (Rajdhani/Shatabdi), 5 = lowest (freight)
    section = Column(String(100), index=True)
    origin = Column(String(100), nullable=True)
    destination = Column(String(100), nullable=True)
    scheduled_time = Column(DateTime, nullable=False, index=True)
    status = Column(String(20), default="on_time")  # on_time|delayed|cancelled|running
    delay_minutes = Column(Float, default=0.0)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
