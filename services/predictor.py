"""
Prediction Interface and Predictor Implementations.

Implements:
1. ONNXPredictor: Real-time inference engine loading trained ONNX artifacts
   (eta_catboost_v1.onnx) using onnxruntime with automatic fallback.
2. MockPredictor: High-fidelity deterministic residual engine conforming to the exact ML contract.
3. ModelPredictor: Pluggable joblib model loader for Scikit-learn / XGBoost artifacts.
4. Quantile Uncertainty Bounds: P10, P50, P90.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
import numpy as np

from schemas.eta import PredictionResponse

logger = logging.getLogger(__name__)

# Primary ONNX model path and contract
ROOT_DIR = Path(__file__).resolve().parent.parent
ONNX_MODEL_FILE = ROOT_DIR / "ml" / "models" / "eta_xgboost_v1.onnx"

P10_MODEL_FILE = ROOT_DIR / "ml" / "models" / "eta_xgboost_p10_v1.onnx"
P50_MODEL_FILE = ROOT_DIR / "ml" / "models" / "eta_xgboost_p50_v1.onnx"
P90_MODEL_FILE = ROOT_DIR / "ml" / "models" / "eta_xgboost_p90_v1.onnx"

FEATURE_CONTRACT_FILE = ROOT_DIR / "ml" / "models" / "feature_contract.json"

# Fallback paths
JOB_MODEL_FILE = ROOT_DIR / "models" / "eta_model.joblib"

# The standard 20 feature order specified in the ML contract
DEFAULT_FEATURE_ORDER = [
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
    High-fidelity deterministic residual engine for use when trained ML model is unavailable.
    Produces realistic nonlinear residuals, uncertainty intervals (P10/P50/P90),
    and factor explanations.
    """
    def __init__(self, version: str = "mock-residual-v1"):
        self.version = version
        self.prediction_source = "mock"

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
        momentum_factor = 0.0
        if rolling_delay > prev_delay and rolling_delay > 5.0:
            momentum_factor = min(rolling_delay * 0.06, 3.5)

        # Historical train punctuality influence
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


