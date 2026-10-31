from datetime import timedelta
from sqlalchemy import select, delete
from app.main import now
from app.models import User, Role, AuditLog, LoginSession, role_permissions
from app.core.security import verify_password
import pytest
from app.init_db import initialize

ACCOUNT = {"email": "member@example.com", "password": "Password123!", "full_name": "Test Member"}

def signup(client, **changes):
    return client.post("/api/auth/register", json={**ACCOUNT, **changes})

def signin(client, **changes):
    return client.post("/api/auth/login", json={"email": ACCOUNT["email"], "password": ACCOUNT["password"], **changes})

def promote(db):
    with db() as session:
        user = session.scalar(select(User).where(User.email == ACCOUNT["email"]))
        user.roles.append(session.scalar(select(Role).where(Role.name == "admin")))
        session.commit()

def test_register_hash_duplicate_and_no_escalation(client, db):
    response = signup(client)
    assert response.status_code == 201
    assert response.json()["roles"] == ["member"]
    assert "hashed_password" not in response.text
    with db() as session:
        user = session.scalar(select(User))
        assert user.hashed_password != ACCOUNT["password"]
        assert user.hashed_password.startswith("$argon2")
        assert verify_password(ACCOUNT["password"], user.hashed_password)
    assert signup(client, email="MEMBER@example.com").status_code == 409
    assert signup(client, email="other@example.com", roles=["admin"]).status_code == 422

def test_validation(client):
    assert signup(client, password="short").status_code == 422
    assert signup(client, email="invalid").status_code == 422
    assert signup(client, full_name="  ").status_code == 422

def test_login_me_dashboard_logout(client, db):
    assert client.get("/api/me").status_code == 401
    signup(client)
    assert signin(client, password="wrong").status_code == 401
    response = signin(client)
    assert response.status_code == 200
    assert "HttpOnly" in response.headers["set-cookie"]
    assert "Max-Age" not in response.headers["set-cookie"]
    access = client.cookies["hotel_access"]
    refresh = client.cookies["hotel_refresh"]
    with db() as session:
        stored = session.scalar(select(LoginSession))
        assert stored.access_hash != access and stored.refresh_hash != refresh
    assert client.get("/api/me").json()["email"] == ACCOUNT["email"]
    assert client.get("/api/dashboard").json()["active_sessions"] == 1
    assert client.post("/api/auth/logout").status_code == 200
    assert client.get("/api/me").status_code == 401
    client.cookies.set("hotel_access", access, path="/api")
    client.cookies.set("hotel_refresh", refresh, path="/api")
    assert client.get("/api/me").status_code == 401
    assert client.post("/api/auth/refresh").status_code == 401

def test_refresh_rotation_replay_revokes_session(client, db):
    signup(client)
    signin(client, remember=True)
    old = client.cookies["hotel_refresh"]
    assert client.post("/api/auth/refresh").status_code == 200
    assert client.cookies["hotel_refresh"] != old
    assert client.get("/api/me").status_code == 200
    client.cookies.clear()
    client.cookies.set("hotel_refresh", old, path="/api")
    assert client.post("/api/auth/refresh").status_code == 401
    with db() as session:
        assert session.scalar(select(LoginSession)).revoked
        assert session.scalar(select(AuditLog).where(AuditLog.action == "refresh_replay"))

def test_expired_access_can_refresh(client, db):
    signup(client)
    signin(client)
    with db() as session:
        session.scalar(select(LoginSession)).access_expires = now() - timedelta(seconds=1)
        session.commit()
    assert client.get("/api/me").status_code == 401
    assert client.post("/api/auth/refresh").status_code == 200
    assert client.get("/api/me").status_code == 200

def test_expired_refresh_denied(client, db):
    signup(client)
    signin(client)
    with db() as session:
        session.scalar(select(LoginSession)).refresh_expires = now() - timedelta(seconds=1)
        session.commit()
    assert client.post("/api/auth/refresh").status_code == 401
    assert client.get("/api/me").status_code == 401

def test_locked_account_denied(client, db):
    signup(client)
    signin(client)
    with db() as session:
        session.scalar(select(User)).is_locked = True
        session.commit()
    assert client.get("/api/me").status_code == 403
    assert client.post("/api/auth/refresh").status_code == 401
    assert signin(client).status_code == 401

