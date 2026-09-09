from datetime import datetime

VALID_DEPARTMENTS = {"ENG", "SNT", "TRD", "MECH", "ELEC", "OPTG"}
VALID_URGENCY = {"low", "normal", "high", "critical"}
VALID_WORK_TYPES = {
    "track_renewal", "ballast_cleaning", "overhead_maintenance",
    "signal_upgrade", "bridge_inspection", "tamping", "welding",
    "inspection", "ohe_maintenance", "point_maintenance",
}


def validate_section(section: str) -> str:
    s = (section or "").strip()
    if not s:
        raise ValueError("section must be non-empty")
    return s


def validate_window(start: datetime, end: datetime) -> None:
    if end <= start:
        raise ValueError("end_time must be after start_time")
    hours = (end - start).total_seconds() / 3600
    if hours > 12:
        raise ValueError("block window cannot exceed 12 hours")
