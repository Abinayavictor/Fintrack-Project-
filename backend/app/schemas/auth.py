"""Pydantic schemas for User Login and Registration."""

from pydantic import BaseModel, Field, field_validator


class LoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=1, description="Account password")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        stripped = v.strip().lower()
        if "@" not in stripped or "." not in stripped:
            raise ValueError("Please provide a valid email address.")
        return stripped


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Full name")
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="Password (at least 6 characters)")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Name cannot be empty.")
        return stripped

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        stripped = v.strip().lower()
        if "@" not in stripped or "." not in stripped:
            raise ValueError("Please provide a valid email address.")
        return stripped


class AuthUser(BaseModel):
    id: str
    name: str
    email: str
    created_at: str | None = None
    last_login: str | None = None


class AuthResponse(BaseModel):
    success: bool = True
    user: AuthUser
    token: str
