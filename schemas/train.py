"""
Train Pydantic Schemas.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class TrainSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    train_number: str
    train_name: str
    train_type: str
    zone: str
    origin: str
    destination: str
    current_station_code: str
    next_station_code: Optional[str] = None
    current_section_id: Optional[str] = None
    progress_ratio: float = 0.0
    position_km: float = 0.0
    current_delay_minutes: float = 0.0
    speed_kmh: float = 80.0
    status: str = "RUNNING"
    last_updated: Optional[datetime] = None


class ScheduleStop(BaseModel):
    station_code: str
    station_name: str
    station_sequence: int
    scheduled_arrival: Optional[str] = None
    scheduled_departure: Optional[str] = None
    day_number: int = 1


class TrainDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    train_number: str
    train_name: str
    train_type: str
    zone: str
    origin: str
    destination: str
    route_corridor: str
    current_state: TrainSummary
    stops: List[ScheduleStop] = []
