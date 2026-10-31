from datetime import datetime, timedelta, timezone
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core import config
from app.core.database import get_db
from app.core.security import digest, new_token, hash_password, verify_password
from app.models import User, Role, Permission, AuditLog, LoginSession, role_permissions
from app.models.session import UsedRefresh
from app.models.role import user_roles

app = FastAPI(title="Hotel Management API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=config.ORIGINS,
                   allow_credentials=True, allow_methods=["GET", "POST", "PUT", "OPTIONS"],
                   allow_headers=["Content-Type", "X-Requested-With"])

def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)

@app.middleware("http")
async def protect_requests(request: Request, call_next):
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        origin = request.headers.get("origin")
        if (origin and origin not in config.ORIGINS) or request.headers.get("x-requested-with") != "HotelApp":
            from fastapi.responses import JSONResponse
            return JSONResponse({"detail": "Yêu cầu không hợp lệ (CSRF)."}, status_code=403)
    response = await call_next(request)
    if request.url.path.startswith("/api"):
        response.headers["Cache-Control"] = "no-store"
    return response

class Register(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr = Field(max_length=254)
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("full_name")
    @classmethod
    def trim_name(cls, value):
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Họ tên cần ít nhất 2 ký tự")
        return value

class Login(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
    remember: bool = False

def audit(db, action, user_id=None, detail=None):
    db.add(AuditLog(user_id=user_id, action=action, module="auth", new_data=detail))

def permissions(db, user):
    return sorted(set(db.scalars(select(Permission.name)
        .join(role_permissions, Permission.id == role_permissions.c.permission_id)
        .join(user_roles, user_roles.c.role_id == role_permissions.c.role_id)
        .where(user_roles.c.user_id == user.id)).all()))

def user_data(db, user):
    return {"id": user.id, "email": user.email, "full_name": user.full_name,
            "roles": sorted(r.name for r in user.roles), "permissions": permissions(db, user)}

def current(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("hotel_access")
    session = db.scalar(select(LoginSession).where(LoginSession.access_hash == digest(token))) if token else None
    if not session or session.revoked or session.access_expires <= now() or session.refresh_expires <= now():
        raise HTTPException(401, "Vui lòng đăng nhập.")
    user = db.get(User, session.user_id)
    if not user or not user.is_active or user.is_locked:
        raise HTTPException(403, "Tài khoản không hoạt động.")
    return user, session

def require(permission):
    def dependency(auth=Depends(current), db: Session = Depends(get_db)):
        if permission not in permissions(db, auth[0]):
            raise HTTPException(403, "Bạn không có quyền thực hiện thao tác này.")
        return auth
    return dependency

def set_cookies(response, session, access, refresh):
    options = dict(httponly=True, secure=config.COOKIE_SECURE, samesite="lax", path="/api")
    response.set_cookie("hotel_access", access, max_age=config.ACCESS_SECONDS if session.remember else None, **options)
    remaining = max(0, int((session.refresh_expires - now()).total_seconds()))
    response.set_cookie("hotel_refresh", refresh, max_age=remaining if session.remember else None, **options)

@app.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(select(1))
    return {"status": "ok"}

@app.post("/api/auth/register", status_code=201)
def register(data: Register, db: Session = Depends(get_db)):
    email = str(data.email).strip().lower()
    role = db.scalar(select(Role).where(Role.name == "member"))
    if role is None:
        raise HTTPException(503, "Database chưa được khởi tạo.")
    user = User(username=email, email=email, full_name=data.full_name,
                hashed_password=hash_password(data.password), roles=[role])
    db.add(user)
    try:
        db.flush()
        audit(db, "register", user.id)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Email đã được sử dụng.")
    return user_data(db, user)

# A valid dummy hash makes unknown-account verification comparable to wrong-password verification.
DUMMY_HASH = hash_password("dummy-password-not-an-account")

@app.post("/api/auth/login")
def login(data: Login, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == str(data.email).strip().lower()))
    valid = verify_password(data.password, user.hashed_password if user else DUMMY_HASH)
    if not user or not valid or not user.is_active or user.is_locked:
        audit(db, "login_failed", user.id if user else None)
        db.commit()
        raise HTTPException(401, "Email hoặc mật khẩu không đúng, hoặc tài khoản không hoạt động.")
    access, refresh = new_token(), new_token()
    session = LoginSession(user_id=user.id, access_hash=digest(access), refresh_hash=digest(refresh),
                           access_expires=now() + timedelta(seconds=config.ACCESS_SECONDS),
                           refresh_expires=now() + timedelta(seconds=config.REFRESH_SECONDS),
                           remember=data.remember)
    db.add(session)
    user.last_login_at = now()
    audit(db, "login", user.id)
    db.commit()
    set_cookies(response, session, access, refresh)
    return user_data(db, user)

@app.post("/api/auth/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get("hotel_refresh")
    if not token:
        raise HTTPException(401, "Phiên đăng nhập đã hết hạn.")
    token_hash = digest(token)
    session = db.scalar(select(LoginSession).where(LoginSession.refresh_hash == token_hash).with_for_update())
    if not session:
        used = db.get(UsedRefresh, token_hash)
        if used:
            session = db.scalar(select(LoginSession).where(LoginSession.id == used.session_id).with_for_update())
            session.revoked = True
            audit(db, "refresh_replay", session.user_id)
            db.commit()
        raise HTTPException(401, "Refresh token không hợp lệ.")
    user = db.get(User, session.user_id)
    if session.revoked or session.refresh_expires <= now() or not user or not user.is_active or user.is_locked:
        raise HTTPException(401, "Phiên đăng nhập đã hết hạn.")
    db.add(UsedRefresh(token_hash=token_hash, session_id=session.id))
    access, refresh_token = new_token(), new_token()
    session.access_hash = digest(access)
    session.refresh_hash = digest(refresh_token)
    session.access_expires = now() + timedelta(seconds=config.ACCESS_SECONDS)
    audit(db, "refresh", user.id)
    db.commit()
    set_cookies(response, session, access, refresh_token)
    return {"status": "ok"}

@app.post("/api/auth/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    # Refresh cookie permits logout even when the short access session has expired.
    for cookie, column in (("hotel_refresh", LoginSession.refresh_hash), ("hotel_access", LoginSession.access_hash)):
        token = request.cookies.get(cookie)
        session = db.scalar(select(LoginSession).where(column == digest(token)).with_for_update()) if token else None
        if session and not session.revoked:
            session.revoked = True
            audit(db, "logout", session.user_id)
    db.commit()
    for cookie in ("hotel_access", "hotel_refresh"):
        response.delete_cookie(cookie, path="/api", secure=config.COOKIE_SECURE, httponly=True, samesite="lax")
    return {"status": "ok"}

@app.get("/api/me")
@app.get("/api/auth/me", include_in_schema=False)
def me(auth=Depends(current), db: Session = Depends(get_db)):
    return user_data(db, auth[0])

@app.get("/api/dashboard")
def dashboard(auth=Depends(require("dashboard:read")), db: Session = Depends(get_db)):
    user = auth[0]
    active = db.scalar(select(func.count()).select_from(LoginSession).where(
        LoginSession.user_id == user.id, LoginSession.revoked.is_(False), LoginSession.refresh_expires > now()))
    return {"user": user_data(db, user), "active_sessions": active,
            "last_login_at": user.last_login_at,
            "modules": ["Xác thực", "Phân quyền", "Nhật ký hoạt động"]}

@app.get("/api/audit-logs")
def audit_logs(limit: int = 50, offset: int = 0, auth=Depends(require("audit:read")), db: Session = Depends(get_db)):
    if limit < 1 or limit > 100 or offset < 0:
        raise HTTPException(422, "Phân trang không hợp lệ.")
    logs = db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).offset(offset).limit(limit))
    return [{"id": x.id, "user_id": x.user_id, "action": x.action, "created_at": x.created_at, "detail": x.new_data} for x in logs]

class RoleUpdate(BaseModel):
    roles: list[str] = Field(min_length=1, max_length=10)

@app.get("/api/roles")
def roles(auth=Depends(require("users:manage")), db: Session = Depends(get_db)):
    return [{"id": r.id, "name": r.name} for r in db.scalars(select(Role).order_by(Role.id))]

@app.get("/api/users")
def users(limit: int = 50, offset: int = 0, auth=Depends(require("users:manage")), db: Session = Depends(get_db)):
    if not 1 <= limit <= 100 or offset < 0:
        raise HTTPException(422, "Phân trang không hợp lệ.")
    return [user_data(db, user) for user in db.scalars(
        select(User).order_by(User.id).offset(offset).limit(limit))]

@app.put("/api/users/{user_id}/roles")
def change_roles(user_id: int, data: RoleUpdate, auth=Depends(require("users:manage")), db: Session = Depends(get_db)):
    if user_id == auth[0].id:
        raise HTTPException(400, "Không được thay đổi vai trò của chính mình.")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Không tìm thấy tài khoản.")
    found = db.scalars(select(Role).where(Role.name.in_(set(data.roles)))).all()
    if len(found) != len(set(data.roles)):
        raise HTTPException(422, "Vai trò không hợp lệ.")
    user.roles = found
    audit(db, "roles_changed", auth[0].id, f"user={user_id};roles={','.join(sorted(data.roles))}")
    db.commit()
    return user_data(db, user)
