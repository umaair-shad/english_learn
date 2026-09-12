"""PostgreSQL connection helpers."""

from __future__ import annotations

from typing import Any

try:
    import psycopg  # type: ignore

    PSYCOPG_AVAILABLE = True
except ImportError:  # pragma: no cover
    PSYCOPG_AVAILABLE = False


class DatabaseUnavailable(RuntimeError):
    pass


def connect(database_url: str | None, **kwargs: Any):
    """Return a psycopg3 connection or raise a clear error."""
    if not PSYCOPG_AVAILABLE:
        raise DatabaseUnavailable(
            "psycopg is not installed. Install the project with "
            "`pip install -e 'scripts/vocabulary'` (adds psycopg[binary])."
        )
    if not database_url:
        raise DatabaseUnavailable(
            "DATABASE_URL is not set. See .env.example. "
            "Example: postgresql://vocab:vocab@localhost:5432/vocabulary"
        )
    conn = psycopg.connect(database_url, **kwargs)
    conn.row_factory = psycopg.rows.dict_row
    return conn
