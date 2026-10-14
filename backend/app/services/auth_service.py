"""Authentication and login data service storing user credentials and audit logs in JSON."""

import hashlib
import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.utils.exceptions import AppException

# Directory where login JSON data is persisted
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
LOGIN_DATA_FILE = DATA_DIR / "login_data.json"
SALT = "fintrack_secure_salt_2026"


def hash_password(password: str) -> str:
    """Hash password with a secure salt using SHA-256."""
    return hashlib.sha256(f"{SALT}:{password}".encode("utf-8")).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify if a plain password matches the stored hash."""
    return hash_password(plain_password) == hashed_password


def ensure_data_file() -> dict[str, Any]:
    """Ensure the JSON storage file exists with valid structure and default demo user."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if not LOGIN_DATA_FILE.exists():
        default_data: dict[str, Any] = {
            "users": [
                {
                    "id": "usr_demo",
                    "name": "Demo User",
                    "email": "demo@fintrack.io",
                    "password_hash": hash_password("password123"),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "last_login": datetime.now(timezone.utc).isoformat(),
                }
            ],
            "login_history": [
                {
                    "id": "log_init",
                    "email": "demo@fintrack.io",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "status": "initial_seed",
                    "ip_address": "127.0.0.1",
                    "user_agent": "system",
                }
            ],
        }
        with open(LOGIN_DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(default_data, f, indent=2)
        return default_data

    try:
        with open(LOGIN_DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        # Fallback if file was empty or corrupted
        default_data = {"users": [], "login_history": []}
        with open(LOGIN_DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(default_data, f, indent=2)
        return default_data


def save_data(data: dict[str, Any]) -> None:
    """Save user and login records back to the JSON file atomically."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    temp_file = LOGIN_DATA_FILE.with_suffix(".tmp")
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    temp_file.replace(LOGIN_DATA_FILE)


def register_user(
    name: str,
    email: str,
    password: str,
    ip_address: str = "127.0.0.1",
    user_agent: str = "",
) -> dict[str, Any]:
    """Register a new user, store record in JSON, and record registration event."""
    data = ensure_data_file()
    norm_email = email.strip().lower()

    # Check if user already exists
    for u in data.get("users", []):
        if u.get("email", "").lower() == norm_email:
            raise AppException("An account with this email already exists.", status_code=400)

    now_iso = datetime.now(timezone.utc).isoformat()
    user_id = f"usr_{uuid.uuid4().hex[:10]}"

    new_user = {
        "id": user_id,
        "name": name.strip(),
        "email": norm_email,
        "password_hash": hash_password(password),
        "created_at": now_iso,
        "last_login": now_iso,
    }

    login_record = {
        "id": f"log_{uuid.uuid4().hex[:8]}",
        "email": norm_email,
        "timestamp": now_iso,
        "status": "registered_and_logged_in",
        "ip_address": ip_address,
        "user_agent": user_agent,
    }

    data.setdefault("users", []).append(new_user)
    data.setdefault("login_history", []).append(login_record)
    save_data(data)

    token = f"ft_token_{uuid.uuid4().hex}"
    return {
        "user": {
            "id": new_user["id"],
            "name": new_user["name"],
            "email": new_user["email"],
            "created_at": new_user["created_at"],
        },
        "token": token,
    }


def login_user(
    email: str,
    password: str,
    ip_address: str = "127.0.0.1",
    user_agent: str = "",
) -> dict[str, Any]:
    """Verify credentials from JSON store and append login event to JSON history."""
    data = ensure_data_file()
    norm_email = email.strip().lower()
    now_iso = datetime.now(timezone.utc).isoformat()

    user_found: dict[str, Any] | None = None
    for u in data.get("users", []):
        if u.get("email", "").lower() == norm_email:
            user_found = u
            break

    # If user doesn't exist or password mismatch
    if not user_found or not verify_password(password, user_found.get("password_hash", "")):
        # Record failed attempt to JSON audit log
        login_record = {
            "id": f"log_{uuid.uuid4().hex[:8]}",
            "email": norm_email,
            "timestamp": now_iso,
            "status": "failed_bad_credentials",
            "ip_address": ip_address,
            "user_agent": user_agent,
        }
        data.setdefault("login_history", []).append(login_record)
        save_data(data)
        raise AppException("Invalid email or password.", status_code=401)

    # Success: update last_login and record login log in JSON
    user_found["last_login"] = now_iso
    login_record = {
        "id": f"log_{uuid.uuid4().hex[:8]}",
        "email": norm_email,
        "timestamp": now_iso,
        "status": "success",
        "ip_address": ip_address,
        "user_agent": user_agent,
    }
    data.setdefault("login_history", []).append(login_record)
    save_data(data)

    token = f"ft_token_{uuid.uuid4().hex}"
    return {
        "user": {
            "id": user_found["id"],
            "name": user_found["name"],
            "email": user_found["email"],
            "created_at": user_found.get("created_at"),
            "last_login": user_found.get("last_login"),
        },
        "token": token,
    }


def get_stored_login_data() -> dict[str, Any]:
    """Retrieve full login data stored in JSON (safe view with passwords masked)."""
    data = ensure_data_file()
    safe_users = [
        {
            "id": u["id"],
            "name": u["name"],
            "email": u["email"],
            "created_at": u.get("created_at"),
            "last_login": u.get("last_login"),
        }
        for u in data.get("users", [])
    ]
    return {
        "file_path": str(LOGIN_DATA_FILE),
        "total_registered_users": len(safe_users),
        "total_login_events": len(data.get("login_history", [])),
        "users": safe_users,
        "recent_logins": data.get("login_history", [])[-20:],
    }
