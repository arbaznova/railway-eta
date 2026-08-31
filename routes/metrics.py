"""
Accuracy and evaluation metrics routes.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from models.database import get_db
from schemas.metrics import AccuracyMetricsResponse
from services.metrics import calculate_accuracy_metrics

router = APIRouter(prefix="/api/v1/metrics", tags=["Metrics"])


@router.get("/accuracy", response_model=AccuracyMetricsResponse)
def get_accuracy_metrics(db: Session = Depends(get_db)):
    """
    Returns comparative evaluation metrics comparing:
    Rule-Based Baseline vs Dynamic ML Residual Model against observed ground truth actuals.
    """
    return calculate_accuracy_metrics(db)
