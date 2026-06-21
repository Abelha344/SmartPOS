from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

from corsheaders.defaults import default_headers
from dotenv import load_dotenv

load_dotenv(BASE_DIR / ".env", override=True)

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "unsafe-dev-secret-change-in-production")
DEBUG = os.getenv("DJANGO_DEBUG", "True") == "True"
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "*").split(",")
CSRF_TRUSTED_ORIGINS = os.getenv("CSRF_TRUSTED_ORIGINS", "http://localhost:5173").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "apps.catalog",
    "apps.payments",
    "apps.users",
    "apps.transactions",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.transactions.middleware.IdempotencyMiddleware",
]

ROOT_URLCONF = "smartpos.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "smartpos.wsgi.application"
ASGI_APPLICATION = "smartpos.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "smartpos"),
        "USER": os.getenv("POSTGRES_USER", "smartpos"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "smartpos"),
        "HOST": os.getenv("POSTGRES_HOST", "127.0.0.1"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
    }
}

_postgres_host = DATABASES["default"]["HOST"]
if os.getenv("POSTGRES_SSL", "").lower() in ("require", "true", "1") or "neon.tech" in _postgres_host:
    DATABASES["default"]["OPTIONS"] = {"sslmode": "require"}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
        "OPTIONS": {
            "location": MEDIA_ROOT,
            "base_url": MEDIA_URL,
        },
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

_cloudinary_url = os.getenv("CLOUDINARY_URL", "").strip()
_cloudinary_cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "").strip()
_cloudinary_api_key = os.getenv("CLOUDINARY_API_KEY", "").strip()
_cloudinary_api_secret = os.getenv("CLOUDINARY_API_SECRET", "").strip()
_use_cloudinary = bool(
    _cloudinary_url
    or (_cloudinary_cloud_name and _cloudinary_api_key and _cloudinary_api_secret)
)

if _use_cloudinary:
    INSTALLED_APPS.insert(INSTALLED_APPS.index("django.contrib.staticfiles"), "cloudinary_storage")
    INSTALLED_APPS.insert(INSTALLED_APPS.index("cloudinary_storage") + 1, "cloudinary")
    CLOUDINARY_STORAGE = {
        "SECURE": True,
        "MEDIA_TAG": "smartpos_products",
    }
    if _cloudinary_url:
        CLOUDINARY_STORAGE["CLOUDINARY_URL"] = _cloudinary_url
    else:
        CLOUDINARY_STORAGE["CLOUD_NAME"] = _cloudinary_cloud_name
        CLOUDINARY_STORAGE["API_KEY"] = _cloudinary_api_key
        CLOUDINARY_STORAGE["API_SECRET"] = _cloudinary_api_secret
    STORAGES["default"] = {
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
    }

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "users.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/1").strip()
_use_redis = REDIS_URL and "127.0.0.1" not in REDIS_URL and "localhost" not in REDIS_URL

if _use_redis:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
            },
            "KEY_PREFIX": "smartpos",
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "smartpos-idempotency",
        }
    }

FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")

CORS_ALLOWED_ORIGINS = os.getenv(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174"
).split(",")
CORS_ALLOW_HEADERS = (
    *default_headers,
    "x-idempotency-key",
)

DEFAULT_CURRENCY = os.getenv("DEFAULT_CURRENCY", "ETB")

CHAPA_SECRET_KEY = os.getenv("CHAPA_SECRET_KEY", "")
CHAPA_PUBLIC_KEY = os.getenv("CHAPA_PUBLIC_KEY", "")
CHAPA_WEBHOOK_SECRET = os.getenv("CHAPA_WEBHOOK_SECRET", "")
CHAPA_BASE_URL = os.getenv("CHAPA_BASE_URL", "https://api.chapa.co/v1")
CHAPA_MOCK_MODE = os.getenv("CHAPA_MOCK_MODE", "False") == "True"
CHAPA_RETURN_URL = os.getenv("CHAPA_RETURN_URL", "http://localhost:5173/checkout/payment-return")
CHAPA_CALLBACK_URL = os.getenv("CHAPA_CALLBACK_URL", "http://127.0.0.1:8000/api/v1/payments/chapa/webhook/")

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
