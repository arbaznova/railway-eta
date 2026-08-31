"""
Station expected arrivals endpoint.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models.database import get_db, Station, Train, TrainSchedule, TrainState
from schemas.network import StationArrivalsResponse, ExpectedArrivalItem
from services.propagation import propagate_train_eta

router = APIRouter(prefix="/api/v1/station", tags=["Stations"])


@router.get("/{station_id}/expected-arrivals", response_model=StationArrivalsResponse)
def get_station_expected_arrivals(station_id: str, db: Session = Depends(get_db)):
    """
    Returns upcoming trains expected to arrive at a specified station with dynamic ETA forecasts.
    """
    station = db.query(Station).filter_by(station_code=station_id.upper()).first()
    if not station:
        raise HTTPException(status_code=404, detail=f"Station {station_id} not found")

    # Find trains that have this station in their schedule
    schedules = db.query(TrainSchedule).filter_by(station_code=station.station_code).all()
    train_arrivals = []

    for sched in schedules:
        t_num = sched.train_number
        train = db.query(Train).filter_by(train_number=t_num).first()
        state = db.query(TrainState).filter_by(train_number=t_num).first()

        if not train or not state:
            continue

        # Get propagation ETA
        try:
            eta_resp = propagate_train_eta(db, t_num)
            # Find entry for this station
            matching_stop = next((s for s in eta_resp.upcoming_stations if s.station_code == station.station_code), None)
            
            if matching_stop and not matching_stop.is_completed:
                train_arrivals.append(ExpectedArrivalItem(
                    train_number=train.train_number,
                    train_name=train.train_name,
                    train_type=train.train_type,
                    origin=train.origin,
                    destination=train.destination,
                    scheduled_arrival=sched.scheduled_arrival,
                    predicted_arrival=matching_stop.dynamic_eta,
                    predicted_delay_minutes=matching_stop.predicted_delay_minutes,
                    current_delay_minutes=state.current_delay_minutes,
                    current_status=state.status,
                    prediction_source=eta_resp.prediction_source
                ))
        except Exception:
            continue

    return StationArrivalsResponse(
        station_code=station.station_code,
        station_name=station.station_name,
        state=station.state,
        zone=station.zone,
        expected_arrivals=train_arrivals
    )
