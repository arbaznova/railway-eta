"""
Station-by-Station ETA Propagation Engine.

Implements:
1. Continuous station-by-station ETA forecasting across remaining route sections.
2. Continuous re-anchoring to current train position and elapsed time.
3. Baseline vs Dynamic ETA calculation.
4. Uncertainty bounds propagation (P10/P50/P90).
5. Generation of human-readable explanation factors for operations.
"""

from typing import List, Tuple
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from models.database import (
    Train, TrainState, TrainSchedule, Station, RouteSection, PredictionRecord
)
from schemas.eta import StationETAResponse, TrainETAResponse
from services.feature_builder import build_section_features
from services.predictor import get_predictor


def format_time_delta(base_time: datetime, added_minutes: float) -> str:
    """Helper to add minutes to datetime and format as HH:MM."""
    dt = base_time + timedelta(minutes=added_minutes)
    return dt.strftime("%H:%M")


def propagate_train_eta(
    db: Session,
    train_number: str,
    persist_snapshot: bool = False
) -> TrainETAResponse:
    """
    Computes station-by-station baseline and dynamic ETAs for a train.
    """
    train = db.query(Train).filter_by(train_number=train_number).first()
    state = db.query(TrainState).filter_by(train_number=train_number).first()

    if not train or not state:
        raise ValueError(f"Train {train_number} not found or state uninitialized")

    schedules = db.query(TrainSchedule).filter_by(train_number=train_number).order_by(TrainSchedule.station_sequence).all()
    stations_dict = {s.station_code: s.station_name for s in db.query(Station).all()}

    predictor = get_predictor()

    now_utc = datetime.now(timezone.utc)
    base_anchor_time = now_utc

    upcoming_stations: List[StationETAResponse] = []
    explanation_summary: List[str] = []

    # Identify current sequence index in schedule
    curr_seq = 1
    for s in schedules:
        if s.station_code == state.current_station_code:
            curr_seq = s.station_sequence
            break

    accumulated_baseline_min = 0.0
    accumulated_dynamic_min = 0.0
    accumulated_p10_min = 0.0
    accumulated_p90_min = 0.0

    prediction_source = "mock"
    model_version = "mock-residual-v1"

    for i in range(len(schedules)):
        sched = schedules[i]
        st_code = sched.station_code
        st_name = stations_dict.get(st_code, st_code)

        if sched.station_sequence <= curr_seq:
            # Already completed station
            upcoming_stations.append(StationETAResponse(
                station_code=st_code,
                station_name=st_name,
                scheduled_arrival=sched.scheduled_arrival,
                scheduled_departure=sched.scheduled_departure,
                baseline_eta=sched.scheduled_arrival,
                dynamic_eta=sched.scheduled_arrival,
                predicted_delay_minutes=0.0,
                is_completed=True
            ))
            continue

        # Station sequence > curr_seq (Upcoming stations)
        prev_sched = schedules[i - 1]
        from_st = prev_sched.station_code
        to_st = sched.station_code
        sec_id = f"{from_st}_{to_st}"

        features = build_section_features(db, train_number, sec_id, to_st)
        pred = predictor.predict_section(features)
        prediction_source = pred.prediction_source
        model_version = pred.model_version

        # Fraction of section remaining (if this is the immediate next station, use 1.0 - progress_ratio)
        if st_code == state.next_station_code:
            frac = max(0.05, 1.0 - state.progress_ratio)
            # Check explanation triggers for active section
            if features.get("tsr_severity", 0) > 0.3:
                explanation_summary.append(f"TSR active on {sec_id} adding +{round(features['tsr_severity']*14, 1)}m")
            if features.get("weather_severity", 0) > 0.3:
                explanation_summary.append(f"Adverse weather on {sec_id} adding +{round(features['weather_severity']*8, 1)}m")
            if features.get("congestion_level", 0) > 0.3:
                explanation_summary.append(f"Track congestion on {sec_id} adding +{round(features['congestion_level']*10, 1)}m")
        else:
            frac = 1.0
            if features.get("tsr_severity", 0) > 0.3:
                explanation_summary.append(f"Downstream TSR restriction on {sec_id}")

        sec_base = pred.baseline_section_minutes * frac
        sec_dyn = pred.predicted_section_minutes * frac
        sec_p10 = (pred.p10 or pred.predicted_section_minutes) * frac
        sec_p90 = (pred.p90 or pred.predicted_section_minutes) * frac

        accumulated_baseline_min += sec_base
        accumulated_dynamic_min += sec_dyn
        accumulated_p10_min += sec_p10
        accumulated_p90_min += sec_p90

        # Calculate arrival ETAs
        base_eta = format_time_delta(base_anchor_time, accumulated_baseline_min)
        dyn_eta = format_time_delta(base_anchor_time, accumulated_dynamic_min)
        p10_eta = format_time_delta(base_anchor_time, accumulated_p10_min)
        p90_eta = format_time_delta(base_anchor_time, accumulated_p90_min)

        # Predicted delay = current accumulated delay + any operational delay added across upcoming sections
        delay_added = max(0.0, (pred.predicted_section_minutes - pred.baseline_section_minutes) + (pred.baseline_section_minutes - features.get("scheduled_section_minutes", pred.baseline_section_minutes)))
        pred_delay = round(state.current_delay_minutes + delay_added, 1)

        upcoming_stations.append(StationETAResponse(
            station_code=to_st,
            station_name=st_name,
            scheduled_arrival=sched.scheduled_arrival,
            scheduled_departure=sched.scheduled_departure,
            baseline_eta=base_eta,
            dynamic_eta=dyn_eta,
            predicted_delay_minutes=max(0.0, pred_delay),
            p10_eta=p10_eta,
            p50_eta=dyn_eta,
            p90_eta=p90_eta,
            is_completed=False
        ))


        # Persist prediction snapshot if requested
        if persist_snapshot:
            db.add(PredictionRecord(
                prediction_timestamp=now_utc,
                train_number=train_number,
                section_id=sec_id,
                station_code=to_st,
                scheduled_section_minutes=pred.baseline_section_minutes,
                baseline_minutes=pred.baseline_section_minutes,
                residual_minutes=pred.ml_residual_minutes,
                predicted_section_minutes=pred.predicted_section_minutes,
                p10=pred.p10,
                p50=pred.p50,
                p90=pred.p90,
                model_version=model_version,
                prediction_source=prediction_source,
                explanation_factors=str(pred.explanation_factors)
            ))

    if persist_snapshot:
        db.commit()

    if not explanation_summary:
        if state.current_delay_minutes > 10.0:
            explanation_summary.append(f"Accumulated delay from earlier sections (+{round(state.current_delay_minutes, 1)}m)")
        else:
            explanation_summary.append("Normal route conditions with minimal delay variance")

    return TrainETAResponse(
        train_number=train.train_number,
        train_name=train.train_name,
        current_section_id=state.current_section_id,
        current_delay_minutes=state.current_delay_minutes,
        speed_kmh=state.speed_kmh,
        prediction_source=prediction_source,
        model_version=model_version,
        upcoming_stations=upcoming_stations,
        explanation_summary=explanation_summary,
        last_updated=state.last_updated
    )
