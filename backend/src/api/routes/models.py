"""Model routes for AI model management with Shelby storage"""

from datetime import datetime
from typing import Optional, List
import uuid
import hashlib
import httpx
from enum import Enum as PyEnum

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.database import get_db
from src.api.routes.auth import CurrentUser, OptionalUser
from src.models.model import AIModel as Model, ModelType as DBModelType

router = APIRouter()


# Extend model types for API
class ModelType(str, PyEnum):
    """Model types for API"""
    CLASSIFICATION = "classification"
    REGRESSION = "regression"
    GENERATION = "generation"
    DETECTION = "detection"
    NLP = "nlp"
    MULTIMODAL = "multimodal"
    TRANSFORMER = "transformer"
    CUSTOM = "custom"


class ModelCreate(BaseModel):
    """Create model request (without file)"""
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=2000)
    model_type: str = Field(default="custom", max_length=50)
    version: str = Field(default="1.0.0", max_length=20)
    framework: Optional[str] = Field(default=None, max_length=50)
    input_schema: Optional[dict] = None
    output_schema: Optional[dict] = None
    metadata: Optional[dict] = None


class ModelUpdate(BaseModel):
    """Update model request"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = None
    version: Optional[str] = None
    input_schema: Optional[dict] = None
    output_schema: Optional[dict] = None
    performance_metrics: Optional[dict] = None
    training_config: Optional[dict] = None
    is_public: Optional[bool] = None
    tags: Optional[list[str]] = None


class ModelResponse(BaseModel):
    """Model response - matches database schema"""
    id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    description: Optional[str] = None
    model_type: str
    version: str
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
    """Paginated model list"""
    items: List[ModelResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ModelStats(BaseModel):
    """Model statistics"""
    total_models: int
    total_storage_bytes: int
    public_models: int


class ShelbyUploadResponse(BaseModel):
    """Shelby upload response"""
    blob_id: str
    model_hash: str
    file_size: int


async def upload_to_shelby(file_data: bytes, model_hash: str) -> ShelbyUploadResponse:
    """Upload model to Shelby decentralized storage"""
    
    # In production, this would call the actual Shelby API
    # For now, we simulate the upload
    async with httpx.AsyncClient() as client:
        try:
            # Simulate Shelby upload
            # response = await client.post(
            #     f"{settings.SHELBY_API_URL}/blobs",
            #     content=file_data,
            #     headers={"Content-Type": "application/octet-stream"},
            # )
            # response.raise_for_status()
            # data = response.json()
            
            # Mock response for development
            blob_id = f"shelby_{hashlib.sha256(model_hash.encode()).hexdigest()[:32]}"
            
            return ShelbyUploadResponse(
                blob_id=blob_id,
                model_hash=model_hash,
                file_size=len(file_data),
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload to Shelby: {str(e)}"
            )


@router.get("", response_model=ModelListResponse)
async def list_models(
    current_user: OptionalUser,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    model_type: Optional[ModelType] = None,
    search: Optional[str] = None,
    include_public: bool = False,
):
    """List user's models"""
    
    # If no user, return empty list
    if not current_user:
        return ModelListResponse(items=[], total=0, page=page, page_size=page_size, total_pages=0)
    
    if include_public:
        query = select(Model).where(
            (Model.owner_id == current_user.id) | (Model.is_public == True)
        )
        count_query = select(func.count(Model.id)).where(
            (Model.owner_id == current_user.id) | (Model.is_public == True)
        )
    else:
        query = select(Model).where(Model.owner_id == current_user.id)
        count_query = select(func.count(Model.id)).where(Model.owner_id == current_user.id)
    
    if model_type:
        query = query.where(Model.model_type == model_type)
        count_query = count_query.where(Model.model_type == model_type)
    
    if search:
        query = query.where(Model.name.ilike(f"%{search}%"))
        count_query = count_query.where(Model.name.ilike(f"%{search}%"))
    
    total = await db.scalar(count_query)
    
    offset = (page - 1) * page_size
    query = query.order_by(Model.created_at.desc()).offset(offset).limit(page_size)
    
    result = await db.execute(query)
    models = result.scalars().all()
    
    return ModelListResponse(
        items=[ModelResponse.model_validate(m) for m in models],
        total=total or 0,
        page=page,
        page_size=page_size,
        total_pages=((total or 0) + page_size - 1) // page_size,
    )


