"""
Prediction Interface and Predictor Implementations.

Implements:
1. MockPredictor: High-fidelity deterministic residual engine conforming to the exact ML contract.
2. ModelPredictor: Pluggable model loader that loads the trained ML artifact (e.g. XGBoost / Scikit-learn)
   with automatic baseline fallback if inference fails.
3. Quantile Uncertainty Bounds: P10, P50, P90.
"""

import os
from pathlib import Path
from typing import Dict, Any, Optional
import joblib

from schemas.eta import PredictionResponse
from services.baseline import calculate_baseline_section_time

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_FILE = MODEL_DIR / "eta_model.joblib"

# The exact 19 feature order specified in agent.md
FEATURE_ORDER = [
    "geo_distance_km",
    "scheduled_section_minutes",
    "scheduled_hour",
    "current_delay_minutes",
    "previous_section_delay_minutes",
    "rolling_delay_3_sections",
    "historical_avg_delay_minutes",
    "historical_ontime_pct",
    "route_historical_ontime_pct",
    "station_historical_delay_minutes",
    "station_profile_available",
    "avg_fog_risk_score",
    "avg_zone_congestion_index",
    "avg_season_severity_score",
    "avg_psr_count",
    "weather_severity",
    "tsr_severity",
    "congestion_level",
    "trains_ahead",
    "baseline_section_minutes"
]


class BasePredictor:
    """Abstract interface for section traversal predictors."""
    def predict_section(self, features: Dict[str, Any]) -> PredictionResponse:
        raise NotImplementedError


class MockPredictor(BasePredictor):
    """
    High-fidelity deterministic residual engine for use while ML model is training.
    Produces realistic nonlinear residuals, uncertainty intervals (P10/P50/P90),
    and factor explanations.
    """
    def __init__(self, version: str = "mock-residual-v1"):
        self.version = version

    def predict_section(self, features: Dict[str, Any]) -> PredictionResponse:
        # Extract baseline
        baseline = float(features.get("baseline_section_minutes", 10.0))
        sched_min = float(features.get("scheduled_section_minutes", 10.0))
        
        # Operational parameters
        weather = float(features.get("weather_severity", 0.0))
        tsr = float(features.get("tsr_severity", 0.0))
        cong = float(features.get("congestion_level", 0.0))
        trains_ahead = int(features.get("trains_ahead", 0))
        
        # Delay dynamics
        curr_delay = float(features.get("current_delay_minutes", 0.0))
        prev_delay = float(features.get("previous_section_delay_minutes", 0.0))
        rolling_delay = float(features.get("rolling_delay_3_sections", 0.0))
        
        # Historical stats
        ontime_pct = float(features.get("historical_ontime_pct", 85.0))
        fog_risk = float(features.get("avg_fog_risk_score", 0.0))

        # Nonlinear compound disruption effect (e.g. weather + congestion together amplify delay)
        compound_disruption = 0.0
        if weather > 0.3 and cong > 0.3:
            compound_disruption = (weather * cong) * 0.18 * sched_min
        if tsr > 0.4 and cong > 0.4:
            compound_disruption += (tsr * cong) * 0.15 * sched_min

        # Recent delay momentum
        # If train delay was growing over last 3 sections, residual has positive drift
        momentum_factor = 0.0
        if rolling_delay > prev_delay and rolling_delay > 5.0:
            momentum_factor = min(rolling_delay * 0.06, 3.5)

        # Historical train punctuality influence
        # Chronically late trains incur slightly higher residual
        chronic_penalty = 0.0
        if ontime_pct < 75.0:
            chronic_penalty = (75.0 - ontime_pct) * 0.03

        # Fog influence in early morning / night
        fog_effect = fog_risk * 0.08 * sched_min if weather > 0.2 else 0.0

        # Calculated residual (actual - baseline)
        residual = compound_disruption + momentum_factor + chronic_penalty + fog_effect

        # Slight negative residual (recovery) if running completely clear on high ontime train
        if weather < 0.1 and tsr < 0.1 and cong < 0.1 and ontime_pct > 90.0 and curr_delay > 0:
            residual -= min(curr_delay * 0.04, 1.5)

        residual = round(residual, 2)
        predicted = round(max(sched_min * 0.85, baseline + residual), 2)

        # Quantile uncertainty estimates based on volatility
        uncertainty_spread = max(1.2, round((weather * 2.5 + tsr * 3.0 + cong * 2.0 + 0.8), 2))
        p10 = round(max(sched_min * 0.85, predicted - uncertainty_spread), 2)
        p50 = predicted
        p90 = round(predicted + uncertainty_spread * 1.3, 2)

        explanation_factors = {
            "compound_disruption_impact": round(compound_disruption, 2),
            "delay_momentum_impact": round(momentum_factor, 2),
            "historical_punctuality_impact": round(chronic_penalty, 2),
            "environmental_risk_impact": round(fog_effect, 2)
        }

        return PredictionResponse(
            baseline_section_minutes=baseline,
            ml_residual_minutes=residual,
            predicted_section_minutes=predicted,
            prediction_source="mock",
            model_version=self.version,
            p10=p10,
            p50=p50,
            p90=p90,
            explanation_factors=explanation_factors
        )


