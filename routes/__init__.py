from .trains import router as trains_router
from .eta import router as eta_router
from .stations import router as stations_router
from .network import router as network_router
from .alerts import router as alerts_router
from .metrics import router as metrics_router
from .simulation import router as simulation_router
from .websocket import router as websocket_router, manager as ws_manager
