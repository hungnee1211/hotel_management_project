import os
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.core.database import Base, get_db
from app.init_db import initialize

def pytest_addoption(parser):
    parser.addoption("--postgres", action="store_true", help="Test PostgreSQL in isolated temporary schemas")

@pytest.fixture
def db(request):
    from app.core.config import DATABASE_URL
    url = DATABASE_URL if request.config.getoption("--postgres") else os.getenv("TEST_DATABASE_URL")
    schema = "test_" + uuid4().hex
    if url:
        admin = create_engine(url)
        with admin.begin() as conn:
            conn.exec_driver_sql(f'CREATE SCHEMA "{schema}"')
        engine = create_engine(url, connect_args={"options": f"-csearch_path={schema}"})
    else:
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    factory = sessionmaker(bind=engine)
    with factory() as seed:
        initialize(seed)
    def override():
        with factory() as session:
            yield session
    app.dependency_overrides[get_db] = override
    try:
        yield factory
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
        if url:
            with admin.begin() as conn:
                conn.exec_driver_sql(f'DROP SCHEMA "{schema}" CASCADE')
            admin.dispose()

@pytest.fixture
def client(db):
    with TestClient(app, headers={"X-Requested-With": "HotelApp"}) as client:
        yield client
