import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Secrets come from backend/.env on your computer, or from the host's settings
# once deployed. They are never written in this file.
load_dotenv(BASE_DIR / ".env")


def required_setting(name):
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"{name} is missing. Copy backend/.env.example to backend/.env and fill it in.")
    return value


def list_setting(name):
    return [item.strip() for item in os.environ.get(name, "").split(",") if item.strip()]


SECRET_KEY = required_setting("DJANGO_SECRET_KEY")
DEBUG = os.environ.get("DJANGO_DEBUG") == "true"
ALLOWED_HOSTS = list_setting("DJANGO_ALLOWED_HOSTS")
CORS_ALLOWED_ORIGINS = list_setting("CORS_ALLOWED_ORIGINS")

INSTALLED_APPS = [
    "corsheaders",
    "accounts.apps.AccountsConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django_mongodb_backend",
        "HOST": required_setting("MONGODB_URI"),
        "NAME": "fishlens",
    },
}

DEFAULT_AUTO_FIELD = "django_mongodb_backend.fields.ObjectIdAutoField"

USE_TZ = True
