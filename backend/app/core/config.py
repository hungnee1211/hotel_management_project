import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+psycopg2://hotel:hotel@127.0.0.1:5432/hotel_management")
ORIGINS = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")]
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
ACCESS_SECONDS = 900
REFRESH_SECONDS = 7 * 86400