def test_rbac_and_audit(client, db):
    signup(client)
    signin(client)
    assert client.get("/api/audit-logs").status_code == 403
    assert client.get("/api/roles").status_code == 403
    assert client.put("/api/users/1/roles", json={"roles": ["admin"]}).status_code == 403
    promote(db)
    logs = client.get("/api/audit-logs")
    assert logs.status_code == 200
    assert {"register", "login"} <= {x["action"] for x in logs.json()}
    assert ACCOUNT["password"] not in logs.text
    assert client.get("/api/audit-logs?limit=101").status_code == 422
    assert client.get("/api/roles").status_code == 200

def test_permission_removed_effective_immediately(client, db):
    signup(client)
    signin(client)
    with db() as session:
        member = session.scalar(select(Role).where(Role.name == "member"))
        session.execute(delete(role_permissions).where(role_permissions.c.role_id == member.id))
        session.commit()
    assert client.get("/api/dashboard").status_code == 403

def test_admin_assign_roles(client, db):
    signup(client)
    signin(client)
    promote(db)
    other = signup(client, email="other@example.com").json()["id"]
    assert client.put(f"/api/users/{other}/roles", json={"roles": ["missing"]}).status_code == 422
    result = client.put(f"/api/users/{other}/roles", json={"roles": ["admin"]})
    assert result.status_code == 200
    assert "audit:read" in result.json()["permissions"]
    own = client.get("/api/me").json()["id"]
    assert client.put(f"/api/users/{own}/roles", json={"roles": ["member"]}).status_code == 400
    assert any(x["action"] == "roles_changed" for x in client.get("/api/audit-logs").json())

def test_csrf_cors(client):
    assert client.post("/api/auth/register", json=ACCOUNT, headers={"Origin": "https://evil.example"}).status_code == 403
    assert client.post("/api/auth/register", json=ACCOUNT, headers={"X-Requested-With": ""}).status_code == 403
    response = client.options("/api/auth/login", headers={"Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,x-requested-with"})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert response.headers["access-control-allow-credentials"] == "true"
    response = client.options("/api/auth/login", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
    assert response.status_code == 400

def test_remember_cookie_and_idempotent_logout(client):
    signup(client)
    response = signin(client, remember=True)
    assert "Max-Age=" in response.headers["set-cookie"]
    assert client.post("/api/auth/logout").status_code == 200
    assert client.post("/api/auth/logout").status_code == 200
    assert client.get("/api/me").headers["cache-control"] == "no-store"

def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}

@pytest.mark.parametrize("role,audit_status,users_status", [
    ("admin", 200, 200), ("manager", 200, 403),
    ("receptionist", 403, 403), ("staff", 403, 403), ("member", 403, 403),
])
def test_week1_role_matrix(client, db, role, audit_status, users_status):
    signup(client)
    signin(client)
    with db() as session:
        user = session.scalar(select(User))
        user.roles = [session.scalar(select(Role).where(Role.name == role))]
        session.commit()
    assert client.get("/api/dashboard").status_code == 200
    assert client.get("/api/audit-logs").status_code == audit_status
    assert client.get("/api/users").status_code == users_status
    assert client.get("/api/roles").status_code == users_status
    if users_status == 403:
        assert client.put("/api/users/999/roles", json={"roles": ["admin"]}).status_code == 403

def test_user_list_is_protected_paginated_and_private(client, db):
    assert client.get("/api/users").status_code == 401
    signup(client)
    signin(client)
    promote(db)
    signup(client, email="second@example.com")
    result = client.get("/api/users?limit=1&offset=1")
    assert result.status_code == 200
    assert len(result.json()) == 1
    assert result.json()[0]["email"] == "second@example.com"
    assert set(result.json()[0]) == {"id", "email", "full_name", "roles", "permissions"}
    assert client.get("/api/users?limit=101").status_code == 422
    assert client.get("/api/users?offset=-1").status_code == 422

def test_initialize_idempotent_and_does_not_grant_unknown_roles(db):
    with db() as session:
        custom = Role(name="custom-no-access")
        session.add(custom)
        session.commit()
        initialize(session)
        initialize(session)
        assert len(session.scalars(select(Role).where(Role.name.in_(
            ["admin", "manager", "receptionist", "staff", "member"]))).all()) == 5
        assert not session.execute(select(role_permissions).where(role_permissions.c.role_id == custom.id)).first()
