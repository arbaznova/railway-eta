"""
Prediction & ETA Pydantic Schemas matching the exact contracts from agent.md.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    geo_distance_km: float = Field(..., description="Physical distance of section in km")
    scheduled_section_minutes: float = Field(..., description="Timetable duration for section in minutes")
    scheduled_hour: int = Field(..., ge=0, le=23, description="Hour of the day 0-23")
    
    current_delay_minutes: float = Field(..., description="Current accumulated train delay")
    previous_section_delay_minutes: float = Field(..., description="Delay added in immediately preceding section")
    rolling_delay_3_sections: float = Field(..., description="Rolling average delay change over last 3 sections")
    
    historical_avg_delay_minutes: float = Field(..., description="Historical average train delay")
    historical_ontime_pct: float = Field(..., description="Train on-time percentage (0-100)")
    route_historical_ontime_pct: float = Field(..., description="Corridor historical on-time percentage")
    
    station_historical_delay_minutes: float = Field(..., description="Historical delay at the target station")
    station_profile_available: int = Field(..., description="1 if exact station profile exists, 0 if fallback")
    
    avg_fog_risk_score: float = Field(..., description="Historical fog risk index (0.0 - 1.0)")
    avg_zone_congestion_index: float = Field(..., description="Historical zone congestion index (0.0 - 1.0)")
    avg_season_severity_score: float = Field(..., description="Seasonal risk index (0.0 - 1.0)")
    avg_psr_count: float = Field(..., description="Historical Permanent Speed Restrictions count")
    
    weather_severity: float = Field(default=0.0, description="Active weather disruption severity (0.0 - 1.0)")
    tsr_severity: float = Field(default=0.0, description="Active Temporary Speed Restriction severity (0.0 - 1.0)")
    congestion_level: float = Field(default=0.0, description="Active track/junction congestion (0.0 - 1.0)")
    trains_ahead: int = Field(default=0, description="Number of active preceding trains in block")
    
    baseline_section_minutes: float = Field(..., description="Calculated deterministic rule baseline traversal minutes")


class PredictionResponse(BaseModel):
    baseline_section_minutes: float
    ml_residual_minutes: float
    predicted_section_minutes: float
    prediction_source: str = "mock" # "ml", "mock", or "baseline"
    model_version: str = "mock-residual-v1"
    p10: Optional[float] = None
    p50: Optional[float] = None
    p90: Optional[float] = None
    explanation_factors: Optional[Dict[str, float]] = None


class StationETAResponse(BaseModel):
    station_code: str
    station_name: str
    scheduled_arrival: Optional[str] = None
    scheduled_departure: Optional[str] = None
    baseline_eta: Optional[str] = None
    dynamic_eta: Optional[str] = None
    predicted_delay_minutes: float = 0.0
    p10_eta: Optional[str] = None
    p50_eta: Optional[str] = None
    p90_eta: Optional[str] = None
    is_completed: bool = False


class TrainETAResponse(BaseModel):
    train_number: str
    train_name: str
    current_section_id: Optional[str] = None
    current_delay_minutes: float = 0.0
    speed_kmh: float = 80.0
    prediction_source: str = "mock"
    model_version: str = "mock-residual-v1"
    upcoming_stations: List[StationETAResponse] = []
    explanation_summary: List[str] = []
    last_updated: Optional[datetime] = None
