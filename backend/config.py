
import os
from dotenv import load_dotenv

# The basedir is the directory where this config.py file is located.
basedir = os.path.abspath(os.path.dirname(__file__))

# Load the .env file from the same directory as config.py
load_dotenv(os.path.join(basedir, '.env'))

class Config:
    """Flask configuration variables."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'a_super_secret_dev_key_that_is_long_and_secure')
    # Path to the SQLite database file. It will be created in the `backend` directory.
    # This is a more reliable location than the system's root directory.
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///' + os.path.join(basedir, 'mydatabase.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Firebase Admin SDK Configuration
    # IMPORTANT: Create a service account in your Firebase project and download the JSON key.
    # Set the path to this file in your .env file.
    FIREBASE_ADMIN_SDK_PATH = os.environ.get('FIREBASE_ADMIN_SDK_PATH')
    
    S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME')
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    AWS_DEFAULT_REGION = os.environ.get('AWS_DEFAULT_REGION')

    # Domain configuration
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://hustloop.com')
    BACKEND_URL = os.environ.get('BACKEND_URL', 'https://api.hustloop.com')
    
    # Email SMTP configuration
    MAIL_SERVER = os.environ.get('MAIL_SERVER')
    MAIL_PORT = os.environ.get('MAIL_PORT', 587)
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')

    
