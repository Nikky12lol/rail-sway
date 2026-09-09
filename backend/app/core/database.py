from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Additive, idempotent schema evolution for columns introduced after v1.
# create_all() cannot add columns to existing tables, so fresh installs get
# them from the models while upgraded databases get ALTER TABLE here.
EXTRA_COLUMNS = {
    "maintenance_requests": [("requested_date", "DATE")],
    "trains": [("source", "VARCHAR(20) DEFAULT 'seed'")],
}


def ensure_extra_columns() -> None:
    with engine.connect() as conn:
        insp = inspect(conn)
        tables = set(insp.get_table_names())
        for table, cols in EXTRA_COLUMNS.items():
            if table not in tables:
                continue
            existing = {c["name"] for c in insp.get_columns(table)}
            for name, ddl in cols:
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
        if "trains" in tables:
            conn.execute(text("UPDATE trains SET source='seed' WHERE source IS NULL"))
        conn.commit()
