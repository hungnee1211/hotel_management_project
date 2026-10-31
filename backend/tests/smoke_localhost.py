"""Run against local Next.js + backend; creates and removes only its unique test account."""
from uuid import uuid4
import httpx
from sqlalchemy import select, delete
from app.core.database import SessionLocal
from app.models import User, LoginSession, AuditLog
from app.models.role import user_roles
from app.models.session import UsedRefresh

email = f"smoke-{uuid4().hex}@example.com"
password = uuid4().hex + "Aa!"
try:
    with httpx.Client(base_url="http://localhost:3000", timeout=30,
                      headers={"X-Requested-With": "HotelApp", "Origin": "http://localhost:3000"}) as client:
        for route in ("/login", "/register", "/dashboard"):
            assert client.get(route).status_code == 200, route
        assert client.post("/api/auth/register", json={"email": email, "password": password, "full_name": "Smoke Test"}).status_code == 201
        result = client.post("/api/auth/login", json={"email": email, "password": password, "remember": True})
        assert result.status_code == 200, result.text
        assert client.get("/api/me").json()["email"] == email
        assert client.get("/api/dashboard").status_code == 200
        assert client.get("/api/audit-logs").status_code == 403
        assert client.post("/api/auth/refresh").status_code == 200
        assert client.get("/api/me").status_code == 200
        assert client.post("/api/auth/logout").status_code == 200
        assert client.get("/api/me").status_code == 401
    print("PASS localhost pages + register/login/me/dashboard/RBAC/refresh/logout through Next.js proxy")
finally:
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user:
            ids = select(LoginSession.id).where(LoginSession.user_id == user.id)
            db.execute(delete(UsedRefresh).where(UsedRefresh.session_id.in_(ids)))
            db.execute(delete(LoginSession).where(LoginSession.user_id == user.id))
            db.execute(delete(AuditLog).where(AuditLog.user_id == user.id))
            db.execute(delete(user_roles).where(user_roles.c.user_id == user.id))
            db.delete(user)
            db.commit()
            print("Removed this run's temporary test account and events.")
