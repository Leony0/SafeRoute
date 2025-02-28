from sqlalchemy import Boolean, Column, Integer, String, DateTime, func,Float
#from sqlalchemy.orm import relationship
from app.database.database import Base

class Crime(Base):
    __tablename__ = "crime"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), index=True)
    info = Column(String(1000))
    lat = Column(Float)
    lng = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)