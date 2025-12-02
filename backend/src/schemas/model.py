"""AI Model schemas"""

from typing import Optional
from datetime import datetime
from enum import Enum
import uuid

from pydantic import BaseModel, Field


class ModelType(str, Enum):
    """Model type enum"""
    CLASSIFICATION = "classification"
    REGRESSION = "regression"
    GENERATION = "generation"
    DETECTION = "detection"
    SEGMENTATION = "segmentation"
    NLP = "nlp"
    MULTIMODAL = "multimodal"
    CUSTOM = "custom"
    TRANSFORMER = "transformer"


class ModelCreate(BaseModel):
    """Schema for creating an AI model"""
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=2000)
    version: str = Field(default="1.0.0", max_length=20)
    model_type: str = Field(default="custom", max_length=50)
    framework: Optional[str] = Field(default=None, max_length=50)
    model_hash: Optional[str] = Field(default=None, max_length=66)
    metadata_uri: Optional[str] = None
    file_size: Optional[int] = None
    input_schema: Optional[dict] = None
    output_schema: Optional[dict] = None
    parameters_count: Optional[int] = None
    performance_metrics: Optional[dict] = None
    training_config: Optional[dict] = None
    is_public: bool = False
    tags: Optional[list[str]] = None


class ModelUpdate(BaseModel):
    """Schema for updating an AI model"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=2000)
    version: Optional[str] = Field(default=None, max_length=20)
    model_type: Optional[str] = None
    framework: Optional[str] = None
    input_schema: Optional[dict] = None
    output_schema: Optional[dict] = None
    performance_metrics: Optional[dict] = None
    training_config: Optional[dict] = None
    is_public: Optional[bool] = None
    is_verified: Optional[bool] = None
    tags: Optional[list[str]] = None


class ModelResponse(BaseModel):
    """Schema for model response - matches database schema"""
    id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    description: Optional[str] = None
    version: str
    model_type: str
    framework: Optional[str] = None
    model_hash: Optional[str] = None
    shelby_blob_id: Optional[str] = None
    metadata_uri: Optional[str] = None
    file_size: Optional[int] = None
    parameters_count: Optional[int] = None
    input_schema: Optional[dict] = None
    output_schema: Optional[dict] = None
    performance_metrics: Optional[dict] = None
    training_config: Optional[dict] = None
    is_public: bool = False
    is_verified: bool = False
    download_count: int = 0
    tags: Optional[list[str]] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ModelListResponse(BaseModel):
    """Schema for paginated model list"""
    items: list[ModelResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ModelStats(BaseModel):
    """Schema for model statistics"""
    total_models: int
    verified_models: int
    total_inferences: int
    models_by_type: dict[str, int]
    models_by_framework: dict[str, int]
