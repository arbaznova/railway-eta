"""
Network and Station Arrival Schemas.
"""

from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from .events import OperationalEventResponse


class SectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    section_id: str
    from_station: str
    to_station: str
    geo_distance_km: float
    scheduled_section_minutes: float
    route_context: str
    active_events: List[OperationalEventResponse] = []


class ExpectedArrivalItem(BaseModel):
    train_number: str
    train_name: str
    train_type: str
    origin: str
    destination: str
    scheduled_arrival: Optional[str] = None
    predicted_arrival: Optional[str] = None
    predicted_delay_minutes: float = 0.0
    current_delay_minutes: float = 0.0
    current_status: str = "RUNNING"
    prediction_source: str = "mock"


class StationArrivalsResponse(BaseModel):
    station_code: str
    station_name: str
    state: str
    zone: str
    expected_arrivals: List[ExpectedArrivalItem] = []