class ONNXPredictor(BasePredictor):
    """
    Production ONNX runtime predictor loading trained model artifacts (e.g. eta_xgboost_v1.onnx).
    Conforms to the 20-feature contract and applies residual correction:
        final_section_prediction = max(sched * 0.85, baseline_section_minutes + predicted_residual_minutes)
    Provides operational uncertainty bounds (P10/P50/P90) and human-interpretable factor weights.
    """
    def __init__(self, model_path: Path = ONNX_MODEL_FILE, contract_path: Path = FEATURE_CONTRACT_FILE):
        self.model_path = model_path
        self.contract_path = contract_path
        self.session = None
        self.p10_session = None
        self.p50_session = None
        self.p90_session = None
        self.input_name = "input"
        self.p10_input_name = "input"
        self.p50_input_name = "input"
        self.p90_input_name = "input"
        self.version = "eta_xgboost_v1"
        self.prediction_source = "ml"
        self.feature_order: List[str] = DEFAULT_FEATURE_ORDER
        self._fallback_predictor = MockPredictor(version="mock-fallback-v1")

        self._load_contract()
        self._load_session()

    def _load_contract(self):
        if self.contract_path.exists():
            try:
                with open(self.contract_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.version = data.get("model_name", self.version)
                    if "features" in data and isinstance(data["features"], list):
                        self.feature_order = data["features"]
                        logger.info(f"Loaded feature contract for {self.version} with {len(self.feature_order)} features.")
            except Exception as e:
                logger.warning(f"Could not load feature contract {self.contract_path}: {e}")

    def _load_session(self):
      if not self.model_path.exists():
        logger.warning(
            f"ONNX model not found at {self.model_path}. Inference will fallback."
        )
        return

      try:
        import onnxruntime as ort

        sess_options = ort.SessionOptions()
        sess_options.intra_op_num_threads = 1
        sess_options.graph_optimization_level = (
            ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        )
        sess_options.log_severity_level = 3

        # Main point model
        self.session = ort.InferenceSession(
            str(self.model_path),
            sess_options=sess_options
        )

        # Quantile models
        self.p10_session = ort.InferenceSession(
            str(P10_MODEL_FILE),
            sess_options=sess_options
        )

        self.p50_session = ort.InferenceSession(
            str(P50_MODEL_FILE),
            sess_options=sess_options
        )

        self.p90_session = ort.InferenceSession(
            str(P90_MODEL_FILE),
            sess_options=sess_options
        )

        # Read actual ONNX input names
        self.input_name = self.session.get_inputs()[0].name
        self.p10_input_name = self.p10_session.get_inputs()[0].name
        self.p50_input_name = self.p50_session.get_inputs()[0].name
        self.p90_input_name = self.p90_session.get_inputs()[0].name

        logger.info(
            "XGBoost Point + P10 + P50 + P90 ONNX models loaded successfully."
        )

      except Exception as e:
        logger.error(f"Failed to load ONNX models: {e}")

        self.session = None
        self.p10_session = None
        self.p50_session = None
        self.p90_session = None

    def predict_section(self, features: Dict[str, Any]) -> PredictionResponse:
        baseline = float(features.get("baseline_section_minutes", 10.0))
        sched_min = float(features.get("scheduled_section_minutes", 10.0))

        if self.session is None:
            self._load_session()

        # If ONNX session cannot be initialized, fallback cleanly to high-fidelity mock predictor
        if self.session is None:
            fallback_res = self._fallback_predictor.predict_section(features)
            fallback_res.prediction_source = "mock-fallback"
            return fallback_res

        try:
            # Build input vector strictly following feature_order
            vector = [float(features.get(col, 0.0)) for col in self.feature_order]
            input_tensor = np.array([vector], dtype=np.float32)

            # Run inference
            outputs = self.session.run(None, {self.input_name: input_tensor})
            # Outputs typically have shape (1,) or (1, 1)
            raw_residual = float(outputs[0].flatten()[0])
            residual = round(raw_residual, 2)

            p10_outputs = self.p10_session.run(None,{self.p10_input_name: input_tensor})
            p50_outputs = self.p50_session.run(None,{self.p50_input_name: input_tensor})
            p90_outputs = self.p90_session.run(None,{self.p90_input_name: input_tensor})
            
            p10_residual = float(p10_outputs[0].flatten()[0])
            p50_residual = float(p50_outputs[0].flatten()[0])
            p90_residual = float(p90_outputs[0].flatten()[0])

            p10_residual, p50_residual, p90_residual = sorted([
               p10_residual,
               p50_residual,
               p90_residual
           ])

            # Section prediction = baseline + predicted residual
            predicted = round(max(sched_min * 0.70, baseline + residual), 2)
            p10 = round(max(sched_min * 0.70,baseline + p10_residual),2)
            p50 = round(max(sched_min * 0.70,baseline + p50_residual),2)
            p90 = round(max(sched_min * 0.70,baseline + p90_residual),2)

            # Volatility-adjusted uncertainty bounds
            weather = float(features.get("weather_severity", 0.0))
            tsr = float(features.get("tsr_severity", 0.0))
            cong = float(features.get("congestion_level", 0.0))
            trains_ahead = int(features.get("trains_ahead", 0))


            explanation_factors = {
                "model_residual_minutes": residual,
                "baseline_minutes": baseline,
                "weather_impact": round(weather * 8.0, 2),
                "tsr_impact": round(tsr * 12.0, 2),
                "congestion_impact": round(cong * 7.0, 2),
                "delay_momentum_impact": round(float(features.get("rolling_delay_3_sections", 0.0)) * 0.05, 2)
            }

            return PredictionResponse(
                baseline_section_minutes=baseline,
                ml_residual_minutes=residual,
                predicted_section_minutes=predicted,
                prediction_source=self.prediction_source,
                model_version=self.version,
                p10=p10,
                p50=p50,
                p90=p90,
                explanation_factors=explanation_factors
            )
        except Exception as e:
            logger.error(f"ONNX inference error: {e}. Falling back to baseline/mock.", exc_info=True)
            fallback_res = self._fallback_predictor.predict_section(features)
            fallback_res.prediction_source = "mock-fallback"
            return fallback_res


class ModelPredictor(BasePredictor):
    """
    Pluggable predictor that loads exported Joblib ML residual models (e.g. Scikit-learn / XGBoost).
    Falls back gracefully if model is unavailable.
    """
    def __init__(self, model_path: Path = JOB_MODEL_FILE):
        self.model_path = model_path
        self.model = None
        self.version = "eta-xgb-v1"
        self.prediction_source = "ml"
        self._load_model()

    def _load_model(self):
        if self.model_path.exists():
            try:
                import joblib
                self.model = joblib.load(self.model_path)
            except Exception as e:
                logger.warning(f"Could not load joblib model from {self.model_path}: {e}")
                self.model = None

    def predict_section(self, features: Dict[str, Any]) -> PredictionResponse:
        baseline = float(features.get("baseline_section_minutes", 10.0))
        sched_min = float(features.get("scheduled_section_minutes", 10.0))

        if self.model is None:
            self._load_model()

        if self.model is None:
            return MockPredictor().predict_section(features)

        try:
            vector = [float(features.get(col, 0.0)) for col in DEFAULT_FEATURE_ORDER]
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
            return MockPredictor().predict_section(features)


# Global predictor singleton
_predictor_instance: Optional[BasePredictor] = None


def get_predictor() -> BasePredictor:
    """
    Returns the active predictor singleton.
    Priority:
    1. ONNX model (ml/models/eta_catboost_v1.onnx)
    2. Joblib model (models/eta_model.joblib)
    3. MockPredictor (high-fidelity deterministic residual baseline)
    """
    global _predictor_instance
    if _predictor_instance is None:
        if ONNX_MODEL_FILE.exists():
            logger.info(f"Initializing ONNXPredictor with model {ONNX_MODEL_FILE}")
            _predictor_instance = ONNXPredictor(ONNX_MODEL_FILE)
        elif JOB_MODEL_FILE.exists():
            logger.info(f"Initializing ModelPredictor with model {JOB_MODEL_FILE}")
            _predictor_instance = ModelPredictor(JOB_MODEL_FILE)
        else:
            logger.info("No ML artifacts found. Using MockPredictor.")
            _predictor_instance = MockPredictor()
    return _predictor_instance


def set_predictor(predictor: BasePredictor):
    """Allows hot-swapping predictor (e.g. for testing or model swaps)."""
    global _predictor_instance
    _predictor_instance = predictor
