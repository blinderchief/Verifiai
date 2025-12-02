"""Pydantic schemas for API requests and responses"""

from src.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserLogin,
    Token,
    TokenPayload,
)
from src.schemas.proof import (
    ProofCreate,
    ProofUpdate,
    ProofResponse,
    ProofGenerateRequest,
    ProofVerifyRequest,
    ProofListResponse,
)
from src.schemas.agent import (
    AgentCreate,
    AgentUpdate,
    AgentResponse,
    AgentListResponse,
)
from src.schemas.settlement import (
    SettlementCreate,
    SettlementUpdate,
    SettlementResponse,
    SettlementApproval,
    SettlementListResponse,
)
from src.schemas.model import (
    ModelCreate,
    ModelUpdate,
    ModelResponse,
    ModelListResponse,
)
from src.schemas.swarm import (
    SwarmCreate,
    SwarmUpdate,
    SwarmResponse,
    SwarmTaskRequest,
    SwarmListResponse,
)
from src.schemas.common import (
    PaginationParams,
    PaginatedResponse,
    SuccessResponse,
    ErrorResponse,
)

__all__ = [
    # User
    "UserCreate",
    "UserUpdate", 
    "UserResponse",
    "UserLogin",
    "Token",
    "TokenPayload",
    # Proof
    "ProofCreate",
    "ProofUpdate",
    "ProofResponse",
    "ProofGenerateRequest",
    "ProofVerifyRequest",
    "ProofListResponse",
    # Agent
    "AgentCreate",
    "AgentUpdate",
    "AgentResponse",
    "AgentListResponse",
    # Settlement
    "SettlementCreate",
    "SettlementUpdate",
    "SettlementResponse",
    "SettlementApproval",
    "SettlementListResponse",
    # Model
    "ModelCreate",
    "ModelUpdate",
    "ModelResponse",
    "ModelListResponse",
    # Swarm
    "SwarmCreate",
    "SwarmUpdate",
    "SwarmResponse",
    "SwarmTaskRequest",
    "SwarmListResponse",
    # Common
    "PaginationParams",
    "PaginatedResponse",
    "SuccessResponse",
    "ErrorResponse",
]
