from flask import Flask, jsonify,render_template,Response


from .extensions import db, bcrypt, cors, migrate,socketio
from .api.routes import api_bp
from .models import User
import os
import logging
from logging.handlers import RotatingFileHandler
import firebase_admin
from firebase_admin import credentials
from datetime import datetime
from dotenv import load_dotenv
import boto3
from flasgger import Swagger
import yaml

def setup_loggers(app):
    """Configures the loggers for the application with rotation and proper formatting."""
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    log_dir = os.path.join(backend_dir, 'logs')
    
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    # General App Logger
    app_log_handler = RotatingFileHandler(
        os.path.join(log_dir, 'app.log'),
        maxBytes=1024 * 1024 * 10,  # 10MB
        backupCount=10
    )
    app_log_handler.setFormatter(logging.Formatter(
        '%(asctime)s [%(process)d] %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    app_log_handler.setLevel(logging.INFO)
    
    # Prevent duplicate handlers
    if not any(
        isinstance(h, RotatingFileHandler) and 
        h.baseFilename == app_log_handler.baseFilename 
        for h in app.logger.handlers
    ):
        app.logger.addHandler(app_log_handler)
    app.logger.setLevel(logging.INFO)
    
    # Contact Form Logger
    contact_logger = logging.getLogger('contact_form')
    contact_logger.setLevel(logging.INFO)
    contact_log_handler = RotatingFileHandler(
        os.path.join(log_dir, 'contact_submissions.log'),
        maxBytes=1024 * 1024 * 5,  # 5MB
        backupCount=5
    )
    contact_log_handler.setFormatter(
        logging.Formatter('%(asctime)s [%(process)d] --- %(message)s')
    )
    if not any(
        isinstance(h, RotatingFileHandler) and 
        h.baseFilename == contact_log_handler.baseFilename 
        for h in contact_logger.handlers
    ):
        contact_logger.addHandler(contact_log_handler)

def validate_config(app):
    """Validate required configuration values."""
    required_keys = [
        'SECRET_KEY',
        'SQLALCHEMY_DATABASE_URI',
        'FIREBASE_ADMIN_SDK_PATH',
        'MAIL_SERVER',
        'MAIL_PORT'
    ]
    
    missing = [key for key in required_keys if not app.config.get(key)]
    if missing:
        raise RuntimeError(f"Missing required config keys: {', '.join(missing)}")

def initialize_firebase(app):
    """Initialize Firebase Admin SDK with proper configuration."""
    firebase_initialized = False
    try:
        if not firebase_admin._apps:
            sdk_path = app.config.get('FIREBASE_ADMIN_SDK_PATH')
            
            if sdk_path and os.path.exists(sdk_path):
                cred = credentials.Certificate(sdk_path)
                firebase_config = {
                    'storageBucket': app.config.get('FIREBASE_STORAGE_BUCKET')
                }
                firebase_admin.initialize_app(cred, firebase_config)
                firebase_initialized = True
                app.logger.info('Firebase Admin SDK initialized successfully')
            else:
                app.logger.warning('Firebase credentials not found at configured path')
        else:
            firebase_initialized = True
            app.logger.info('Firebase already initialized')
    except Exception as e:
        app.logger.error(f"Firebase initialization failed: {str(e)}")
        if 'FIREBASE_ADMIN_SDK_PATH' in os.environ:
            raise RuntimeError("Firebase initialization failed but FIREBASE_ADMIN_SDK_PATH is set")
    
    app.config['FIREBASE_INITIALIZED'] = firebase_initialized
    return firebase_initialized



def create_app(config_class='config.Config'):
    """
    Creates and configures the Flask application using the factory pattern.
    
    Args:
        config_class: Configuration class to load (defaults to config.Config)
    
    Returns:
        Flask application instance
    """
    app = Flask(__name__)
    
    # Load OpenAPI spec directly
    
    # openapi_path = 'C:/Users/Mr Bob/Desktop/hustloop/backend/openapi.yaml'
    # with open(openapi_path, 'r') as f:
    #     swagger_template = yaml.safe_load(f)
    
    # swagger_config = {
    #     "headers": [],
    #     "specs": [
    #         {
    #             "endpoint": 'apispec',
    #             "route": '/apispec.json',
    #             "rule_filter": lambda rule: True,  # all in
    #             "model_filter": lambda tag: True,  # all in
    #         }
    #     ],
    #     "static_url_path": "/flasgger_static",
    #     "swagger_ui": True,
    #     "specs_route": "/apidocs/",
    #     "uiversion": 3,
    #     "openapi": "3.0.3"
    # }

    # Swagger(app, template=swagger_template, config=swagger_config, merge=True)
    
    
    try:
        app.config.from_object(config_class)
    except Exception as e:
        app.logger.error(f"Error loading config class {config_class}: {e}")
        raise


    app.config['ENV'] = os.getenv('FLASK_ENV', 'production')
    
    app.config['AWS_ACCESS_KEY_ID'] = os.getenv('AWS_ACCESS_KEY_ID')
    app.config['AWS_SECRET_ACCESS_KEY'] = os.getenv('AWS_SECRET_ACCESS_KEY')
    app.config['AWS_DEFAULT_REGION'] = os.getenv('AWS_DEFAULT_REGION')
    app.config['S3_BUCKET_NAME'] = os.getenv('S3_BUCKET_NAME')

    
    app.logger.info("AWS configuration loaded into app.config:")
    app.logger.info(f"  AWS_ACCESS_KEY_ID loaded: {'Yes' if app.config['AWS_ACCESS_KEY_ID'] else 'No'}")
    app.logger.info(f"  AWS_SECRET_ACCESS_KEY loaded: {'Yes' if app.config['AWS_SECRET_ACCESS_KEY'] else 'No'}")
    app.logger.info(f"  AWS_DEFAULT_REGION: {app.config['AWS_DEFAULT_REGION']}")
    app.logger.info(f"  S3_BUCKET_NAME: {app.config['S3_BUCKET_NAME']}")
    
    if all([
        app.config['AWS_ACCESS_KEY_ID'],
        app.config['AWS_SECRET_ACCESS_KEY'],
        app.config['AWS_DEFAULT_REGION'],
        app.config['S3_BUCKET_NAME']
    ]):
        s3_client = boto3.client(
            's3',
            aws_access_key_id=app.config['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=app.config['AWS_SECRET_ACCESS_KEY'],
            region_name=app.config['AWS_DEFAULT_REGION'],
            config=boto3.session.Config(signature_version='s3v4')
        )
        app.config['S3_CLIENT'] = s3_client
        app.logger.info("S3 client initialized and stored in app.config")
    else:
        app.config['S3_CLIENT'] = None
        app.logger.warning("Missing one or more AWS env variables. S3 client not initialized.")
    
    


    
    # Rate limiting configuration
    app.config['RATE_LIMITS'] = {
        'production': {
            'auth': '5 per minute',
            'contact': '2 per minute',
            'api': '100 per minute'
        },
        'development': {
            'auth': '50 per minute',
            'contact': '20 per minute',
            'api': '1000 per minute'
        }
    }

    # Force HTTPS in production environments
    if app.config['ENV'] == 'production' or 'DYNO' in os.environ:
        app.config['PREFERRED_URL_SCHEME'] = 'https'
        app.config['SESSION_COOKIE_SECURE'] = True
        app.config['REMEMBER_COOKIE_SECURE'] = True

    # Validate configuration before proceeding
    validate_config(app)

    # Initialize Firebase
    initialize_firebase(app)

    # Initialize extensions
    db.init_app(app)
    bcrypt.init_app(app)
    with app.app_context():
        db.create_all()  # create tables if they don't exist
    
    # Configure CORS
    cors_config = {
        r"/api/*": {
            "origins": app.config.get('ALLOWED_ORIGINS', '*'),
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": app.config.get('CORS_SUPPORTS_CREDENTIALS', False)
        },
    }
    
    cors.init_app(app, resources=cors_config)
    socketio.init_app(app, cors_allowed_origins=["https://hustloop.com", "https://www.hustloop.com"])
    
    migrate.init_app(app, db)

    # Register blueprints
    app.register_blueprint(api_bp, url_prefix='/api')

    # Configure logging
    if not app.debug and not app.testing:
        setup_loggers(app)
        app.logger.info('Hustloop backend startup')

    # ======================
    # Application Routes
    # ======================

    @app.route('/')
    def index():
        """Root endpoint that returns basic application information."""
        if app.config['ENV'] == 'production':
            return '', 403
        else:
            return jsonify({
                'message': 'Hustloop Flask API is running.',
                'status': 'operational',
                'timestamp': datetime.utcnow().isoformat(),
                'environment': app.config['ENV']
            })

    @app.route('/health')
    def health_check():
        
        firebase_ok = app.config.get('FIREBASE_INITIALIZED')
        overall_status = 'healthy' if firebase_ok else 'unhealthy'

        return render_template(
            'health.html',
            logo_url="/static/images/logo.png",
            frontend_url="https://hustloop.com",
            overall_status=overall_status,
            env=app.config['ENV']
        ), (200 if overall_status == 'healthy' else 503)

    @app.after_request
    def add_security_headers(response):
        """Add security headers to all responses."""
        security_headers = {
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'SAMEORIGIN',
	    'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:;",
            'Server': 'Hustloop/1.0'
        }
        
        # Add headers one by one to avoid the unpacking error
        for header, value in security_headers.items():
            response.headers[header] = value
        
        return response

    # ======================
    # Error Handlers
    # ======================

    @app.errorhandler(400)
    def bad_request_error(error):
        return jsonify({
            'error': 'Bad request',
            'message': str(error),
            'status_code': 400
        }), 400

    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({
            'error': 'Not found',
            'message': 'The requested resource was not found',
            'status_code': 404
        }), 404

    @app.errorhandler(500)
    def internal_error(error):
        app.logger.error(f"Server error: {str(error)}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'An unexpected error occurred',
            'status_code': 500
        }), 500

    # Initialize scheduler for various tasks
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        init_scheduler(app)
    elif not app.debug:
        init_scheduler(app)

    return app


def init_scheduler(app):
    """Initialize the background scheduler for various daily checks"""
    import os
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger
    from .subscription_tasks import check_and_notify_subscriptions
    from .tasks import check_collaboration_timelines, check_collaboration_status
    
    scheduler = BackgroundScheduler()

    def run_with_context(func):
        """Wrapper to ensure jobs run within the Flask application context"""
        def wrapper():
            with app.app_context():
                try:
                    func()
                except Exception as e:
                    app.logger.error(f"Scheduler Job Error ({func.__name__}): {str(e)}")
        return wrapper
    
    # 1. Check and notify subscriptions (1:30 AM IST)
    scheduler.add_job(
        func=run_with_context(check_and_notify_subscriptions),
        trigger=CronTrigger(hour=1, minute=30, timezone='Asia/Kolkata'),
        id='check_subscriptions',
        name='Check and notify subscriptions',
        replace_existing=True
    )

    # 2. Check collaboration status (1:40 AM IST)
    scheduler.add_job(
        func=run_with_context(check_collaboration_status),
        trigger=CronTrigger(hour=1, minute=40, timezone='Asia/Kolkata'),
        id='check_collab_status',
        name='Update expired collaborations to stopped',
        replace_existing=True
    )

    # 3. Check collaboration timelines (1:50 AM IST)
    scheduler.add_job(
        func=run_with_context(check_collaboration_timelines),
        trigger=CronTrigger(hour=1, minute=50, timezone='Asia/Kolkata'),
        id='check_collab_timelines',
        name='Send timeline notifications and announcements',
        replace_existing=True
    )
    
    scheduler.start()
    
    # Shutdown scheduler when app stops
    import atexit
    atexit.register(lambda: scheduler.shutdown())   
    
    app.logger.info("Scheduler initialized - Jobs scheduled (IST): Subscriptions: 1:05 AM, Collab Status: 1:07 AM, Timeline: 1:09 AM")

def check_db_connection(db):
    """Check if database connection is working."""
    try:
        db.session.execute('SELECT 1')
        return True
    except Exception as e:
        return False
