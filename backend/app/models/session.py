from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from app.core.database import Base

class LoginSession(Base):
    __tablename__ = "login_sessions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    access_hash = Column(String(64), nullable=False, unique=True)
    refresh_hash = Column(String(64), nullable=False, unique=True)
    access_expires = Column(DateTime, nullable=False)
    refresh_expires = Column(DateTime, nullable=False)
    revoked = Column(Boolean, nullable=False, default=False)
    remember = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

class UsedRefresh(Base):
    __tablename__ = "used_refresh_tokens"
    token_hash = Column(String(64), primary_key=True)
    session_id = Column(Integer, ForeignKey("login_sessions.id"), nullable=False, index=True)
