"""Explicit, idempotent schema/bootstrap command; does not reset existing data."""
import argparse
from getpass import getpass
from sqlalchemy import select
from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password
from app.models import User, Role, Permission, role_permissions

PERMISSIONS = ("dashboard:read", "audit:read", "users:manage")
ROLE_PERMISSIONS = {
    "member": ("dashboard:read",),
    "staff": ("dashboard:read",),
    "receptionist": ("dashboard:read",),
    "manager": ("dashboard:read", "audit:read"),
    "admin": PERMISSIONS,
}

def initialize(db):
    Base.metadata.create_all(db.get_bind())
    for name in PERMISSIONS:
        if not db.scalar(select(Permission).where(Permission.name == name)):
            db.add(Permission(name=name))
    for name in ROLE_PERMISSIONS:
        if not db.scalar(select(Role).where(Role.name == name)):
            db.add(Role(name=name))
    db.flush()
    for role in db.scalars(select(Role).where(Role.name.in_(ROLE_PERMISSIONS))):
        names = ROLE_PERMISSIONS[role.name]
        for name in names:
            permission = db.scalar(select(Permission).where(Permission.name == name))
            exists = db.execute(select(role_permissions).where(
                role_permissions.c.role_id == role.id,
                role_permissions.c.permission_id == permission.id)).first()
            if not exists:
                db.execute(role_permissions.insert().values(role_id=role.id, permission_id=permission.id))
    db.commit()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--admin-email")
    args = parser.parse_args()
    with SessionLocal() as db:
        initialize(db)
        if args.admin_email:
            email = args.admin_email.strip().lower()
            user = db.scalar(select(User).where(User.email == email))
            if not user:
                password = getpass("New admin password (at least 12 characters): ")
                if len(password) < 12:
                    raise SystemExit("Password must have at least 12 characters")
                user = User(username=email, email=email, full_name="Administrator", hashed_password=hash_password(password))
                db.add(user)
            admin = db.scalar(select(Role).where(Role.name == "admin"))
            if admin not in user.roles:
                user.roles.append(admin)
            db.commit()
    print("Database initialized.")
