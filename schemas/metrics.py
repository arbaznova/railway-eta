"""
Accuracy and evaluation metrics schemas.
"""

from typing import Optional
from pydantic import BaseModel


class AccuracyMetricsResponse(BaseModel):
    model_version: str = "mock-residual-v1"
    prediction_source: str = "mock"
    total_completed_sections: int = 0
    baseline_mae: float = 0.0
    dynamic_mae: float = 0.0
    baseline_rmse: float = 0.0
    dynamic_rmse: float = 0.0
    baseline_median_abs_error: float = 0.0
    dynamic_median_abs_error: float = 0.0
    baseline_p90_abs_error: float = 0.0
    dynamic_p90_abs_error: float = 0.0
    improvement_percentage: float = 0.0
    status_note: str = "ML model is under training. Operating with high-fidelity deterministic mock residual engine."
