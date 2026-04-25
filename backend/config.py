import os
import urllib


def _csv_env(name: str, default: str):
    raw = os.environ.get(name, default)
    return [item.strip() for item in raw.split(',') if item.strip()]


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-only-secret-change-me')
    JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-only-jwt-secret-change-me')
    JWT_EXPIRY_HOURS = 8
    CORS_ORIGINS = _csv_env('CORS_ORIGINS', 'http://localhost:3000')

    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SMTP_HOST = os.environ.get('SMTP_HOST')
    SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
    SMTP_USERNAME = os.environ.get('SMTP_USERNAME')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD')
    SMTP_USE_TLS = os.environ.get('SMTP_USE_TLS', 'true').lower() == 'true'
    MAIL_SENDER = os.environ.get('MAIL_SENDER', SMTP_USERNAME or 'no-reply@coffeeshop.local')
    SHOP_NAME = os.environ.get('SHOP_NAME', 'Coffee Shop')


class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False
    SECRET_KEY = os.environ.get('SECRET_KEY')
    JWT_SECRET = os.environ.get('JWT_SECRET')
    CORS_ORIGINS = _csv_env('CORS_ORIGINS', '')