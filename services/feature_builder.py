"""
Runtime Feature Builder.

Combines:
- Static section topology and risk indicators
- Train historical punctuality profiles
- Station historical delay profiles
- Live delay dynamics (current, previous section, rolling 3-sections)
- Active operational disruptions (weather, TSR, congestion)
- Preceding train counts in block
- Calculated deterministic baseline
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from models.database import (
    RouteSection, SectionFeature, TrainHistorical, StationHistorical,
    TrainState, OperationalEvent
)
from services.baseline import calculate_baseline_section_time


def build_section_features(
    db: Session,
    train_number: str,
    section_id: str,
    target_station_code: Optional[str] = None,
    current_delay_override: Optional[float] = None
) -> Dict[str, Any]:
    """
    Constructs the exact 20-feature vector required by the ML prediction contract.
    """
    # 1. Static Section & Topology Features
    sec = db.query(RouteSection).filter_by(section_id=section_id).first()
    sec_feat = db.query(SectionFeature).filter_by(section_id=section_id).first()

    geo_distance_km = sec.geo_distance_km if sec else 50.0
    scheduled_section_minutes = sec.scheduled_section_minutes if sec else 40.0
    
    avg_fog_risk = sec_feat.avg_fog_risk_score if sec_feat else 0.1
    avg_congestion = sec_feat.avg_zone_congestion_index if sec_feat else 0.4
    avg_season = sec_feat.avg_season_severity_score if sec_feat else 0.3
    avg_psr = sec_feat.avg_psr_count if sec_feat else 1.0

    # 2. Train Live Delay State
    state = db.query(TrainState).filter_by(train_number=train_number).first()
    current_delay = current_delay_override if current_delay_override is not None else (state.current_delay_minutes if state else 0.0)
    prev_delay = state.previous_section_delay_minutes if state else 0.0
    rolling_delay = state.rolling_delay_3_sections if state else 0.0

    # 3. Train Historical Profile
    t_hist = db.query(TrainHistorical).filter_by(train_number=train_number).first()
    hist_avg_delay = t_hist.historical_avg_delay_minutes if t_hist else 15.0
    hist_ontime_pct = t_hist.historical_ontime_pct if t_hist else 80.0
    route_ontime_pct = t_hist.route_historical_ontime_pct if t_hist else 78.0

    # 4. Station Historical Profile
    st_code = target_station_code or (sec.to_station if sec else "NDLS")
    st_hist = db.query(StationHistorical).filter_by(station_code=st_code).first()
    station_hist_delay = st_hist.station_historical_delay_minutes if st_hist else 10.0
    station_profile_avail = st_hist.station_profile_available if st_hist else 1

    # 5. Operational Events on this section
    active_events = db.query(OperationalEvent).filter(
        OperationalEvent.section_id == section_id,
        OperationalEvent.status == "ACTIVE"
    ).all()

    weather_sev = 0.0
    tsr_sev = 0.0
    cong_level = 0.0

    for ev in active_events:
        if ev.event_type == "WEATHER":
            weather_sev = max(weather_sev, ev.severity)
        elif ev.event_type == "TSR":
            tsr_sev = max(tsr_sev, ev.severity)
        elif ev.event_type == "CONGESTION":
            cong_level = max(cong_level, ev.severity)

    # 6. Trains Ahead (active trains sharing this section or ahead on same corridor)
    trains_ahead_count = db.query(TrainState).filter(
        TrainState.train_number != train_number,
        TrainState.current_section_id == section_id,
        TrainState.status == "RUNNING"
    ).count()

    # 7. Scheduled Hour
    current_hour = datetime.now(timezone.utc).hour

    # 8. Deterministic Baseline Traversal Minutes
    baseline_min, _ = calculate_baseline_section_time(
        scheduled_section_minutes=scheduled_section_minutes,
        weather_severity=weather_sev,
        tsr_severity=tsr_sev,
        congestion_level=cong_level,
        trains_ahead=trains_ahead_count,
        current_delay_minutes=current_delay
    )

    features = {
        "geo_distance_km": round(geo_distance_km, 2),
        "scheduled_section_minutes": round(scheduled_section_minutes, 2),
        "scheduled_hour": current_hour,
        "current_delay_minutes": round(current_delay, 2),
        "previous_section_delay_minutes": round(prev_delay, 2),
        "rolling_delay_3_sections": round(rolling_delay, 2),
        "historical_avg_delay_minutes": round(hist_avg_delay, 2),
        "historical_ontime_pct": round(hist_ontime_pct, 2),
        "route_historical_ontime_pct": round(route_ontime_pct, 2),
        "station_historical_delay_minutes": round(station_hist_delay, 2),
        "station_profile_available": int(station_profile_avail),
        "avg_fog_risk_score": round(avg_fog_risk, 2),
        "avg_zone_congestion_index": round(avg_congestion, 2),
        "avg_season_severity_score": round(avg_season, 2),
        "avg_psr_count": round(avg_psr, 2),
        "weather_severity": round(weather_sev, 2),
        "tsr_severity": round(tsr_sev, 2),
        "congestion_level": round(cong_level, 2),
        "trains_ahead": int(trains_ahead_count),
        "baseline_section_minutes": round(baseline_min, 2)
    }

    return features
