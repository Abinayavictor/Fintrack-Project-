"""Authentication router supporting JSON-persisted user logins and audit logs."""

from fastapi import APIRouter, Request, status

from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest
from app.services.auth_service import (
    get_stored_login_data,
    login_user,
    register_user,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=AuthResponse, status_code=status.HTTP_200_OK)
def login(payload: LoginRequest, request: Request):
    """Log in user and record the login attempt in backend JSON file."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "unknown")

    result = login_user(
        email=payload.email,
        password=payload.password,
        ip_address=client_ip,
        user_agent=user_agent,
    )
    return AuthResponse(
        success=True,
        user=result["user"],
        token=result["token"],
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request):
    """Register a new user and persist credentials in backend JSON file."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "unknown")

    result = register_user(
        name=payload.name,
        email=payload.email,
        password=payload.password,
        ip_address=client_ip,
        user_agent=user_agent,
    )
    return AuthResponse(
        success=True,
        user=result["user"],
        token=result["token"],
    )


@router.get("/login-data")
def inspect_login_data():
    """Retrieve the JSON file records proving login data is stored in the backend."""
    return get_stored_login_data()