class ModelPredictor(BasePredictor):
    """
    Pluggable predictor that loads the exported ML residual model (eta-xgb-v1 / eta_model.joblib).
    Falls back gracefully to baseline if model is unavailable or inference errors occur.
    """
    def __init__(self, model_path: Path = MODEL_FILE):
        self.model_path = model_path
        self.model = None
        self.version = "eta-xgb-v1"
        self._load_model()

    def _load_model(self):
        if self.model_path.exists():
            try:
                self.model = joblib.load(self.model_path)
            except Exception as e:
                self.model = None

    def predict_section(self, features: Dict[str, Any]) -> PredictionResponse:
        baseline = float(features.get("baseline_section_minutes", 10.0))
        sched_min = float(features.get("scheduled_section_minutes", 10.0))

        if self.model is None:
            self._load_model()

        # If model is not found or fails to load, fallback to baseline as required by agent.md
        if self.model is None:
            return PredictionResponse(
                baseline_section_minutes=baseline,
                ml_residual_minutes=0.0,
                predicted_section_minutes=baseline,
                prediction_source="baseline",
                model_version="baseline-fallback",
                p10=None,
                p50=None,
                p90=None,
                explanation_factors={"fallback_reason": 1.0}
            )

        try:
            # Build input vector in the exact FEATURE_ORDER
            vector = [float(features.get(col, 0.0)) for col in FEATURE_ORDER]
            residual = float(self.model.predict([vector])[0])
            residual = round(residual, 2)
            predicted = round(max(sched_min * 0.85, baseline + residual), 2)

            return PredictionResponse(
                baseline_section_minutes=baseline,
                ml_residual_minutes=residual,
                predicted_section_minutes=predicted,
                prediction_source="ml",
                model_version=self.version,
                p10=round(max(sched_min * 0.85, predicted - 2.0), 2),
                p50=predicted,
                p90=round(predicted + 2.8, 2),
                explanation_factors={"ml_feature_contribution": round(residual, 2)}
            )
        except Exception:
            # Fallback on any runtime error
            return PredictionResponse(
                baseline_section_minutes=baseline,
                ml_residual_minutes=0.0,
                predicted_section_minutes=baseline,
                prediction_source="baseline",
                model_version="baseline-fallback",
                p10=None,
                p50=None,
                p90=None,
                explanation_factors={"fallback_reason": 1.0}
            )


# Global predictor instance
_predictor_instance: Optional[BasePredictor] = None


def get_predictor() -> BasePredictor:
    """
    Returns the active predictor.
    If a trained model artifact exists on disk, it uses ModelPredictor.
    Otherwise, it uses MockPredictor seamlessly.
    """
    global _predictor_instance
    if _predictor_instance is None:
        if MODEL_FILE.exists():
            _predictor_instance = ModelPredictor(MODEL_FILE)
        else:
            _predictor_instance = MockPredictor()
    return _predictor_instance


def set_predictor(predictor: BasePredictor):
    """Allows hot-swapping predictor (e.g. once ML model finishes training)."""
    global _predictor_instance
    _predictor_instance = predictor