@router.get("/stats", response_model=ModelStats)
async def get_model_stats(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get model statistics"""
    
    total = await db.scalar(
        select(func.count(Model.id)).where(Model.owner_id == current_user.id)
    )
    
    storage = await db.scalar(
        select(func.sum(Model.file_size)).where(Model.owner_id == current_user.id)
    )
    
    public = await db.scalar(
        select(func.count(Model.id)).where(
            Model.owner_id == current_user.id,
            Model.is_public == True
        )
    )
    
    return ModelStats(
        total_models=total or 0,
        total_storage_bytes=storage or 0,
        public_models=public or 0,
    )


@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(
    model_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific model"""
    result = await db.execute(
        select(Model).where(
            Model.id == model_id,
            (Model.owner_id == current_user.id) | (Model.is_public == True)
        )
    )
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    return model


@router.post("", response_model=ModelResponse, status_code=status.HTTP_201_CREATED)
async def create_model(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    model_type: ModelType = Form(ModelType.TRANSFORMER),
    version: str = Form("1.0.0"),
    framework: Optional[str] = Form(None),
    is_public: bool = Form(False),
    file: UploadFile = File(...),
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
):
    """Upload a new AI model"""
    
    # Read file content
    file_content = await file.read()
    file_size = len(file_content)
    
    # Compute model hash
    model_hash = "0x" + hashlib.sha256(file_content).hexdigest()
    
    # Check for duplicate
    existing = await db.execute(
        select(Model).where(
            Model.owner_id == current_user.id,
            Model.model_hash == model_hash
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Model with this hash already exists"
        )
    
    # Upload to Shelby
    shelby_response = await upload_to_shelby(file_content, model_hash)
    
    # Create model record
    model = Model(
        owner_id=current_user.id,
        name=name,
        description=description,
        model_type=model_type,
        version=version,
        framework=framework,
        model_hash=model_hash,
        file_size=file_size,
        shelby_blob_id=shelby_response.blob_id,
        is_public=is_public,
    )
    
    db.add(model)
    await db.commit()
    await db.refresh(model)
    
    return model


@router.post("/register", response_model=ModelResponse, status_code=status.HTTP_201_CREATED)
async def register_model(
    data: ModelCreate,
    model_hash: str,
    shelby_blob_id: Optional[str] = None,
    metadata_uri: Optional[str] = None,
    file_size: int = 0,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
):
    """Register an existing model (already uploaded to Shelby)"""
    
    if not shelby_blob_id and not metadata_uri:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either shelby_blob_id or metadata_uri is required"
        )
    
    model = Model(
        owner_id=current_user.id,
        name=data.name,
        description=data.description,
        model_type=data.model_type,
        version=data.version,
        framework=data.framework,
        input_schema=data.input_schema,
        output_schema=data.output_schema,
        training_config=data.metadata,
        model_hash=model_hash,
        file_size=file_size,
        shelby_blob_id=shelby_blob_id,
        metadata_uri=metadata_uri,
    )
    
    db.add(model)
    await db.commit()
    await db.refresh(model)
    
    return model


@router.put("/{model_id}", response_model=ModelResponse)
async def update_model(
    model_id: uuid.UUID,
    data: ModelUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Update a model"""
    result = await db.execute(
        select(Model).where(
            Model.id == model_id,
            Model.owner_id == current_user.id
        )
    )
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(model, key, value)
    
    await db.commit()
    await db.refresh(model)
    
    return model


@router.post("/{model_id}/visibility")
async def toggle_model_visibility(
    model_id: uuid.UUID,
    is_public: bool,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Toggle model public/private visibility"""
    result = await db.execute(
        select(Model).where(
            Model.id == model_id,
            Model.owner_id == current_user.id
        )
    )
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    model.is_public = is_public
    await db.commit()
    
    return {"status": "ok", "is_public": is_public}


@router.get("/{model_id}/download-url")
async def get_model_download_url(
    model_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get a download URL for the model"""
    result = await db.execute(
        select(Model).where(
            Model.id == model_id,
            (Model.owner_id == current_user.id) | (Model.is_public == True)
        )
    )
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    # Increment download count
    model.download_count += 1
    await db.commit()
    
    # Generate download URL from Shelby
    download_url = f"{settings.SHELBY_API_URL}/blobs/{model.shelby_blob_id}"
    
    return {
        "download_url": download_url,
        "model_hash": model.model_hash,
        "file_size": model.file_size,
        "expires_in": 3600,  # 1 hour
    }


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(
    model_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Delete a model"""
    result = await db.execute(
        select(Model).where(
            Model.id == model_id,
            Model.owner_id == current_user.id
        )
    )
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    if model.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a verified model"
        )
    
    # TODO: Delete from Shelby storage
    
    await db.delete(model)
    await db.commit()
