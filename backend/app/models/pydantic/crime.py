
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class CrimeCreate(BaseModel):
    title: str  # 発生場所
    info: str  # 事案の詳細
    # lat: float  # 緯度
    # lng: float  # 経度

    class Config:
        orm_mode = True


class CrimeUpdate(BaseModel):
    title: Optional[str] = None
    info: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

    class Config:
        orm_mode = True


class CrimeResponse(BaseModel):
    id: int
    title: str
    info: str
    lat: float
    lng: float
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
