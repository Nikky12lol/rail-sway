"""Adapter for Indian Railways live-data APIs with deterministic mock fallback.

In production set IR_API_BASE_URL + IR_API_KEY. When unavailable, returns
realistic mock schedules for the Bhadrak–Jajpur–Keonjhar Road corridor so
the UI and AI engine remain fully demoable offline.
"""
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional
import logging
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

MOCK_STATIONS = [
    {"code": "BHC", "name": "Bhadrak", "lat": 21.054, "lng": 86.515},
    {"code": "JJKR", "name": "Jajpur Keonjhar Road", "lat": 20.945, "lng": 86.13},
    {"code": "KDJR", "name": "Kendujhargarh", "lat": 21.63, "lng": 85.58},
]

MOCK_TRAINS = [
    ("12819", "Odisha Sampark Kranti", "express", 1, "BHC", "NDLS"),
    ("12820", "Odisha Sampark Kranti Dn", "express", 1, "NDLS", "BHC"),
    ("22811", "Bhubaneswar Rajdhani", "express", 1, "BBS", "NDLS"),
    ("12245", "Howrah Duronto", "express", 1, "HWH", "NDLS"),
    ("17016", "Visakha Express", "passenger", 3, "BBS", "SC"),
    ("18448", "Hirakhand Express", "express", 2, "BBS", "JDB"),
    ("18047", "Amaravati Express", "passenger", 3, "HWH", "VSG"),
    ("22823", "Bhubaneswar Rajdhani", "express", 2, "BBS", "NDLS"),
    ("58131", "Bhadrak–Jajpur MEMU", "memu", 4, "BHC", "JJKR"),
    ("58132", "Jajpur–Bhadrak MEMU", "memu", 4, "JJKR", "BHC"),
    ("58534", "Palasa–Cuttack Passenger", "passenger", 4, "PSA", "CTC"),
    ("58535", "Cuttack–Palasa Passenger", "passenger", 4, "CTC", "PSA"),
    ("BOXN-F01", "Coal Freight Up", "freight", 5, "JJKR", "BHC"),
    ("BOXN-F02", "Iron Ore Freight Dn", "freight", 5, "BHC", "JJKR"),
    ("12875", "Neelachal Express", "express", 2, "PURI", "ANVT"),
    ("12876", "Neelachal Express Dn", "express", 2, "ANVT", "PURI"),
]


def mock_schedule_for_section(section: str, day: date) -> List[Dict[str, Any]]:
    trains: List[Dict[str, Any]] = []
    base = datetime(day.year, day.month, day.day, 6, 0, 0)
    for i, (num, name, ttype, prio, org, dst) in enumerate(MOCK_TRAINS):
        # spread across 06:00 – 22:00
        scheduled = base + timedelta(minutes=(i * 63) % 960)
        # corridor lat/lng interpolation for map display
        frac = (i % 8) / 8.0
        lat = 21.054 - frac * 0.5
        lng = 86.515 - frac * 0.4
        trains.append(
            {
                "id": i + 1,
                "train_number": num,
                "train_name": name,
                "train_type": ttype,
                "priority": prio,
                "section": section,
                "origin": org,
                "destination": dst,
                "scheduled_time": scheduled,
                "status": "delayed" if i % 4 == 0 else "on_time",
                "delay_minutes": 12.0 if i % 4 == 0 else 0.0,
                "latitude": lat,
                "longitude": lng,
            }
        )
    return trains


class IRIntegration:
    def __init__(self, base_url: str = "", api_key: str = ""):
        self.base_url = base_url or settings.IR_API_BASE_URL
        self.api_key = api_key or settings.IR_API_KEY

    async def fetch_trains(self, section: str, day: date) -> List[Dict[str, Any]]:
        if not self.base_url:
            return mock_schedule_for_section(section, day)
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    f"{self.base_url}/trains",
                    params={"section": section, "date": day.isoformat()},
                    headers={"Authorization": f"Bearer {self.api_key}"} if self.api_key else {},
                )
                r.raise_for_status()
                data = r.json()
                if isinstance(data, list) and data:
                    return data
        except Exception as e:
            logger.warning("IR API failed, falling back to mock: %s", e)
        return mock_schedule_for_section(section, day)

    def fetch_trains_sync(self, section: str, day: date) -> List[Dict[str, Any]]:
        return mock_schedule_for_section(section, day)
