"""
ETA prediction and station-by-station propagation routes.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models.database import get_db
from schemas.eta import TrainETAResponse, PredictionRequest, PredictionResponse
from services.propagation import propagate_train_eta
from services.predictor import get_predictor

router = APIRouter(prefix="/api/v1/eta", tags=["ETA"])


@router.get("/{train_id}", response_model=TrainETAResponse)
def get_train_eta(train_id: str, db: Session = Depends(get_db)):
    """
    Returns station-by-station baseline vs dynamic ETA predictions,
    delay estimates, uncertainty bounds (P10/P50/P90), and explanation factors.
    """
    try:
        response = propagate_train_eta(db, train_number=train_id, persist_snapshot=False)
        return response
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error computing ETA: {str(e)}")


@router.post("/predict-section", response_model=PredictionResponse)
def predict_raw_section(request: PredictionRequest):
    """
    Direct section prediction endpoint conforming to the ML contract from agent.md.
    Evaluates baseline, residual, and uncertainty bounds.
    """
    predictor = get_predictor()
    features = request.model_dump()
    return predictor.predict_section(features)
