
"""
API Blueprint for Hustloop Platform

- All endpoints return standardized JSON responses.
- All user input is validated and sanitized.
- All sensitive actions are rate-limited per user/email.
- All admin actions require appropriate permissions.
- For API documentation, consider using Flask-RESTX or Swagger/OpenAPI.
"""

import os
import re
import uuid
import logging
import threading
import boto3
from datetime import datetime, timedelta,timezone, date, time, timedelta 
from dateutil.relativedelta import relativedelta
from flask import Blueprint, json, request, jsonify, current_app, render_template_string
from app.extensions import socketio
from flask_socketio import join_room,leave_room
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from marshmallow import Schema, fields, ValidationError, EXCLUDE
from bleach import clean
from markupsafe import escape
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import aliased,joinedload
from sqlalchemy import or_
import html
from flask_cors import cross_origin
import jwt
import firebase_admin
from firebase_admin import auth
from itsdangerous.url_safe import URLSafeTimedSerializer

from firebase_admin.exceptions import FirebaseError
from enum import Enum
from math import ceil
from sqlalchemy import func,extract
import werkzeug.datastructures
from werkzeug.utils import secure_filename
import pytz
import markdown
from dotenv import load_dotenv
import secrets, string,random
from dateutil.relativedelta import relativedelta

from ..extensions import db, bcrypt
from ..models import IST, UserPaymentMethod,Announcement,TeamSolutionMembers,TeamInvite,PitchingToken, NeedInfoComment , Comment ,CollaborationStatus,QAItem,ConnextRegistration,Sector,Solution,File,TechnologyArea,DraftTechTransferIP, TechTransferIP,TechTransferIPRestore,MSMEProfile,ApprovalStatus, User, NewsletterSubscriber, BlogPost, EducationProgram, Plan, Coupon, PricingHistory,AigniteRegistration,Collaboration, PitchingDetails, SolutionStatus, PaymentMethod, PaymentCategory
from ..utils import generate_token, get_current_user, send_email, validate_email_mx
from ..decorators import get_current_user_id, role_required, token_required
from .static_data import get_static_data, education_programs_data, incubators_data, msme_collaborations_data, mentors_data,sector_data
from datetime import datetime, timedelta, timezone
from dateutil.relativedelta import relativedelta

# --- ENUMS FOR ROLES AND STATUS ---

class UserRole(Enum):
    ADMIN = 'admin'
    FOUNDER = 'founder'
    MENTOR = 'mentor'
    INCUBATOR = 'incubator'
    ORGANIZATION = 'organisation'

class UserStatus(Enum):
    ACTIVE = 'active'
    BANNED = 'banned'
    INACTIVE = 'inactive'
    
STATUS_COLOR_MAP = {
    "new": "#3B82F6",                
    "under_review": "#EAB308",       
    "duplicate": "#A855F7",          
    "rejected": "#EF4444",           
    "solution_accepted_points": "#0D9488",  
    "triaged": "#F97316",            
    "need_info": "#3B82F6",   
    "winner": "#16A34A",        
}

# --- CONFIGURABLE PAGINATION DEFAULT ---
PAGINATION_DEFAULT = int(os.getenv("PAGINATION_DEFAULT", 10))
PAGINATION_MAX = int(os.getenv("PAGINATION_MAX", 100))

api_bp = Blueprint('api', __name__)


basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
env_path = os.path.join(basedir, '.env')
load_dotenv(env_path)


# Initialize rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[
        os.getenv("RATE_LIMIT_DAILY", "200 per day"),
        os.getenv("RATE_LIMIT_HOURLY", "50 per hour")
    ]
)

contact_logger = logging.getLogger('contact_form')

s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=os.getenv('AWS_DEFAULT_REGION'),
    config=boto3.session.Config(signature_version='s3v4')
)

S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME')

MAX_TITLE_LENGTH = 300
MAX_DESCRIPTION_LENGTH = 15000
MAX_CONTACT_NAME_LENGTH = 300
MAX_SECTOR_LENGTH = 300
MAX_TECH_AREA_LENGTH = 300

# --- UTILITY FUNCTIONS ---

ALLOWED_MIME = {"application/pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  
MAX_FILES = 5

IST1 = timezone(timedelta(hours=5, minutes=30))

def is_valid_email(email):
    return re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email)

def error_response(message, status=400, details=None):
    resp = {'success': False, 'error': message}
    if details:
        resp['details'] = details
    return jsonify(resp), status

def success_response(message, status=200, **kwargs):
    resp = {'success': True, 'message': message}
    resp.update(kwargs)
    return jsonify(resp), status

def sanitize_input(text):
    if not text:
        return text
    return escape(clean(str(text), tags=[], strip=True))

def safe_log(message, sensitive_data=None):
    if sensitive_data:
        if isinstance(sensitive_data, dict):
            sensitive_keys = ['password', 'token', 'secret', 'credit_card']
            redacted_data = {k: '***REDACTED***' if k in sensitive_keys else v 
                             for k, v in sensitive_data.items()}
            message = message.replace(str(sensitive_data), str(redacted_data))
        else:
            message = message.replace(str(sensitive_data), '***')
    current_app.logger.info(message)


def validate_password_strength(password):
    if not password:
        return False, "Password is required"
    if len(password) < 10:
        return False, "Password must be at least 10 characters long"
    if not re.search(r'[A-Za-z]', password):
        return False, "Password must contain at least one letter"
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one number"
    return True, "Password is valid"

# --- JWT Token Generation and Refresh ---

def generate_secure_token(payload, expires_in_seconds=8 * 3600):  
    MAX_EXPIRY = 8 * 3600  
    if expires_in_seconds > MAX_EXPIRY:
        expires_in_seconds = MAX_EXPIRY  

    now = datetime.utcnow()
    secure_payload = {
        **payload,
        'exp': now + timedelta(seconds=expires_in_seconds),
        'iat': now,
        'jti': str(uuid.uuid4())
    }

    return jwt.encode(
        secure_payload,
        current_app.config['SECRET_KEY'],
        algorithm='HS256'
    )


def generate_refresh_token(payload, expires_in_days=7):
    secure_payload = {
        **payload,
        'exp': datetime.utcnow() + timedelta(days=expires_in_days),
        'iat': datetime.utcnow(),
        'jti': str(uuid.uuid4()),
        'type': 'refresh'
    }
    return jwt.encode(secure_payload, current_app.config['SECRET_KEY'], algorithm='HS256')

def format_datetime(dt):
    day = dt.day
    suffix = "th" if 11 <= day <= 13 else {1:"st", 2:"nd", 3:"rd"}.get(day % 10, "th")
    return dt.strftime(f"%B {day}{suffix} %Y, %I:%M %p")

def founder_msme(user):
    if user.role == "admin" or user.role == "organisation":
        return True

    if user.role == "founder":
        return user.founder_role == "Solve Organisation's challenge"
    
    return False

@api_bp.route('/refresh-token', methods=['POST'])
def refresh_token():
    try:
        refresh_token = request.cookies.get('refresh_token') or request.json.get('refresh_token')
        if not refresh_token:
            return error_response('Refresh token missing', 401)
        try:
            decoded = jwt.decode(refresh_token, current_app.config['SECRET_KEY'], algorithms=['HS256'],leeway=10)
            if decoded.get('type') != 'refresh':
                return error_response('Invalid refresh token', 401)
            user = User.query.filter_by(uid=decoded.get('user_id')).first()
            if not user:
                return error_response('User not found', 404)
            # Optionally: check if token is revoked (e.g., user.refresh_token_jti == decoded['jti'])
            access_token = generate_secure_token({'user_id': user.uid, 'role': user.role})
            return success_response('Token refreshed', token=access_token)
        except jwt.ExpiredSignatureError:
            return error_response('Refresh token expired', 401)
        except Exception as e:
            safe_log(f"Refresh token error: {type(e).__name__}: {e}")
            return error_response('Invalid refresh token', 401)
    except Exception as e:
        safe_log(f"Refresh token endpoint error: {type(e).__name__}: {e}")
        return error_response('Unable to refresh token', 500)

# --- Example: Issue refresh token on login ---
# In the login route, after successful login:
# refresh_token = generate_refresh_token({'user_id': user.uid, 'role': user.role})
# response = success_response(...)
# response.set_cookie('refresh_token', refresh_token, httponly=True, samesite='Lax', max_age=60*60*24*7)
# return response

# --- Invalidate refresh tokens on logout or password change ---
@api_bp.route('/logout', methods=['POST'])
@token_required
def logout():
    try:
        response = success_response('Logged out successfully')
        response.set_cookie('refresh_token', '', expires=0)
        # Optionally: mark refresh token as revoked in DB (e.g., user.refresh_token_jti = None)
        return response
    except Exception as e:
        safe_log(f"Logout error: {type(e).__name__}: {e}")
        return error_response('Unable to logout', 500)

def verify_token(token):
    try:
        return jwt.decode(token, current_app.config['SECRET_KEY'],algorithms=['HS256'],leeway=10)
    except jwt.ExpiredSignatureError:
        raise ValidationError("Token expired")
    except jwt.InvalidTokenError:
        raise ValidationError("Invalid token")
    

# --- VALIDATION SCHEMAS ---

class ContactSchema(Schema):
    fullName = fields.Str(required=True, validate=lambda x: 2 <= len(x) <= 100)
    email = fields.Email(required=True)
    subject = fields.Str(required=True, validate=lambda x: 5 <= len(x) <= 200)
    message = fields.Str(required=True, validate=lambda x: 10 <= len(x) <= 1000)
    phone = fields.Str(required=False, allow_none=True)

def password_strength(value):
    if len(value) < 8:
        raise ValidationError("Password must be at least 8 characters long.")
    if not re.search(r'[A-Za-z]', value):
        raise ValidationError("Password must contain at least one letter.")
    if not re.search(r'[0-9]', value):
        raise ValidationError("Password must contain at least one number.")

class RegistrationSchema(Schema):
    email = fields.Email(required=True, error_messages={"invalid": "Email must be a valid address."})
    password = fields.Str(required=True, validate=password_strength)
    name = fields.Str(required=True, validate=lambda x: 2 <= len(x) <= 100)

class NewsletterSchema(Schema):
    email = fields.Email(required=True)

class ProfileUpdateSchema(Schema):
    name = fields.Str(required=True, validate=lambda x: 2 <= len(x) <= 100)

# --- SECURITY MIDDLEWARE ---

@api_bp.after_request
def apply_security_headers(response):
    """Apply security headers to all responses, ensuring no header conflicts."""
    security_headers = {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'",
        'Server': 'Hustloop/1.0',
        'Permissions-Policy': 'geolocation=(), microphone=()'
    }

    # Skip if response already has these headers
    existing_headers = set(response.headers.keys())
    
    for header, value in security_headers.items():
        if header not in existing_headers:
            try:
                response.headers[header] = value
            except Exception as e:
                current_app.logger.error(f"Failed to set header {header}: {str(e)}")
                continue
    
    # Ensure no duplicate headers
    response.headers = werkzeug.datastructures.Headers(response.headers)
    
    return response

# --- AUTH ROUTES ---

@api_bp.errorhandler(ValidationError)
def handle_validation_error(e):
    """Standardized handler for Marshmallow validation errors."""
    current_app.logger.error(f"ValidationError: {e}")
    return error_response('Validation failed', 400, e.messages)

@api_bp.route('/register', methods=['POST'])
@limiter.limit("3 per minute")
def register():
    """
    Register a new user.
    Returns a generic message to avoid email enumeration.
    """
    try:
        data = request.get_json()
        schema = RegistrationSchema()
        try:
            validated_data = schema.load(data)
        except ValidationError as err:
            return error_response('Registration failed. If this email is registered, you will receive an email.', 200)
        email = sanitize_input(validated_data['email'].lower().strip())
        name = sanitize_input(validated_data['name'])
        password = validated_data['password']
        try:
            firebase_user = auth.get_user_by_email(email)

            return error_response("Email is already Exists.", 200)
        except auth.UserNotFoundError:
            pass
        except Exception as e:
            safe_log(f"Firebase check error during registration: {type(e).__name__}: {e}", email)
            return error_response('Registration failed. If this email is registered, you will receive an email.', 200)
        if User.query.filter_by(email=email).first():
            return error_response("Email is already Exists.", 200)
        try:
            new_firebase_user = auth.create_user(
                email=email,
                password=password,
                display_name=name,
                email_verified=False
            )
            new_user = User(
                uid=new_firebase_user.uid,
                email=email,
                name=name,
                auth_provider='local',
                role=None,
                founder_role=None,
                status='inactive',
                has_subscription=False
            )
            db.session.add(new_user)
            db.session.commit()

            action_code_settings = auth.ActionCodeSettings(
                url=f"{current_app.config['FRONTEND_URL']}/auth/action",
                handle_code_in_app=True,
            )
            firebase_link = auth.generate_email_verification_link(email, action_code_settings)
            
            html_body = f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; 
                        background-color: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 8px;">
                        <!-- Logo or Banner -->
                        <div style="text-align: center; margin-bottom: 20px;">
                            <img src="https://api.hustloop.com/static/images/logo.png" alt="Hustloop Logo" width="150" style="border-radius: 8px;">
                        </div>
        
                        <h2 style="color: #2c3e50; text-align: center;">Welcome to Hustloop!</h2>
                        <p>Hi {name},</p>
                        <p>We're excited to have you join our community. To keep your account secure and unlock all features, please verify your email address.</p>
        
                        <div style="margin: 30px 0; text-align: center;">
                            <a href="{firebase_link}" 
                                    style="background-color: #007bff; color: #ffffff; padding: 12px 20px; 
                                    text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                        Verify My Email
                            </a>
                        </div>
        
                            <p>If you didn't sign up for Hustloop, you can safely ignore this email.</p>
                            
                        

                    <div style="text-align:center; margin-top:20px;">
                    
                    <!-- Tagline -->
                    <p style="color:#555; font-size:14px; margin-bottom:15px;">
                        Connect with us on social media
                    </p>

                    <!-- Social Links -->
                        <div style="margin-bottom:20px;">
                            <a href="https://www.linkedin.com/company/hustloop" style="margin:0 12px; text-decoration:none; color:#555; font-size:14px;">
                            <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" 
                                alt="LinkedIn" width="24" height="24" style="vertical-align:middle; margin-right:6px;" />
                            </a>
                            <a href="#" style="margin:0 12px; text-decoration:none; color:#555; font-size:14px;">
                            <img src="https://cdn-icons-png.flaticon.com/512/5968/5968958.png" 
                                alt="X" width="24" height="24" style="vertical-align:middle; margin-right:6px;" />
                            </a>
                        </div>
                    </div>
                    <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />
                    <p style="font-size: 12px; color: #777; text-align: center;">
                        Need help? Contact our support team anytime at 
                        <a href="mailto:support@hustloop.com">support@hustloop.com</a>.
                    </p>
                    </div>
                    """
            send_email(
                subject="Verify your Hustloop account",
                recipients=[email],
                html_body=html_body,
                sender=('Hustloop', current_app.config['MAIL_USERNAME'])
            )

            safe_log(f"User registered successfully: {email}")
        except Exception as e:
            safe_log(f"Registration error: {type(e).__name__}: {e}", email)
            if 'new_firebase_user' in locals():
                try:
                    auth.delete_user(new_firebase_user.uid)
                except Exception as ex:
                    safe_log(f"Error deleting Firebase user after registration failure: {type(ex).__name__}: {ex}")
            db.session.rollback()
        return success_response('Registration successful! Please check your email to verify your account.')
    except Exception as e:
        safe_log(f"Registration error: {type(e).__name__}: {e}")
        return error_response('Registration failed. If this email is registered, you will receive an email.', 200)
    
    
@api_bp.route('/check-token', methods=['GET'])
def check_token():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'valid': False, 'error': 'Missing or invalid Authorization header'}), 401
    token = auth_header.split(" ")[1]
    try:
        payload = verify_token(token)
        return jsonify({'valid': True, 'expired': False,}), 200
    except Exception as e:
        if 'expired' in str(e).lower():
            return jsonify({'valid': False, 'expired': True, 'error': 'Token expired'}), 401
        return jsonify({'valid': False, 'expired': False, 'error': str(e)}), 401

@api_bp.route("/activate-user", methods=["POST"])
@limiter.limit("2 per minute")
def activate_user():
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid token"}), 401

        token = auth_header.split(" ")[1]

        # Verify Firebase token
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token["uid"]

        # Get Firebase user to confirm email_verified
        firebase_user = auth.get_user(uid)

        # Find user in DB
        user = User.query.filter_by(uid=uid).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        if firebase_user.email_verified:
            if user.status != "active":
                user.status = "active"
                db.session.commit()
            return jsonify({"message": "User activated successfully", "status": user.status}), 200
        else:
            return jsonify({"error": "Email not verified yet"}), 400

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@api_bp.route("/check-profile", methods=["GET"])
def check_profile():
    try:
        # Get token from Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid token"}), 401

        token = auth_header.split(" ")[1]

        # Verify Firebase token
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token["uid"]

        # Find user in DB
        user = User.query.filter_by(uid=uid).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Decide response based on profile completeness
        if user.name and user.status == "active":
            return jsonify({"profile_complete": True}), 200
        else:
            # You can send a temporary token (if you want to keep the frontend logic unchanged)
            return jsonify({"profile_complete": False, "token": token}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/resend-verification', methods=['POST'])
@limiter.limit("2 per minute")
def resend_verification():
    try:
        data = request.get_json()
        email = sanitize_input(data.get('email', '').lower().strip())
        if not email or not is_valid_email(email):
            return error_response('Valid email is required.')
        user = User.query.filter_by(email=email).first()
        if not user:
            return error_response('User not found.')
        try:
            user = auth.get_user_by_email(email)
            if user.email_verified:
                return error_response('This email is already verified.')
            action_code_settings = auth.ActionCodeSettings(
                url=f"{current_app.config['FRONTEND_URL']}/auth/action",
                handle_code_in_app=True,
            )
            verification_link = auth.generate_email_verification_link(user.email, action_code_settings)
            verification_link += "&mode=verifyEmail"
            
            html_body = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; 
                background-color: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 8px;">

                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://api.hustloop.com/static/images/logo.png" alt="Hustloop Logo" width="120" style="border-radius: 6px;">
                </div>
        
                <h2 style="color: #333; text-align: center;">Email Verification - Hustloop</h2>
        
                <p style="font-size: 15px; color: #555;">
                    Thank you for signing up! Please click the button below to verify your email address:
                </p>
        
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verification_link}" 
                    style="background-color: #007bff; color: white; padding: 12px 24px; 
                            text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
                        Verify Email
                    </a>
                </div>
        
                <p style="font-size: 14px; color: #555;">
                    If the button doesn’t work, copy and paste this link into your browser:
                </p>
                <p style="word-break: break-all; font-size: 13px; color: #007bff;">
                    {verification_link}
                </p>
        
                <p style="font-size: 13px; color: #777;">
                    🔒 This link will expire in 1 hour for security reasons.
                </p>
                <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />

                    <div style="text-align:center; margin-top:20px;">

                    <!-- Tagline -->
                    <p style="color:#555; font-size:14px; margin-bottom:15px;">
                        Connect with us on social media
                    </p>

                    <!-- Social Links -->
                        <div style="margin-bottom:20px;">
                            <a href="https://www.linkedin.com/company/hustloop" style="margin:0 12px; text-decoration:none; color:#555; font-size:14px;">
                            <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" 
                                alt="LinkedIn" width="24" height="24" style="vertical-align:middle; margin-right:6px;" />
                            </a>
                            <a href="#" style="margin:0 12px; text-decoration:none; color:#555; font-size:14px;">
                            <img src="https://cdn-icons-png.flaticon.com/512/5968/5968958.png" 
                                alt="X" width="24" height="24" style="vertical-align:middle; margin-right:6px;" />
                            </a>
                        </div>
                    </div>
                </div>
            """

            send_email(
                subject="Verify your Hustloop account (New Link)",
                recipients=[user.email],
                html_body=html_body,
                sender=(current_app.config['MAIL_USERNAME'], current_app.config['MAIL_USERNAME'])
            )
            safe_log(f"Verification email resent to: {email}")
        except auth.UserNotFoundError:
            pass
        except Exception as e:
            safe_log(f"Resend verification error: {type(e).__name__}: {e}", email)
        return success_response('If this email is registered, you will receive an email.')
    except Exception as e:
        safe_log(f"Resend verification error: {type(e).__name__}: {e}")
        return success_response('If this email is registered, you will receive an email.')
    
def handle_failed_login(email):
    if not email:
        return
    user = User.query.filter_by(email=email).first()
    if user:
        user.failed_login_attempts += 1
        user.last_failed_login = datetime.utcnow()
        if user.failed_login_attempts >= 5:
            user.account_locked_until = datetime.utcnow() + timedelta(minutes=15)
        db.session.commit()
        safe_log(f"Failed login attempt for {email}. Attempts: {user.failed_login_attempts}")

@api_bp.route('/login', methods=['POST'])
@limiter.limit("5 per minute")
@cross_origin()
def login():
    try:
        auth_header = request.headers.get('Authorization', '')
        data = request.get_json(silent=True) or {}
        device_fingerprint = request.headers.get('X-Device-Fingerprint') or data.get('device_fingerprint')
        if not auth_header.startswith('Bearer '):
            return error_response('Authorization header missing or malformed.', 401)

        id_token = auth_header.split('Bearer ')[-1].strip()
        if not id_token:
            return error_response('ID token is missing.', 401)

        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        sign_in_provider = decoded_token.get('firebase', {}).get('sign_in_provider', 'unknown')
        user_email = sanitize_input(decoded_token.get('email', '').lower().strip())

        user = User.query.filter_by(uid=uid).first()

        try:
            firebase_user = auth.get_user(uid)
        except auth.UserNotFoundError:
            
            if user:
                db.session.delete(user)
                db.session.commit()
                safe_log(f"Orphaned user record deleted for UID: {uid}")
            return error_response('User not found.', 404)


        if not user and user_email:
            existing_user = User.query.filter_by(email=user_email).first()
            if existing_user:
                existing_user.uid = uid
                existing_user.auth_provider = sign_in_provider
                db.session.commit()
                user = existing_user

        if not user:
            user = User(
                uid=uid,
                email=user_email,
                name=sanitize_input(decoded_token.get('name', '')),
                auth_provider=sign_in_provider,
                role=None,
                status='active',
                has_subscription=False,
                is_confirmed=True,
                is_banned=False
            )
            db.session.add(user)
            db.session.commit()


        now = datetime.utcnow()
        if user.account_locked_until and user.account_locked_until > now:
            safe_log(f"Locked out user attempted login: {user.email}")
            return error_response('Account is temporarily locked due to too many failed login attempts. Please try again later.', 403)

        if user.status == 'banned':
            safe_log(f"Banned user attempted login: {user.email}")
            return error_response('This account has been suspended.', 403)

        if not decoded_token.get('email_verified') and user.auth_provider == 'password':
            return error_response('Please verify your email address before logging in.', 403)

        user.failed_login_attempts = 0
        user.account_locked_until = None
        user.last_login = datetime.utcnow()
        db.session.commit()


        if not user.role:
            temp_token = generate_secure_token({'user_id': user.uid}, expires_in_seconds=28800)
            return success_response(
                'complete-profile',
                token=temp_token,
                email=user.email,
                name=user.name
            )

        app_token = generate_secure_token({'user_id': user.uid, 'role': user.role}, expires_in_seconds=28800)

        safe_log(f"User logged in successfully: {user.email} (device: {device_fingerprint})")
        return success_response(
            'Login successful',
            role=user.role,
            token=app_token,
            hasSubscription=user.has_subscription,
            name=user.name,
            email=user.email,
            authProvider=user.auth_provider,
            founder_role=user.founder_role,
            must_reset_password=user.must_reset_password
        )

    except auth.InvalidIdTokenError:
        email = None
        try:
            auth_header = request.headers.get('Authorization', '')
            id_token = auth_header.split('Bearer ')[-1].strip()
            decoded_token = auth.verify_id_token(id_token, check_revoked=False)
            email = sanitize_input(decoded_token.get('email', '').lower().strip())
            user = User.query.filter_by(email=email).first()
            if user:
                user.failed_login_attempts += 1
                user.last_failed_login = datetime.utcnow()
                if user.failed_login_attempts >= 5:
                    user.account_locked_until = datetime.utcnow() + timedelta(minutes=15)
                db.session.commit()
        except Exception:
            pass
        return error_response('Invalid ID token.', 401)
    
    except auth.ExpiredIdTokenError:
        return error_response('ID token has expired. Please log in again.', 401)
    except IntegrityError as db_err:
        safe_log(f"DB error during login: {db_err}")
        db.session.rollback()
        return error_response('Database error during login.', 500)
    except Exception as e:
        
        email = None
        try:
            auth_header = request.headers.get('Authorization', '')
            id_token = auth_header.split('Bearer ')[-1].strip()
            decoded_token = auth.verify_id_token(id_token, check_revoked=False)
            email = sanitize_input(decoded_token.get('email', '').lower().strip())
            user = User.query.filter_by(email=email).first()
            if user:
                user.failed_login_attempts += 1
                user.last_failed_login = datetime.utcnow()
                if user.failed_login_attempts >= 5:
                    user.account_locked_until = datetime.utcnow() + timedelta(minutes=15)
                db.session.commit()
        except Exception:
            pass
        safe_log(f"Login error: {e}")
        return error_response('An unexpected error occurred during login.', 500)
        
@api_bp.route('/check-verification-status', methods=['POST'])
@limiter.limit("10 per minute")
@cross_origin()
def check_verification_status():
    try:
        data = request.get_json()
        email = sanitize_input(data.get('email', '').lower().strip())
        
        # Validate email format
        if not email or not is_valid_email(email):
            return error_response('Valid email is required.', 400)
        
        firebase_user = auth.get_user_by_email(email)
        return success_response('Fetched verification status', email_verified=firebase_user.email_verified)        
    except auth.UserNotFoundError:
        return error_response('User not found.', 404)
    except Exception as e:
        safe_log(f"Error checking verification status: {type(e).__name__}: {e}", email if 'email' in locals() else None)
        return error_response('An unexpected error occurred.', 500)


@api_bp.route('/complete-registration', methods=['POST'])
@cross_origin()
@token_required
def complete_registration():
    try:
        data = request.get_json()
        user_id = request.user_id
        role = sanitize_input(data.get('role', ''))
        founder_role = data.get('founder_role', '').strip()

        if not role or role not in ['founder', 'mentor', 'incubator', 'organisation']:
            return error_response('A valid role is required.', 400)

        if role == 'founder' and not founder_role:
            return error_response('A founder role is required.', 400)

        user = User.query.filter_by(uid=user_id).first()
        
        if not user:
            return error_response('User not found or token is invalid.', 404)

        if user.role:   
            return error_response('This profile has already been completed.', 400)
        
        firebase_user = auth.get_user(user_id)
        if not firebase_user.email_verified:
            return error_response("Email not verified yet.", 400)

        #  Activate user if not already
        if user.status != "active":
            user.status = "active"
        
        user.role = role
        
        if user.auth_provider == "password":
            user.auth_provider = "local"

        if role == "founder":
            user.founder_role = founder_role

        db.session.commit()

        login_token = generate_secure_token({'user_id': user.uid, 'role': user.role}, expires_in_seconds=28800)
        
        safe_log(f"User completed registration: {user.email} as {role}")
        return success_response('Profile completed successfully!', role=user.role, token=login_token, hasSubscription=user.has_subscription, name=user.name, email=user.email, authProvider=user.auth_provider,founder_role=user.founder_role)

    except Exception as e:
        safe_log(f"Complete registration error: {type(e).__name__}: {e}")
        return error_response('An unexpected error occurred.', 500)


# --- CONTACT FORM ROUTE ---

@api_bp.route('/contact', methods=['POST'])
@limiter.limit("2 per minute")
def contact():
    try:
        data = request.get_json()
        
        # Validate input schema
        schema = ContactSchema()
        try:
            validated_data = schema.load(data, unknown=EXCLUDE)
        except ValidationError as err:
            return error_response('Validation failed', 400, err.messages)
        
        # Sanitize inputs
        name = sanitize_input(validated_data['fullName'])
        email = sanitize_input(validated_data['email'].lower().strip())
        subject = sanitize_input(validated_data['subject'])
        message = sanitize_input(validated_data['message'])
        phone = sanitize_input(validated_data['phone'])

        # Additional validation
        if not is_valid_email(email):
            return error_response('Invalid email format', 400)

        if not name or not subject or not message:
            return error_response('All fields are required.', 400)
        
        if len(message) > 500:
            return error_response('Message must not exceed 500 characters.', 400)

        if len(name) > 300:
            return error_response('Name must not exceed 300 characters.', 400)

        if len(phone) > 10:
            return error_response('Phone number must not exceed 10 characters.', 400)

        # Check for spam patterns
        spam_keywords = ['casino', 'lottery', 'winner', 'congratulations', 'urgent', 'viagra']
        message_lower = message.lower()
        if any(keyword in message_lower for keyword in spam_keywords):
            safe_log(f"Potential spam detected from {request.remote_addr}: {email}")
            return error_response('Message flagged as potential spam', 400)

        html_body = f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; 
                                background-color: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 8px;">
                        
                        <!-- Logo -->
                        <div style="text-align: center; margin-bottom: 20px;">
                            <img src="https://api.hustloop.com/static/images/logo.png" alt="Hustloop Logo" width="120" style="border-radius: 6px;">
                        </div>
                        
                        <h3 style="color: #333; text-align: center;">New Contact Form Submission</h3>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-top: 15px;">
                            <p><strong>Name:</strong> {name}</p>
                            <p><strong>Email:</strong> {email}</p>
                            <p><strong>Subject:</strong> {subject}</p>
                            {f'<p><strong>Phone:</strong> {phone}</p>' if phone else ''}
                            <p><strong>Message:</strong></p>
                            <div style="background-color: white; padding: 15px; border-radius: 3px; margin-top: 10px; border: 1px solid #e0e0e0;">
                                {message}
                            </div>
                        </div>
                        
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                        <p style="font-size: 12px; color: #777; text-align: center;">
                            <em>This message was sent from the Hustloop contact form.</em>
                        </p>
                        
                        <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />

                        <div style="text-align:center; margin-top:20px;">

                        <!-- Tagline -->
                        <p style="color:#555; font-size:14px; margin-bottom:15px;">
                            Connect with us on social media
                        </p>

                        <!-- Social Links -->
                            <div style="margin-bottom:20px;">
                                <a href="https://www.linkedin.com/company/hustloop" style="margin:0 12px; text-decoration:none; color:#555; font-size:14px;">
                                <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" 
                                    alt="LinkedIn" width="24" height="24" style="vertical-align:middle; margin-right:6px;" />
                                </a>
                                <a href="#" style="margin:0 12px; text-decoration:none; color:#555; font-size:14px;">
                                <img src="https://cdn-icons-png.flaticon.com/512/5968/5968958.png" 
                                    alt="X" width="24" height="24" style="vertical-align:middle; margin-right:6px;" />
                                </a>
                            </div>
                        </div>
                    </div>
                """
        send_email(
            subject=f"Hustloop Contact Form: {subject}",
            recipients=[current_app.config['MAIL_USERNAME']],
            html_body=html_body,
            sender=(current_app.config['MAIL_USERNAME'], current_app.config['MAIL_USERNAME'])
        )
        
        # Log the submission safely
        log_message = f"Contact form submission from {name} ({email}) - Subject: {subject}"
        contact_logger.info(log_message)

        return success_response('Message received successfully!')

    except ValidationError as e:
        return error_response('Invalid input data', 400, str(e))
    except Exception as e:
        safe_log(f"Failed to process contact form: {type(e).__name__}: {e}")
        return error_response('Failed to send message due to a server error.', 500)

# --- NEWSLETTER ROUTES ---

@api_bp.route('/subscribe-newsletter', methods=['POST'])
@limiter.limit("3 per minute")
def subscribe_newsletter():
    try:
        data = request.get_json()
        
        # Validate input schema
        schema = NewsletterSchema()
        try:
            validated_data = schema.load(data)
        except ValidationError as err:
            return error_response('Validation failed', 400, err.messages)

        email = sanitize_input(validated_data['email'].lower().strip())
        # Additional email validation
        if not is_valid_email(email):
            return error_response('Invalid email format', 400)

        is_valid, error_message = validate_email_mx(email)
        if not is_valid:
            return error_response(error_message, 400)

        if NewsletterSubscriber.query.filter_by(email=email).first():
            return error_response('This email is already subscribed.', 409)

        new_subscriber = NewsletterSubscriber(email=email)
        db.session.add(new_subscriber)
        db.session.flush()

        unsubscribe_url = f"{current_app.config['FRONTEND_URL']}/unsubscribe-newsletter?token={new_subscriber.unsubscribe_token}"
        
        db.session.commit()
        
        html_body = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; 
                        background-color: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 8px;">
                
                <!-- Logo -->
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://api.hustloop.com/static/images/logo.png" alt="Hustloop Logo" width="120" style="border-radius: 6px;">
                </div>

                <h2 style="color: #2c3e50; text-align: center;">🎉 Welcome to Hustloop!</h2>
                
                <p style="font-size: 15px; color: #333;">Hey Go-Getter,</p>
                <p style="font-size: 15px; color: #333;">
                    We're <strong>thrilled</strong> to have you on board! 🚀
                </p>
                <p style="font-size: 15px; color: #333;">
                    You've officially joined the waitlist to turn your idea into real impact.<br>
                    As promised, you've unlocked <strong>1 year of free access</strong> when we launch.
                </p>
                
                <!-- Highlighted Section -->
                <div style="background-color: #ffffff; padding: 20px; border-radius: 6px; margin: 25px 0; 
                            border: 1px solid #e0e0e0;">
                    <p style="margin-bottom: 12px;"><strong>As an early supporter, you’ll be the first to:</strong></p>
                    <div style="padding-left: 20px; color: #333; line-height: 1.6;">
                        <p>✅ Get behind-the-scenes updates</p>
                        <p>✅ Access private beta features</p>
                        <p>✅ Help shape the future of Hustloop</p>
                    </div>
                </div>
                
                <p style="font-size: 15px; color: #333;">
                    Stay tuned for exciting updates — we'll keep you in the loop as we get closer to launch.
                </p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                
                <p style="font-size: 12px; color: #777; text-align: center;">
                    If you didn’t join the waitlist or want to opt out, you can 
                    <a href="{unsubscribe_url}" style="color: #007bff; text-decoration: none;">unsubscribe</a> anytime.
                </p>
                
                <p style="font-size: 14px; color: #333; margin-top: 20px;">
                    Thanks again,<br>
                    <strong>– The Hustloop Team</strong>
                </p>
                <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />

                    <div style="text-align:center; margin-top:20px;">

                    <!-- Tagline -->
                    <p style="color:#555; font-size:14px; margin-bottom:15px;">
                        Connect with us on social media
                    </p>

                    <!-- Social Links -->
                        <div style="margin-bottom:20px;">
                            <a href="https://www.linkedin.com/company/hustloop" style="margin:0 12px; text-decoration:none; color:#555; font-size:14px;">
                            <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" 
                                alt="LinkedIn" width="24" height="24" style="vertical-align:middle; margin-right:6px;" />
                            </a>
                            <a href="#" style="margin:0 12px; text-decoration:none; color:#555; font-size:14px;">
                            <img src="https://cdn-icons-png.flaticon.com/512/5968/5968958.png" 
                                alt="X" width="24" height="24" style="vertical-align:middle; margin-right:6px;" />
                            </a>
                        </div>
                    </div>
            </div>
        """

        
        send_email(
            subject="🎉 You're In! Your 1-Year Free Access is Reserved",
            recipients=[email],
            html_body=html_body,
            sender=('Hustloop', current_app.config['MAIL_USERNAME'])
        )

        subscribers = NewsletterSubscriber.query.order_by(NewsletterSubscriber.subscribed_at.desc()).all()
        if not subscribers:
            return error_response("No subscribers found", 404)

        admin_users = User.query.filter_by(role="admin").all()
        admin_emails = [a.email for a in admin_users if a.email]

        rows = ""
        for s in subscribers:
            rows += f"""
                <tr>
                    <td style="padding:10px; border:1px solid #ddd; font-size:14px;">{s.email}</td>
                    <td style="padding:10px; border:1px solid #ddd; font-size:14px;">{format_datetime(s.subscribed_at)}</td>
                </tr>
            """

        html_body = f"""
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8f9fa;">
            <tr>
                <td align="center">
                    <table width="650" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border-radius:6px; overflow:hidden;">
                        <tr>
                            <td align="center" style="background:#1a1f36; padding:24px;">
                                <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" alt="Hustloop Logo" style="max-width:150px; display:block; margin-bottom:10px;">
                                <h2 style="margin:0; color:#fff; font-size:22px; font-weight:600;">Newsletter Subscribers Report</h2>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:24px; font-family:Arial, sans-serif; color:#333;">
                                <p style="font-size:16px;">Below is the complete list of users subscribed to the newsletter:</p>

                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; margin-top:15px;">
                                    <tr>
                                        <th style="padding:10px; background:#1a1f36; color:#fff; border:1px solid #ddd; font-size:15px;">Email</th>
                                        <th style="padding:10px; background:#1a1f36; color:#fff; border:1px solid #ddd; font-size:15px;">Subscribed At</th>
                                    </tr>
                                    {rows}
                                </table>

                                <p style="margin-top:20px; font-size:14px;">
                                    Regards,<br><strong>Hustloop System</strong>
                                </p>
                            </td>
                        </tr>

                        <tr>
                            <td align="center" style="background:#f1f3f5; padding:20px;">
                                <p style="margin:0; color:#666; font-size:13px;">© {datetime.now().year} Hustloop. All rights reserved.</p>

                                <div style="margin-top:10px;">
                                    <a href="https://x.com/hustloop" style="margin:0 8px;">
                                        <img src="{os.getenv('X_ICON')}" width="22" height="22">
                                    </a>
                                    <a href="https://linkedin.com/company/hustloop" style="margin:0 8px;">
                                        <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" width="22" height="22">
                                    </a>
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        """

        send_email(
            subject="Newsletter Subscribers Report",
            recipients=admin_emails,
            html_body=html_body,
            sender=("Hustloop", current_app.config['MAIL_USERNAME'])
        )

        safe_log(f"Newsletter subscription successful: {email}")
        return success_response('Subscription successful! Please check your email to confirm.')

    except IntegrityError:
        db.session.rollback()
        return error_response('This email is already subscribed.', 409)
    except Exception as e:
        db.session.rollback()
        safe_log(f"Newsletter subscription failed: {type(e).__name__}: {e}", email if 'email' in locals() else None)
        return error_response('An internal error occurred. Please try again later.', 500)

@api_bp.route('/unsubscribe-newsletter', methods=['GET'])
def unsubscribe_newsletter():
    try:
        token = sanitize_input(request.args.get('token', ''))
        if not token:
            return render_template_string("""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
                <h1>Invalid Link</h1>
                <p>This unsubscribe link is missing a token.</p>
            </div>
            """), 400

        subscriber = NewsletterSubscriber.query.filter_by(unsubscribe_token=token).first()
        if not subscriber:
            return render_template_string("""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
                <h1>Invalid Link</h1>
                <p>This unsubscribe link is invalid or has already been used.</p>
            </div>
            """), 404

        db.session.delete(subscriber)
        db.session.commit()
        
        safe_log(f"Newsletter unsubscribe successful: {subscriber.email}")
        return render_template_string("""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
            <h1>Unsubscribed</h1>
            <p>You have been successfully unsubscribed from our newsletter.</p>
            <p>We're sorry to see you go!</p>
        </div>
        """), 200
        
    except Exception as e:
        db.session.rollback()
        safe_log(f"Failed to unsubscribe: {type(e).__name__}: {e}", token if 'token' in locals() else None)
        return render_template_string("""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
            <h1>Error</h1>
            <p>An error occurred. Please contact support.</p>
        </div>
        """), 500

# --- DATA ROUTES ---

@api_bp.route('/mentors', methods=['GET'])
def get_mentors_route():
    try:
        data = get_static_data('mentors')
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', PAGINATION_DEFAULT, type=int), PAGINATION_MAX)
        total = len(data)
        pages = ceil(total / per_page) if per_page else 1
        start = (page - 1) * per_page
        end = start + per_page
        items = data[start:end]
        return success_response(
            "Fetched mentors",
            items=items,
            total=total,
            pages=pages,
            current_page=page
        )
    except Exception as e:
        safe_log(f"Error fetching mentors: {type(e).__name__}: {e}")
        return error_response('Unable to fetch mentors data', 500)

@api_bp.route('/incubators', methods=['GET'])
def get_incubators_route():
    try:
        data = get_static_data('incubators')
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', PAGINATION_DEFAULT, type=int), PAGINATION_MAX)
        total = len(data)
        pages = ceil(total / per_page) if per_page else 1
        start = (page - 1) * per_page
        end = start + per_page
        items = data[start:end]
        return success_response(
            "Fetched incubators",
            items=items,
            total=total,
            pages=pages,
            current_page=page
        )
    except Exception as e:
        safe_log(f"Error fetching incubators: {type(e).__name__}: {e}")
        return error_response('Unable to fetch incubators data', 500)

@api_bp.route('/mentor-profile', methods=['POST'])
@token_required
@role_required(['mentor'])
def update_mentor_profile():
    try:
        user = get_current_user()
        if not user:
            return error_response('User not found', 404)

        data = request.get_json()

        def keep(field, value):
            return value if value not in [None, ''] else field

        user.name = keep(user.name, data.get('name'))
        user.title = keep(user.title, data.get('title'))
        user.avatar = keep(user.avatar, data.get('avatar'))
        user.hint = keep(user.hint, data.get('hint'))
        user.bio = clean(data.get('bio', ''), tags=['b', 'i', 'ul', 'li', 'strong', 'a'], strip=True)

        hourly_rate = data.get('hourlyRate')
        if hourly_rate is not None:
            try:
                hourly = float(hourly_rate)
                if not (10 <= hourly <= 10000):
                    return error_response('Hourly rate must be between 10 and 10,000', 400)
                user.hourly_rate = hourly
            except (ValueError, TypeError):
                return error_response('Invalid hourly rate', 400)

        expertise = data.get('expertise')
        if isinstance(expertise, list):
            user.expertise = ','.join(expertise)
        elif expertise is not None:
            return error_response('Expertise must be a list', 400)

        socials = data.get('socials') or {}
        if not isinstance(socials, dict):
            return error_response('Invalid socials', 400)

        user.x_url = keep(user.x_url, socials.get('x'))
        user.linkedin_url = keep(user.linkedin_url, socials.get('linkedin'))

        db.session.commit()
        return success_response('Profile updated successfully')

    except Exception as e:
        db.session.rollback()
        safe_log(f"Error updating mentor profile: {type(e).__name__}: {e}")
        return error_response('Unable to update profile', 500)

@api_bp.route('/msmes', methods=['GET'])
def get_msmes_route():
    try:
        corp = get_static_data('corporate_challenges')
        msme = get_static_data('msme_collaborations')
        Government = get_static_data('Government_challenges')
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', PAGINATION_DEFAULT, type=int), PAGINATION_MAX)
        corp_total = len(corp)
        msme_total = len(msme)
        Government_total = len(Government)
        corp_pages = ceil(corp_total / per_page) if per_page else 1
        msme_pages = ceil(msme_total / per_page) if per_page else 1
        Government_pages = ceil(Government_total / per_page) if per_page else 1
        corp_items = corp[(page-1)*per_page:((page-1)*per_page)+per_page]
        msme_items = msme[(page-1)*per_page:((page-1)*per_page)+per_page]
        Government_items = Government[(page-1)*per_page:((page-1)*per_page)+per_page]
        return success_response(
            "Fetched MSMEs",
            corporateChallenges={
                'items': corp_items,
                'total': corp_total,
                'pages': corp_pages,
                'current_page': page
            },
            msmeCollaborations={
                'items': msme_items,
                'total': msme_total,
                'pages': msme_pages,
                'current_page': page
            },
            Government_challenges={
                'items': Government_items,
                'total': Government_total,
                'pages': Government_pages,
                'current_page': page
            }
        )
    except Exception as e:
        safe_log(f"Error fetching MSMEs: {type(e).__name__}: {e}")
        return error_response('Unable to fetch MSMEs data', 500)



@api_bp.route('/blog-posts', methods=['GET'])
def get_blog_posts_route():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', PAGINATION_DEFAULT, type=int), PAGINATION_MAX)
        pagination = BlogPost.query.order_by(BlogPost.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return success_response(
            "Fetched blog posts",
            items=[post.to_dict() for post in pagination.items],
            total=pagination.total,
            pages=pagination.pages,
            current_page=pagination.page
        )
    except Exception as e:
        safe_log(f"Error fetching blog posts: {type(e).__name__}: {e}")
        return error_response('Unable to fetch blog posts', 500)

@api_bp.route('/education-programs', methods=['GET'])
def get_education_programs_route():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', PAGINATION_DEFAULT, type=int), PAGINATION_MAX)
        pagination = EducationProgram.query.order_by(EducationProgram.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        items = [p.to_dict() for p in pagination.items] if pagination.items else []

        return success_response(
            "Fetched education programs",
            items=items,
            total=pagination.total,
            pages=pagination.pages,
            current_page=pagination.page
        )
    except Exception as e:
        safe_log(f"Error fetching education programs: {type(e).__name__}: {e}")
        return error_response('Unable to fetch education programs', 500)


@api_bp.route('/update-profile', methods=['POST'])
@limiter.limit("5 per minute")
@token_required
def update_profile():
    try:
        user = get_current_user()
        if not user:
            return error_response('User not found or invalid token', 404)

        data = request.get_json()

        schema = ProfileUpdateSchema(only=("name",))  
        try:
            validated_data = schema.load(data)
            safe_log(f"Profile update request: {validated_data}")
        except ValidationError as err:
            safe_log(f"Profile update validation error: {err.messages}")
            return error_response('Validation failed', 400, err.messages)

        name = sanitize_input(validated_data['name'])
        user.name = name
        db.session.commit()

        safe_log(f"Profile name updated successfully: {user.name}")

        return success_response(
            "Profile updated successfully",
            user={"name": user.name,"email":user.email}
        )

    except Exception as e:
        db.session.rollback()
        safe_log(f"Profile update error: {type(e).__name__}: {e}")
        return error_response('An unexpected error occurred', 500)


@api_bp.route('/payment-method', methods=['POST'])
@token_required
@limiter.limit("5 per minute")
def create_update_payment_method():
    try:
        user = get_current_user()
        if not user:
            return error_response('User not found or invalid token', 404)

        data = request.get_json()
        payment_method = data.get('paymentMethod')
        payment_category = data.get('paymentCategory')
        
        existing = UserPaymentMethod.query.filter_by(
            user_id=user.uid,
            payment_category=PaymentCategory[payment_category]
        ).first()

        if payment_method == 'paypal':
            payment_data = {
                'payment_method': PaymentMethod[payment_method],
                'paypal_email': data.get('paypalEmail'),
                'account_holder': None,
                'account_number': None,
                'ifsc_code': None,
                'upi_id': None
            }
        elif payment_method == 'bank':
            payment_data = {
                'payment_method': PaymentMethod[payment_method],
                'paypal_email': None,
                'account_holder': data.get('accountHolder'),
                'account_number': data.get('accountNumber'),
                'ifsc_code': data.get('ifscCode'),
                'upi_id': None
            }
        elif payment_method == 'upi':
            payment_data = {
                'payment_method': PaymentMethod[payment_method],
                'paypal_email': None,
                'account_holder': None,
                'account_number': None,
                'ifsc_code': None,
                'upi_id': data.get('upiId')
            }
        else:
            return error_response('Invalid payment method', 400)
        
        if existing:
            # Update existing record
            for key, value in payment_data.items():
                setattr(existing, key, value)
        else:
            # Create new record
            new_payment = UserPaymentMethod(
                user_id=user.uid,
                payment_category=PaymentCategory[payment_category],
                **payment_data
            )
            db.session.add(new_payment)
        
        db.session.commit()
        return success_response('Payment method saved successfully')
    except Exception as e:
        db.session.rollback()
        return error_response('Failed to save payment method', 500)

@api_bp.route('/payment-methods', methods=['GET'])
@token_required
def get_payment_methods():
    try:
        user = get_current_user()
        if not user:
            return error_response('User not found', 404)
        
        payment_methods = UserPaymentMethod.query.filter_by(user_id=user.uid).all()
        
        return success_response(
            'Payment methods retrieved',
            payment_methods=[pm.to_dict() for pm in payment_methods]
        )
    except Exception as e:
        return error_response('Failed to retrieve payment methods', 500)

    
@api_bp.route('/request-email-change', methods=['POST'])
@token_required
@limiter.limit("2 per minute")
def request_email_change():
    try:
        user = get_current_user()
        data = request.get_json() or {}
        new_email = sanitize_input(data.get('new_email', '').lower().strip())
        if not new_email or not is_valid_email(new_email):
            return error_response('Valid new email required.', 400)
        if User.query.filter_by(email=new_email).first():
            return error_response('This email is already in use.', 409)

        # Generate verification link if possible (Firebase Admin SDK only allows password link but you can use sendEmailVerification on client)
        action_code_settings = auth.ActionCodeSettings(
            url=f"{current_app.config['FRONTEND_URL']}/auth/change-email",
            handle_code_in_app=True,
        )
        # Custom process: Issue a secure token bound to user and new email
        change_token = generate_secure_token({'user_id': user.uid, 'new_email': new_email}, expires_in_seconds=1800)

        verification_url = f"{current_app.config['FRONTEND_URL']}/auth/verify-email-change?token={change_token}"

        html_body = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; 
                        background-color: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 8px;">
                
                <!-- Logo -->
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://api.hustloop.com/static/images/logo.png" alt="Hustloop Logo" width="120" style="border-radius: 6px;">
                </div>
                
                <h2 style="color: #2c3e50; text-align: center;">Confirm Your New Email</h2>
                
                <p style="font-size: 15px; color: #333;">
                    Hello,
                </p>
                
                <p style="font-size: 15px; color: #333;">
                    You requested to change your Hustloop account email to <b>{new_email}</b>.
                    <br>
                    Please confirm your new email address by clicking the button below:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verification_url}" 
                    style="background-color: #007bff; color: white; padding: 12px 24px; 
                            text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
                        Confirm Email
                    </a>
                </div>
                
                <p style="font-size: 14px; color: #555;">
                    If you did not request this change, you can safely ignore this email.
                </p>
                
                <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />

                    <div style="text-align:center; margin-top:20px;">

                    <!-- Tagline -->
                    <p style="color:#555; font-size:14px; margin-bottom:15px;">
                        Connect with us on social media
                    </p>

                    <!-- Social Links -->
                        <div style="margin-bottom:20px;">
                            <a href="https://www.linkedin.com/company/hustloop" style="margin:0 12px; text-decoration:none; color:#555; font-size:14px;">
                            <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" 
                                alt="LinkedIn" width="24" height="24" style="vertical-align:middle; margin-right:6px;" />
                            </a>
                            <a href="#" style="margin:0 12px; text-decoration:none; color:#555; font-size:14px;">
                            <img src="https://cdn-icons-png.flaticon.com/512/5968/5968958.png" 
                                alt="X" width="24" height="24" style="vertical-align:middle; margin-right:6px;" />
                            </a>
                        </div>
                    </div>
            </div>
"""

        send_email(
            subject='Confirm Your New Email',
            recipients=[new_email],
            html_body=html_body,
            sender=('Hustloop', current_app.config['MAIL_USERNAME'])
        )
        return success_response('Verification sent to new email. Please check your inbox.')
    except Exception as e:
        safe_log(f"Request email change error: {type(e).__name__}: {e}")
        return error_response('An error occurred.', 500)
    
@api_bp.route('/verify-email-change', methods=['POST'])
@limiter.limit("2 per minute")
def verify_email_change():
    try:
        data = request.get_json()
        token = data.get('token')
        decoded = verify_token(token)  # implement your token decoder/validator!
        user_id = decoded.get('user_id')
        new_email = sanitize_input(decoded.get('new_email', ''))

        user = User.query.filter_by(uid=user_id).first()
        if not user:
            return error_response('Invalid or expired token.', 400)
        if User.query.filter_by(email=new_email).first():
            return error_response('This email is already taken.', 409)

        auth.update_user(user_id, email=new_email, email_verified=True)
        user.email = new_email
        db.session.commit()
        return success_response('Email updated.',user={"email": new_email})
    except Exception as e:
        safe_log(f"Verify email change error: {type(e).__name__}: {e}")
        return error_response('Unable to change email.', 500)

@api_bp.route('/change-password', methods=['POST'])
@limiter.limit("3 per minute")
@token_required
def change_password():
    try:
        user = get_current_user()
        if not user:
            return error_response('User not found or invalid token', 404)

        data = request.get_json()
        current_password = data.get('currentPassword')
        new_password = data.get('newPassword')

        if not current_password or not new_password:
            return error_response('Current password and new password are required', 400)
        
        # For Firebase users, password verification must happen on the client by re-authenticating.
        # This endpoint should only proceed after client-side re-auth.
        # The 'currentPassword' is not securely verifiable on the backend for Firebase SDK.
        if user.auth_provider != 'local':
            return error_response('For security, please re-authenticate on the client to change your password.', 400)


        # Additional logging context for sensitive operation
        safe_log(
            f"Password change requested for user {user.uid[:6]}...",
            {"ip": request.remote_addr}
        )
        
        if user.auth_provider == 'local' and user.password_hash:
            if not bcrypt.check_password_hash(user.password_hash, current_password):
                return error_response('Current password is incorrect', 401)

        # Validate new password strength
        is_valid, message = validate_password_strength(new_password)
        if not is_valid:
            return error_response(message, 400)

        # Check password reuse (for admin: check history; for Firebase: check against current only)
        if user.auth_provider == 'local' and user.password_hash:
            new_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
            if user.check_password_reuse(new_hash):
                return error_response('New password cannot be the same as any of your recent passwords.', 400)
            if bcrypt.check_password_hash(user.password_hash, new_password):
                return error_response('New password cannot be the same as your current password.', 400)
        
        # Optional: ensure user has verified email
        firebase_user = auth.get_user(user.uid)
        if not firebase_user.email_verified:
            return error_response('Email not verified. Please verify your email before changing password.', 400)

        # Update password in Firebase or local
        safe_log(f"must_reset_password :{user.must_reset_password}")
        try:
            if user.auth_provider == 'local' and user.password_hash:
                new_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
                user.add_password_to_history(user.password_hash)
                user.password_hash = new_hash
                db.session.commit()
            else:
                auth.update_user(user.uid, password=new_password)
        except Exception as e:
            safe_log(f"Password update error in Firebase: {type(e).__name__}: {e}")
            return error_response('Failed to update password', 500)
        user.must_reset_password = False
        db.session.commit()
        safe_log(f"Password changed successfully: {user.uid[:6]}...", {"ip": request.remote_addr})
        return success_response('Password changed successfully')

    except Exception as e:
        safe_log(f"Change password error: {type(e).__name__}: {e}", {"ip": request.remote_addr})
        return error_response('An unexpected error occurred', 500)
    
@api_bp.route('/forgot-password', methods=['POST'])
@limiter.limit("3 per minute")
def forgot_password():
    try:
        data = request.get_json() or {}
        email = sanitize_input(data.get('email', '').lower().strip())
        # Always return generic success to prevent enumeration
        if not email or not is_valid_email(email):
            return error_response('If this email is registered, a reset link has been sent.',500)

        try:
            user = User.query.filter_by(email=email).first()
            try:
                user_record = auth.get_user_by_email(email)
            except auth.UserNotFoundError:
                user_record = None
            except Exception as e:
                safe_log(f"Firebase error for {email}: {str(e)}")
                user_record = None
            if not user or not user_record or user.status != "active":
                safe_log(f"Password reset blocked: {email}")
                return error_response('Email not found or not active',500)
            if not user_record.email_verified:
                safe_log(f"Password reset blocked (unverified email): {email}")
                return error_response('If this email is registered, a reset link has been sent.',500)

            action_code_settings = auth.ActionCodeSettings(
                url=f"{current_app.config['FRONTEND_URL']}/auth/action",
                handle_code_in_app=True,
            )
            reset_link = auth.generate_password_reset_link(email, action_code_settings)

            # ✉️ HTML email body
            html_body = f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; 
                background-color: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 8px;">

                    <!-- Logo -->
                    <div style="text-align:center; margin-bottom:20px;">
                        <img src="https://api.hustloop.com/static/images/logo.png" alt="Hustloop Logo" width="120" style="border-radius:6px;" />
                    </div>

                    <!-- Content -->
                    <h2 style="color:#333; margin-bottom:16px;">Password Reset Request</h2>
                    <p>Hello {user.name or ''},</p>
                    <p>We received a request to reset your password for your account associated with <strong>{email}</strong>.</p>
                    <p>Click the button below to reset your password:</p>

                    <!-- Button -->
                    <div style="text-align:center; margin:30px 0;">
                        <a href="{reset_link}" 
                        style="background:#007bff; color:#fff; padding:12px 24px; text-decoration:none; border-radius:5px; font-weight:bold; display:inline-block;">
                        Reset Password
                        </a>
                    </div>

                    <p>If you didn't request this, you can safely ignore this email. Your password will not change unless you click the reset button.</p>

                    <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />

                    <!-- Extra Content -->
                    <h3 style="color:#333; margin-bottom:10px;">Security Tips</h3>
                    <ul style="color:#555; line-height:1.6; padding-left:20px; margin:0;">
                        <li>Never share your password with anyone.</li>
                        <li>Use a strong password with letters, numbers, and symbols.</li>
                    </ul>

                    <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />

                    <div style="text-align:center; margin-top:20px;">

                    <!-- Tagline -->
                    <p style="color:#555; font-size:14px; margin-bottom:15px;">
                        Connect with us on social media
                    </p>

                    <!-- Social Links -->
                    <div style="margin-bottom:20px;">
                        <a href="https://www.linkedin.com/company/hustloop" style="margin:0 12px; text-decoration:none; color:#555; font-size:14px;">
                        <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" 
                            alt="LinkedIn" width="24" height="24" style="vertical-align:middle; margin-right:6px;" />
                        </a>
                        <a href="#" style="margin:0 12px; text-decoration:none; color:#555; font-size:14px;">
                        <img src="https://cdn-icons-png.flaticon.com/512/5968/5968958.png" 
                            alt="X" width="24" height="24" style="vertical-align:middle; margin-right:6px;" />
                        </a>
                    </div>
                    </div>
                </div>
            """
            
            send_email(
                recipients=[email],
                subject="Reset your password for HustLoop",
                html_body=html_body,
                sender=('Hustloop', current_app.config['MAIL_USERNAME'])
            )

            safe_log(f"Password reset email sent to: {email}")
        except auth.UserNotFoundError:
            # Hide details to avoid enumeration
            pass
        except Exception as e:
            safe_log(f"Forgot password error: {type(e).__name__}: {e}", email)

        return success_response('If this email is registered, a reset link has been sent.')

    except Exception as e:
        safe_log(f"Forgot password error: {type(e).__name__}: {e}")
        return error_response('An unexpected error occurred',500)


@api_bp.route('/subscribe', methods=['POST'])
@limiter.limit("3 per minute")
@token_required
def subscribe():
    try:
        user = get_current_user()
        if not user:
            return error_response('User not found or invalid token', 404)

        if user.has_subscription:
            return error_response('You already have an active subscription', 400)

        # Here you would typically integrate with a payment provider
        # For now, we'll just update the user's subscription status
        user.has_subscription = True
        db.session.commit()

        safe_log(f"Subscription activated: {user.email}")
        return success_response('Subscription activated successfully')

    except Exception as e:
        db.session.rollback()
        safe_log(f"Subscription error: {type(e).__name__}: {e}")
        return error_response('An unexpected error occurred', 500)

# --- ADMIN ROUTES ---

# Add audit logging to all admin endpoints (get_users, get_subscribers, reset_subscribers, toggle_user_ban, delete_user, create_blog_post, update_blog_post, delete_blog_post, create_education_program, update_education_program, delete_education_program, create_plan, update_plan, delete_plan, create_coupon, get_pricing_history)
# Add endpoints for updating user roles and bulk user operations

@api_bp.route('/users/<string:uid>/role', methods=['PUT'])
@token_required
@role_required(['admin'])
def update_user_role(uid):
    try:
        user = User.query.filter_by(uid=uid).first()
        if not user:
            return error_response('User not found', 404)
        data = request.get_json() or {}
        new_role = data.get('role')
        if new_role not in ['admin', 'founder', 'mentor', 'incubator', 'organisation']:
            return error_response('Invalid role', 400)
        old_role = user.role
        user.role = new_role
        db.session.commit()
        safe_log(f"Admin {get_current_user().email} changed role for {user.email} from {old_role} to {new_role}")
        return success_response('User role updated successfully')
    except Exception as e:
        db.session.rollback()
        safe_log(f"Error updating user role: {type(e).__name__}: {e}")
        return error_response('Unable to update user role', 500)

@api_bp.route('/users/bulk-update', methods=['POST'])
@token_required
@role_required(['admin'])
def bulk_update_users():
    try:
        data = request.get_json() or {}
        actions = data.get('actions', [])
        results = []
        for action in actions:
            uid = action.get('uid')
            user = User.query.filter_by(uid=uid).first()
            if not user:
                results.append({'uid': uid, 'status': 'not found'})
                continue
            if action.get('role'):
                old_role = user.role
                user.role = action['role']
                results.append({'uid': uid, 'status': f'role updated from {old_role} to {user.role}'})
            if action.get('ban') is not None:
                user.status = 'banned' if action['ban'] else 'active'
                results.append({'uid': uid, 'status': f'status set to {user.status}'})
        db.session.commit()
        safe_log(f"Admin {get_current_user().email} performed bulk user update: {results}")
        return success_response('Bulk update completed', results=results)
    except Exception as e:
        db.session.rollback()
        safe_log(f"Error in bulk user update: {type(e).__name__}: {e}")
        return error_response('Unable to perform bulk update', 500)

@api_bp.route('/users', methods=['GET'])
@token_required
@role_required(['admin'])
def get_users():
    try:
        fetch_all = request.args.get('all', 'false').lower() == 'true'
        
        if fetch_all:
            all_users = User.query.order_by(User.created_at.desc()).all()
            
            user_list = []
            for user in all_users:
                user_data = {
                    'uid': user.uid,
                    'name': user.name,
                    'email': user.email,
                    'role': user.role,
                    'status': user.status,
                    'has_subscription': user.has_subscription,
                    'email_verified': False  
                }

                try:
                    firebase_user = auth.get_user(user.uid)
                    user_data['email_verified'] = firebase_user.email_verified
                except auth.UserNotFoundError:
                    current_app.logger.warning(f"Firebase user not found for UID: {user.uid}")
                except Exception as e:
                    current_app.logger.error(f"Error checking Firebase user {user.uid}: {str(e)}")
                
                user_list.append(user_data)

            safe_log(f"Admin {get_current_user().email} fetched all users")
            return success_response(
                "Fetched all users successfully",
                items=user_list,
                total=len(user_list)
            )

        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', PAGINATION_DEFAULT, type=int), PAGINATION_MAX)
        pagination = User.query.order_by(User.created_at.desc()).paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        user_list = []
        for user in pagination.items:
            user_data = {
                'uid': user.uid,
                'name': user.name,
                'email': user.email,
                'role': user.role,
                'status': user.status,
                'has_subscription': user.has_subscription,
                'email_verified': False  
            }

            try:
                firebase_user = auth.get_user(user.uid)
                user_data['email_verified'] = firebase_user.email_verified
            except auth.UserNotFoundError:
                current_app.logger.warning(f"Firebase user not found for UID: {user.uid}")
            except Exception as e:
                current_app.logger.error(f"Error checking Firebase user {user.uid}: {str(e)}")
            
            user_list.append(user_data)

        safe_log(f"Admin {get_current_user().email} viewed user list page {page}")
        return success_response(
            "Fetched users successfully",
            items=user_list,
            total=pagination.total,
            pages=pagination.pages,
            current_page=pagination.page
        )
    except Exception as e:
        current_app.logger.error(f"Error in get_users: {str(e)}")
        return error_response('Failed to fetch users', 500)

@api_bp.route('/subscribers', methods=['GET'])
@token_required
@role_required(['admin'])
def get_subscribers():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', PAGINATION_DEFAULT, type=int), PAGINATION_MAX)
        subscribers = NewsletterSubscriber.query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        safe_log(f"Admin {get_current_user().email} viewed newsletter subscribers page {page}")
        return success_response(
            'Fetched subscribers', 
            items=[subscriber.to_dict() for subscriber in subscribers.items], 
            total=subscribers.total, 
            pages=subscribers.pages, 
            current_page=subscribers.page
        )
    except Exception as e:
        safe_log(f"Error fetching subscribers: {type(e).__name__}: {e}")
        return error_response('Unable to fetch subscribers', 500)

# @api_bp.route('/subscribers/reset', methods=['POST'])
# @token_required
# @role_required(['admin'])
# def reset_subscribers():
#     try:
#         NewsletterSubscriber.query.delete()
#         db.session.commit()
#         safe_log(f"All newsletter subscribers reset by admin {get_current_user().email}")
#         return success_response('All subscribers have been reset')

#     except Exception as e:
#         db.session.rollback()
#         safe_log(f"Error resetting subscribers: {type(e).__name__}: {e}")
#         return error_response('Unable to reset subscribers', 500)


@api_bp.route('/subscribers/delete', methods=['POST'])
@token_required
@role_required(['admin'])
def delete_selected_subscribers():
    try:
        data = request.get_json()
        subscriber_ids = data.get('ids')

        if not subscriber_ids:
            return error_response('No subscriber IDs provided', 400)

        if isinstance(subscriber_ids, str):
            subscriber_ids = [int(i) for i in subscriber_ids.split(',') if i.strip().isdigit()]
        elif isinstance(subscriber_ids, list):
            subscriber_ids = [int(i) for i in subscriber_ids if str(i).isdigit()]
        else:
            return error_response('Invalid data format for IDs', 400)

        if not subscriber_ids:
            return error_response('No valid subscriber IDs provided', 400)

        deleted_count = NewsletterSubscriber.query.filter(
            NewsletterSubscriber.id.in_(subscriber_ids)
        ).delete(synchronize_session=False)
        db.session.commit()
        
        safe_log(f"{deleted_count} newsletter subscribers deleted by admin")
        return success_response(f"{deleted_count} subscriber(s) deleted successfully")
    except Exception as e:
        db.session.rollback()
        safe_log(f"Error deleting selected subscribers: {type(e).__name__}: {e}")
        return error_response('Unable to delete selected subscribers', 500)


@api_bp.route('/users/<string:uid>/toggle-ban', methods=['POST'])
@token_required
@role_required(['admin'])
def ban_user(uid):
    user = get_current_user()
    if not user:
        return error_response('User not found', 404)
    try:
        user_to_ban = User.query.filter_by(uid=uid).first()
        if not user_to_ban:
            return error_response('User not found', 404)
        if(user_to_ban.status == 'banned'):
            user_to_ban.status = 'active'
            db.session.commit()
            return success_response('User unbanned successfully')
        user_to_ban.status = 'banned'
        db.session.commit()
        safe_log(f"Admin {user.email} banned user {user_to_ban.email}")
        return success_response('User banned successfully')
    except Exception as e:
        db.session.rollback()
        safe_log(f"Error banning user: {type(e).__name__}: {e}")
        return error_response('Unable to ban user', 500)

@api_bp.route('/users/<string:uid>/unban', methods=['POST'])
@token_required
@role_required(['admin'])
def unban_user(uid):
    user = get_current_user()
    if not getattr(user, 'can_ban_users', False):
        return error_response('Insufficient permissions', 403)
    try:
        user_to_unban = User.query.filter_by(uid=uid).first()
        if not user_to_unban:
            return error_response('User not found', 404)
        user_to_unban.status = 'active'
        db.session.commit()
        safe_log(f"Admin {user.email} unbanned user {user_to_unban.email}")
        return success_response('User unbanned successfully')
    except Exception as e:
        db.session.rollback()
        safe_log(f"Error unbanning user: {type(e).__name__}: {e}")
        return error_response('Unable to unban user', 500)

@api_bp.route('/users/<string:uid>', methods=['DELETE'])
@token_required
@role_required(['admin'])
def delete_user(uid):
    try:
        user = User.query.filter_by(uid=uid).first()
        if not user:
            return error_response('User not found', 404)

        safe_log(f"admin_delete_started:{uid}")

        TeamSolutionMembers.query.filter_by(user_id=uid).delete()
        Comment.query.filter_by(author_id=uid).delete()
        solutions = Solution.query.filter_by(user_id=uid).all()
        for sol in solutions:
            files = File.query.filter_by(solution_id=sol.id).all()
            for f in files:
                try:
                    s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=f.url)
                except Exception as e:
                    safe_log(f"s3_delete_file_error:{e}")
                db.session.delete(f)
            db.session.delete(sol)
            TeamSolutionMembers.query.filter_by(user_id=uid).delete()

        Collaboration.query.filter_by(user_id=uid).delete()

        MSMEProfile.query.filter_by(user_id=uid).delete()
        comments = NeedInfoComment.query.filter_by(comment_user_id=uid).all()
        for comment in comments:
            s3_key = comment.supportingFile
            if s3_key:
                try:
                    s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
                except Exception as e:
                    safe_log(f"s3_delete_support_file_error:{e}")
            db.session.delete(comment)

        tech_ips = TechTransferIP.query.filter_by(user_id=uid).all()
        for ip in tech_ips:
            if ip.supportingFile:
                try:
                    s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=ip.supportingFile)
                except Exception as e:
                    safe_log(f"s3_delete_techip_error:{e}")
            db.session.delete(ip)

        try:
            auth.delete_user(uid)
        except auth.UserNotFoundError:
            safe_log("firebase_user_not_found")
        except Exception as e:
            safe_log(f"firebase_delete_error:{e}")

        db.session.delete(user)
        db.session.commit()

        safe_log(f"admin_deleted_user:{uid}")
        return success_response("User deleted successfully")

    except Exception as e:
        db.session.rollback()
        safe_log(f"admin_delete_error:{e}")
        return error_response("Failed to delete user")


@api_bp.route('/users/firebase-delete', methods=['POST'])
def firebase_delete_user():
    """Endpoint to be called by a Firebase Function trigger on user deletion."""
    secret = request.headers.get('Authorization', '').replace('Bearer ', '')
    backend_secret = current_app.config.get('BACKEND_DELETE_SECRET')
    
    if not backend_secret or secret != backend_secret:
        return error_response('Unauthorized', 401)

    data = request.get_json()
    uid = data.get('uid')
    if not uid:
        return error_response('UID required', 400)

    user = User.query.filter_by(uid=uid).first()
    if user:
        try:
            db.session.delete(user)
            db.session.commit()
            safe_log(f"User deleted from backend via Firebase trigger: {uid}")
            return success_response('User deleted from backend')
        except Exception as e:
            db.session.rollback()
            safe_log(f"DB error during Firebase-triggered delete for UID {uid}: {e}")
            return error_response('Database error during deletion', 500)
    
    return error_response('User not found in backend', 404)

# --- BLOG POST ROUTES ---

@api_bp.route('/blog-posts', methods=['POST'])
@token_required
@role_required(['admin'])
def create_blog_post():
    try:
        data = request.get_json() or {}
        
        title = sanitize_input(data.get('title', ''))
        content = sanitize_input(data.get('content', ''))
        author = sanitize_input(data.get('author', ''))
        tags = data.get('tags', [])
        
        # Validate input
        if not title or len(title) < 5:
            return error_response('Title must be at least 5 characters', 400)
        if not content or len(content) < 20:
            return error_response('Content must be at least 20 characters', 400)
        if author and len(author) < 2:
            return error_response('Author name must be at least 2 characters', 400)
        if tags and not isinstance(tags, list):
            return error_response('Tags must be a list', 400)
        
        # Save blog post to DB
        new_post = BlogPost(
            title=title,
            content=content,
            author=author,
            tags=','.join(tags) if tags else None,
        )
        db.session.add(new_post)
        db.session.commit()
        
        safe_log(f"Admin {get_current_user().email} created blog post: {title} by {author or 'unknown'}")
        return success_response('Blog post created successfully', post_id=new_post.id)

    except Exception as e:
        db.session.rollback()
        safe_log(f"Error creating blog post: {type(e).__name__}: {e}")
        return error_response('Unable to create blog post', 500)

@api_bp.route('/blog-posts/<int:post_id>', methods=['PUT'])
@token_required
@role_required(['admin'])
def update_blog_post(post_id):
    try:
        post = BlogPost.query.get_or_404(post_id)
        data = request.get_json()
        
        post.title = sanitize_input(data.get('title', post.title))
        post.content = sanitize_input(data.get('content', post.content))
        post.excerpt = sanitize_input(data.get('excerpt', post.excerpt))
        post.author = sanitize_input(data.get('author', post.author))
        post.slug = re.sub(r'[^a-zA-Z0-9-]', '-', post.title.lower())
        
        db.session.commit()

        safe_log(f"Admin {get_current_user().email} updated blog post: {post.title}")
        return success_response('Blog post updated successfully', post=post.to_dict())

    except Exception as e:
        db.session.rollback()
        safe_log(f"Error updating blog post: {type(e).__name__}: {e}")
        return error_response('Unable to update blog post', 500)

@api_bp.route('/education-programs', methods=['POST'])
@token_required
@role_required(['admin'])
def create_education_program():
    try:
        data = request.get_json()
        
        title = sanitize_input(data.get('title', ''))
        description = sanitize_input(data.get('description', ''))
        duration = sanitize_input(data.get('duration', ''))
        level = sanitize_input(data.get('level', ''))
        
        if not all([title, description, duration, level]):
            return error_response('Title, description, duration, and level are required', 400)

        new_program = EducationProgram(
            title=title,
            description=description,
            duration=duration,
            level=level
        )
        
        db.session.add(new_program)
        db.session.commit()

        safe_log(f"Admin {get_current_user().email} created education program: {title}")
        return success_response('Education program created successfully', program=new_program.to_dict())

    except Exception as e:
        db.session.rollback()
        safe_log(f"Error creating education program: {type(e).__name__}: {e}")
        return error_response('Unable to create education program', 500)

@api_bp.route('/education-programs/<int:program_id>', methods=['PUT'])
@token_required
@role_required(['admin'])
def update_education_program(program_id):
    try:
        program = EducationProgram.query.get_or_404(program_id)
        data = request.get_json()
        
        program.title = sanitize_input(data.get('title', program.title))
        program.description = sanitize_input(data.get('description', program.description))
        program.duration = sanitize_input(data.get('duration', program.duration))
        program.level = sanitize_input(data.get('level', program.level))
        
        db.session.commit()

        safe_log(f"Admin {get_current_user().email} updated education program: {program.title}")
        return success_response('Education program updated successfully', program=program.to_dict())

    except Exception as e:
        db.session.rollback()
        safe_log(f"Error updating education program: {type(e).__name__}: {e}")
        return error_response('Unable to update education program', 500)

@api_bp.route('/blog-posts/<int:post_id>', methods=['DELETE'])
@token_required
@role_required(['admin'])
def delete_blog_post(post_id):
    try:
        post = BlogPost.query.get_or_404(post_id)
        
        db.session.delete(post)
        db.session.commit()

        safe_log(f"Admin {get_current_user().email} deleted blog post: {post.title}")
        return success_response('Blog post deleted successfully')

    except Exception as e:
        db.session.rollback()
        safe_log(f"Error deleting blog post: {type(e).__name__}: {e}")
        return error_response('Unable to delete blog post', 500)

@api_bp.route('/education-programs/<int:program_id>', methods=['DELETE'])
@token_required
@role_required(['admin'])
def delete_education_program(program_id):
    try:
        program = EducationProgram.query.get_or_404(program_id)
        
        db.session.delete(program)
        db.session.commit()

        safe_log(f"Admin {get_current_user().email} deleted education program: {program.title}")
        return success_response('Education program deleted successfully')

    except Exception as e:
        db.session.rollback()
        safe_log(f"Error deleting education program: {type(e).__name__}: {e}")
        return error_response('Unable to delete education program', 500)

# --- PROFILE ROUTES ---

@api_bp.route('/incubator-profile', methods=['GET'])
@token_required
@role_required(['incubator'])
def get_incubator_profile():
    try:
        user = get_current_user()
        if not user:
            return error_response('User not found', 404)

        # Return incubator-specific profile data
        profile_data = {
            'name': user.name,
            'email': user.email,
            'role': user.role,
            'has_subscription': user.has_subscription,
            'status': user.status
        }
        
        return success_response("Fetched incubator profile", profile=profile_data)

    except Exception as e:
        safe_log(f"Error fetching incubator profile: {type(e).__name__}: {e}")
        return error_response('Unable to fetch profile', 500)

@api_bp.route('/msme-profile', methods=['GET'])
@token_required
@role_required(['organisation'])
def get_msme_profile():
    try:
        user = get_current_user()
        if not user:
            return error_response('User not found', 404)

        profile_data = {
            'name': user.name,
            'email': user.email,
            'role': user.role,
            'has_subscription': user.has_subscription,
            'status': user.status
        }
        
        return success_response("Fetched Organisation profile", profile=profile_data)

    except Exception as e:
        safe_log(f"Error fetching Organisation profile: {type(e).__name__}: {e}")
        return error_response('Unable to fetch profile', 500)

@api_bp.route('/mentor-profile', methods=['GET'])
@token_required
@role_required(['mentor'])
def get_mentor_profile():
    try:
        user = get_current_user()
        if not user:
            return error_response('User not found', 404)

        # Return mentor-specific profile data
        profile_data = {
            'name': user.name,
            'email': user.email,
            'role': user.role,
            'has_subscription': user.has_subscription,
            'status': user.status
        }
        
        return success_response("Fetched mentor profile", profile=profile_data)

    except Exception as e:
        safe_log(f"Error fetching mentor profile: {type(e).__name__}: {e}")
        return error_response('Unable to fetch profile', 500)

# --- DASHBOARD ROUTE ---

@api_bp.route('/dashboard', methods=['GET'])
@token_required
def get_dashboard():
    try:
        user = get_current_user()
        if not user:
            return error_response('User not found', 404)

        # Get role-specific dashboard data
        dashboard_data = {
            'user': {
                'name': user.name,
                'email': user.email,
                'role': user.role,
                'has_subscription': user.has_subscription,
                'status': user.status
            },
            'stats': {},
            'recent_activities': []
        }

        # Add role-specific stats
        if user.role == 'admin':
            dashboard_data['stats'] = {
                'total_users': User.query.count(),
                'total_subscribers': NewsletterSubscriber.query.count(),
                'total_blog_posts': BlogPost.query.count(),
                'total_programs': EducationProgram.query.count()
            }
        elif user.role == 'founder':
            dashboard_data['stats'] = {
                'applications_submitted': 0,  # Placeholder
                'applications_approved': 0,   # Placeholder
                'mentorship_sessions': 0      # Placeholder
            }
        elif user.role == 'mentor':
            dashboard_data['stats'] = {
                'mentees_count': 0,           # Placeholder
                'sessions_completed': 0,      # Placeholder
                'rating': 0.0                 # Placeholder
            }
        elif user.role == 'incubator':
            dashboard_data['stats'] = {
                'startups_incubated': 0,      # Placeholder
                'success_rate': 0.0,          # Placeholder
                'active_programs': 0          # Placeholder
            }
        elif user.role == 'organisation':
            dashboard_data['stats'] = {
                'collaborations': 0,          # Placeholder
                'challenges_posted': 0,       # Placeholder
                'solutions_received': 0       # Placeholder
            }

        return success_response("Fetched dashboard data", data=dashboard_data)

    except Exception as e:
        safe_log(f"Error fetching dashboard: {type(e).__name__}: {e}")
        return error_response('Unable to fetch dashboard data', 500)

# --- PRICING & PLANS ENDPOINTS ---

@api_bp.route('/plans', methods=['POST'])
@token_required
@role_required(['admin'])
def create_plan():
    data = request.get_json()
    name = data.get('name')
    price = data.get('price')
    description = data.get('description', '')
    if not name or price is None:
        return error_response('Name and price are required', 400)
    if not isinstance(price, int) or price < 0:
        return error_response('Price must be a non-negative integer', 400)
    plan = Plan(name=name, price=price, description=description)
    db.session.add(plan)
    db.session.commit()
    safe_log(f"Admin {get_current_user().email} created plan: {name}")
    return success_response("Plan created", plan=plan.as_dict())

@api_bp.route('/plans/<int:plan_id>', methods=['PUT'])
@token_required
@role_required(['admin'])
def update_plan(plan_id):
    plan = Plan.query.get(plan_id)
    if not plan:
        return error_response('Plan not found', 404)
    data = request.get_json()
    name = data.get('name', plan.name)
    price = data.get('price', plan.price)
    description = data.get('description', plan.description)
    if not isinstance(price, int) or price < 0:
        return error_response('Price must be a non-negative integer', 400)
    old_price = plan.price
    plan.name = name
    plan.price = price
    plan.description = description
    db.session.commit()
    # Log price change if price changed
    if old_price != price:
        user = get_current_user()
        hist = PricingHistory(plan_id=plan.id, old_price=old_price, new_price=price, changed_by=user.email)
        db.session.add(hist)
        db.session.commit()
    safe_log(f"Admin {get_current_user().email} updated plan: {name}")
    return success_response("Plan updated", plan=plan.as_dict())

@api_bp.route('/plans/<int:plan_id>', methods=['DELETE'])
@token_required
@role_required(['admin'])
def delete_plan(plan_id):
    plan = Plan.query.get(plan_id)
    if not plan:
        return error_response('Plan not found', 404)
    db.session.delete(plan)
    db.session.commit()
    safe_log(f"Admin {get_current_user().email} deleted plan: {plan.name}")
    return success_response('Plan deleted')

@api_bp.route('/coupons', methods=['POST'])
@token_required
@role_required(['admin'])
def create_coupon():
    data = request.get_json()
    code = data.get('code')
    amount = data.get('amount')
    ctype = data.get('type')
    plan_id = data.get('plan_id')
    if not code or amount is None or not ctype or not plan_id:
        return error_response('All fields are required', 400)
    if ctype not in ['percent', 'flat']:
        return error_response('Type must be percent or flat', 400)
    if not isinstance(amount, int) or amount < 0:
        return error_response('Amount must be a non-negative integer', 400)
    plan = Plan.query.get(plan_id)
    if not plan:
        return error_response('Plan not found', 404)
    if ctype == 'flat' and amount > plan.price:
        return error_response('Flat coupon cannot exceed plan price', 400)
    coupon = Coupon(code=code, amount=amount, type=ctype, plan_id=plan_id)
    db.session.add(coupon)
    db.session.commit()
    safe_log(f"Admin {get_current_user().email} created coupon: {code}")
    return success_response("Coupon created", coupon=coupon.as_dict())

@api_bp.route('/pricing-history', methods=['GET'])
@token_required
@role_required(['admin'])
def get_pricing_history():
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', PAGINATION_DEFAULT, type=int), PAGINATION_MAX)
    pagination = PricingHistory.query.order_by(PricingHistory.changed_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    safe_log(f"Admin {get_current_user().email} viewed pricing history page {page}")
    return success_response('Fetched pricing history', items=[h.as_dict() for h in pagination.items], total=pagination.total, pages=pagination.pages, current_page=pagination.page)

# --- Password Reset Flow ---
@api_bp.route('/reset-password', methods=['POST'])
@limiter.limit("3 per hour")  # Stricter limit for security
def reset_password():
    try:
        data = request.get_json()
        token = data.get('token')
        new_password = data.get('new_password')
        
        try:
            decoded = verify_token(token)
        except ValidationError as ve:
            safe_log(f"Password reset validation error: {type(ve).__name__}: {ve}")
            return error_response('Invalid or expired token', 400)

        user = User.query.filter_by(email=decoded['email']).first()
        if not user or user.reset_token != token:
            return error_response('Invalid or expired token', 400)
        # Validate password strength
        is_valid, message = validate_password_strength(new_password)
        if not is_valid:
            return error_response(message, 400)
        # Update password (support both Firebase and local users)
        if user.auth_provider == 'local' and user.password_hash:
            new_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
            if user.check_password_reuse(new_hash):
                return error_response('New password cannot be the same as any of your recent passwords.', 400)
            user.add_password_to_history(user.password_hash)
            user.password_hash = new_hash
        else:
            auth.update_user(user.uid, password=new_password)
        # Invalidate token
        user.reset_token = None
        db.session.commit()
        safe_log(f"Password reset for user: {user.email}")
        return success_response('Password updated successfully')
    except Exception as e:
        safe_log(f"Password reset error: {type(e).__name__}: {e}")
        return error_response('Unable to reset password', 500)

# --- Admin Dashboard Metrics ---
@api_bp.route('/admin/metrics', methods=['GET'])
@role_required(['admin'])
def get_admin_metrics():
    # Note: Consider caching or rate-limiting this endpoint if your user base grows.
    users_total = User.query.count()
    users_active = User.query.filter_by(status='active').count()
    roles = db.session.query(User.role, func.count(User.id)).group_by(User.role).all()
    by_role = {role: count for role, count in roles}
    subscriptions_active = User.query.filter_by(has_subscription=True).count()
    return success_response(
        "Fetched admin metrics",
        metrics={
            'users': {
                'total': users_total,
                'active': users_active,
                'by_role': by_role
            },
            'subscriptions': {
                'active': subscriptions_active,
                'trials': 0 
            }
        }
    )


@api_bp.route('/techtransfer', methods=['POST'])
@token_required
@role_required(['founder'])
@limiter.limit("2 per minute")
def submit_ip():
    try:
        user_id = get_current_user_id()
        if not user_id:
            return error_response({"error": "User not authenticated."}, 401)

        ipTitle = request.form.get("ipTitle")
        firstName = request.form.get("firstName")
        lastName = request.form.get("lastName")
        describetheTech = request.form.get("describetheTech")
        summary = request.form.get("summary")
        inventorName = request.form.get("inventorName")
        organization = request.form.get("organization")
        contactEmail = request.form.get("contactEmail")

        try:
            supporting_files = request.files.getlist("supportingFile")
            if len(supporting_files) > 5:
                safe_log("too_many_files")
                return error_response({"error": "You can upload a maximum of 5 files."}, 400)
        except Exception as e:
            safe_log("file_error")
            return error_response({"error": str(e)}, 500)

        required_fields = [ipTitle, firstName, lastName, describetheTech, summary, inventorName, organization, contactEmail]
        names = ["ipTitle", "firstName", "lastName", "describetheTech", "summary", "inventorName", "organization", "contactEmail"]
        missing = [n for n, v in zip(names, required_fields) if not v]
        if missing:
            return error_response({"error": f"Missing fields: {', '.join(missing)}"}, 400)

        if len(ipTitle) > 300:
            return error_response({"error": "IP Title exceeds 300 characters."}, 400)
        if len(firstName) > 300:
            return error_response({"error": "First Name exceeds 300 characters."}, 400)
        if len(lastName) > 300:
            return error_response({"error": "Last Name exceeds 300 characters."}, 400)
        if len(inventorName) > 300:
            return error_response({"error": "Inventor Name exceeds 300 characters."}, 400)
        if len(organization) > 300:
            return error_response({"error": "Organization exceeds 300 characters."}, 400)
        if len(summary) > 5000:
            return error_response({"error": "Summary exceeds 5000 characters."}, 400)
        if len(describetheTech) > 15000:
            return error_response({"error": "Description exceeds 15000 characters."}, 400)

        uploaded_paths = []
        try:
            for f in supporting_files:
                s3_folder_prefix = f"techtransfer_ips"
                path = upload_file_to_s3(f, s3_folder_prefix)
                uploaded_paths.append(path)
        except Exception as e:
            safe_log("upload_fail")
            return error_response({"error": str(e)}, 500)

        new_ip = TechTransferIP(
            user_id=user_id, 
            ipTitle=ipTitle,
            firstName=firstName,
            lastName=lastName,
            describetheTech=describetheTech,
            summary=summary,
            inventorName=inventorName,
            organization=organization,
            contactEmail=contactEmail,
            supportingFile=uploaded_paths
        )
        describetheTech_html = markdown.markdown(
        new_ip.describetheTech,
        extensions=[
            "extra",          
            "codehilite",     
            "sane_lists",     
            "toc",            
            "attr_list"       
        ]
        )
        db.session.add(new_ip)
        db.session.commit()
        admins = User.query.filter(User.role == "admin").all()
        submitter = User.query.filter(User.email == new_ip.contactEmail).first()
        try:  
            if not admins:
                safe_log("No admins found to notify.")
            else:
                for admin in admins:
                    if not admin.email:
                        continue
                    email_subject = f"ACTION REQUIRED: New IP Submission '{new_ip.ipTitle}'"
                    html_body = f"""
                    <html>
                    <body style="margin:0; padding:0; background-color:#f8f9fa; font-family:Arial, sans-serif;">
                        <!-- Header -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#1a1f36;">
                        <tr>
                            <td align="center" style="padding:24px;">
                            <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" alt="Hustloop Logo"
                                style="max-width:160px; height:auto; display:block; margin:0 auto 12px auto;">
                            <h2 style="margin:0; font-size:22px; font-weight:600; color:#ffffff;">
                                New IP Submission Received
                            </h2>
                            </td>
                        </tr>
                        </table>

                        <!-- Body -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8f9fa;">
                        <tr>
                            <td style="padding:24px; font-size:16px; line-height:1.6; color:#333;">
                            <p>Dear {admin.name},</p>
                            <p>
                                A new <strong>Technology Transfer IP</strong> proposal has been submitted and is awaiting your review.
                            </p>

                            <table width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse; margin:24px 0;">
                                <tr>
                                <td width="30%" style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">IP Title:</td>
                                <td style="padding:8px; border:1px solid #ddd;">{new_ip.ipTitle}</td>
                                </tr>
                                <tr>
                                <td style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">Submitted By:</td>
                                <td style="padding:8px; border:1px solid #ddd;">{new_ip.firstName} {new_ip.lastName} ({new_ip.organization})</td>
                                </tr>
                                <tr>
                                <td colspan="2" style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa;">
                                <span style="font-weight:600;">Summary:</span>
                                    <div style="color:#333; line-height:1.6;">
                                    {new_ip.summary}
                                    </div>
                                </td>
                                </tr>
                                <tr>
                                    <td colspan="2" style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; "><span style="font-weight:600;">Described About Technology:</span>
                                        <div style="color:#333; line-height:1.6;">
                                            <table width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                                                <tr>
                                                <td style="font-family:Arial, sans-serif;">
                                                    {describetheTech_html}
                                                </td>
                                                </tr>
                                            </table>
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <div align="center" style="margin:24px 0;">
                                <a href="https://hustloop.com/?id={new_ip.id}" target="_blank"
                                style="display:inline-block; padding:10px 20px; background-color:#0d6efd;
                                        color:#ffffff; font-weight:600; text-decoration:none;
                                        border-radius:6px; border:1px solid #0d6efd;">
                                Review Submission
                                </a>
                            </div>

                            <p>
                                Please log in to the <strong>Hustloop</strong> to review the details and take the next steps.
                            </p>

                            <p>
                                Regards,<br>
                                <strong>Hustloop</strong>
                            </p>
                            </td>
                        </tr>
                        </table>

                        <!-- Footer -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f3f5;">
                        <tr>
                            <td align="center" style="padding:20px; font-size:14px; color:#666; font-family:Arial, sans-serif;">
                            <div style="margin-bottom:8px;">
                                © {datetime.now().year} Hustloop. All rights reserved.
                            </div>
                            <div style="margin-top:10px;">
                                <a href="https://x.com/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                                <img src="{os.getenv('X_ICON')}" alt="X"
                                    style="width:24px; height:24px; vertical-align:middle; display:inline-block;">
                                </a>
                                <a href="https://linkedin.com/company/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                                <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn"
                                    style="width:24px; height:24px; vertical-align:middle; display:inline-block;">
                                </a>
                            </div>
                            </td>
                        </tr>
                        </table>

                    </body>
                    </html>
                    """

                    send_email(
                                recipients=[admin.email],
                                subject=email_subject,
                                html_body=html_body,
                                sender=('Hustloop', current_app.config['MAIL_USERNAME'])
                    )
            if submitter and submitter.email:
                email_subject = f"Thank You for Submitting Your IP: '{new_ip.ipTitle}'"
                html_body = f"""
                <html>
                    <body style="font-family: Arial, sans-serif; background-color:#f8f9fa; margin:0; padding:0;">

                        <div style="background-color:#1a1f36; text-align:center; padding:24px;">
                            <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" alt="Hustloop Logo"
                                style="max-width:160px; height:auto; display:block; margin:0 auto 12px auto;">
                            <h2 style="margin:0; font-size:22px; font-weight:600; color:#ffffff;">
                                Thank You for Your IP Submission
                            </h2>
                        </div>

                        <div style="padding:24px; font-size:16px; line-height:1.6; color:#333;">
                            <p>Dear {submitter.name},</p>
                            <p>
                                Thank you for submitting your Intellectual Property (IP) titled 
                                <strong>{new_ip.ipTitle}</strong> through the Hustloop Technology Transfer platform.
                            </p>

                            <p>
                                Our Triager team has received your submission and will review it shortly.
                                You will be notified once your submission’s status changes.
                            </p>

                            <table style="width:100%; border-collapse:collapse; margin:24px 0;">
                                <tr>
                                    <td style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">IP Title:</td>
                                    <td style="padding:8px; border:1px solid #ddd;">{new_ip.ipTitle}</td>
                                </tr>
                                <tr>
                                    <td style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">Submitted On:</td>
                                    <td style="padding:8px; border:1px solid #ddd;">{format_datetime(datetime.now())}</td>
                                </tr>
                                <tr>
                                    <td style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">Organization:</td>
                                    <td style="padding:8px; border:1px solid #ddd;">{new_ip.organization}</td>
                                </tr>
                            </table>
                            <p>
                                We appreciate your contribution to the innovation ecosystem. 
                                If you have any questions or need to update your submission, please reach out to our support team.
                            </p>

                            <p>
                                Best regards,<br>
                                <strong>The Hustloop Team</strong>
                            </p>
                        </div>

                        <!-- Footer -->
                        <div style="background-color:#f1f3f5; text-align:center; padding:20px; font-size:14px; color:#666;">
                            <div style="margin-bottom:8px;">
                                © {datetime.now().year} Hustloop. All rights reserved.
                            </div>

                            <div style="margin-top:10px;">
                                <a href="https://x.com/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                                    <img src="{os.getenv("X_ICON")}" alt="X"
                                        style="width:24px; height:24px; vertical-align:middle;">
                                </a>
                                <a href="https://linkedin.com/company/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                                    <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn"
                                        style="width:24px; height:24px; vertical-align:middle;">
                                </a>
                            </div>
                        </div>
                    </body>
                </html>
                """
                send_email(
                        recipients=[submitter.email],
                        subject=email_subject,
                        html_body=html_body,
                        sender=('Hustloop', current_app.config['MAIL_USERNAME'])
                )
            safe_log(f"New IP submission notification sent for IP {new_ip.id} to admin and submit person.")
        except Exception as email_error:
            safe_log(f"Failed to send admin notification for new IP {new_ip.id}: {email_error}")
        return jsonify(new_ip.as_dict()), 201
    except Exception as e:
        db.session.rollback()
        safe_log(f"TechTransfer IP submission failed: {e}")
        return jsonify({"error": "An internal server error occurred during submission."}), 500
    
@api_bp.route('/techtransfer/<string:ip_id>', methods=['DELETE'])
@token_required
@role_required(['admin']) 
def delete_ip(ip_id):
    try:
        ip_submission = TechTransferIP.query.get(ip_id)
        if not ip_submission:
            return jsonify({"error": "IP submission not found."}), 404

        user_id = get_current_user_id()
        try:
            restore_record = TechTransferIPRestore(
                ip_instance=ip_submission, 
                action='DELETED',
                action_user_id=user_id 
            )
            db.session.add(restore_record)
            safe_log(f"Restore record created for IP {ip_id} by user {user_id}")
        except Exception as e:
            safe_log(f"Failed to create restore record for IP {ip_id}: {e}")
        db.session.delete(ip_submission)
        db.session.commit()
        safe_log(f"TechTransfer IP {ip_id} successfully deleted and backed up by user {user_id}")
        return jsonify({"message": f"IP submission {ip_id} deleted and archived successfully."}), 200
        
    except Exception as e:
        db.session.rollback()
        safe_log(f"Failed to delete IP {ip_id}: {e}")
        return jsonify({"error": "An internal server error occurred while deleting the submission."}), 500
    

@api_bp.route('/techtransfer/restore', methods=['GET'])
@token_required
@role_required(['admin'])
def get_deleted_ips():
    try:
        deleted_records = (
            db.session.query(TechTransferIPRestore, User)
            .outerjoin(User, TechTransferIPRestore.action_by_user_id == User.uid)
            .filter(TechTransferIPRestore.action_type == 'DELETED')
            .all()
        )
        

        if not deleted_records:
            return jsonify({"message": "No deleted IP submissions found."}), 200

        results = []
        for restore_record, user in deleted_records:
            
            record_dict = restore_record.as_dict()
            record_dict["action_by_user_name"] = f"{user.name}" if user else None
            record_dict["action_by_user_email"] = user.email if user else None
            results.append(record_dict)

        return jsonify(results), 200

    except Exception as e:
        safe_log(f"Failed to fetch deleted IPs: {e}")
        return jsonify({"error": "Failed to fetch deleted IP submissions."}), 500


@api_bp.route('/techtransfer/restore/<string:restore_id>', methods=['POST'])
@token_required
@role_required(['admin'])
def restore_deleted_ip(restore_id):
    try:
        restore_record = TechTransferIPRestore.query.get(restore_id)
        if not restore_record:
            return jsonify({"error": f"No restore record found for ID {restore_id}"}), 404

        safe_log(f"restore_record: {restore_record}")

        restored_ip = TechTransferIP(
            id=restore_record.original_ip_id,
            user_id=restore_record.user_id,
            ipTitle=restore_record.ipTitle,
            firstName=restore_record.firstName,
            lastName=restore_record.lastName,
            describetheTech=restore_record.describetheTech,
            summary=restore_record.summary,
            inventorName=restore_record.inventorName,
            organization=restore_record.organization,
            contactEmail=restore_record.contactEmail,
            supportingFile=restore_record.supportingFile,
            approvalStatus=restore_record.approvalStatus
        )

        db.session.add(restored_ip)
        db.session.delete(restore_record)
        db.session.commit()

        safe_log(f"Successfully restored IP {restore_record.original_ip_id} and deleted restore record {restore_id}")

        return jsonify({"message": f"IP {restore_record.original_ip_id} restored successfully and backup removed."}), 200

    except Exception as e:
        db.session.rollback()
        safe_log(f"Failed to restore IP {restore_id}: {e}")
        return jsonify({"error": "Failed to restore IP submission."}), 500

@api_bp.route('/techtransfer/my-ips', methods=['GET'])
@token_required
@role_required(['founder'])
def get_my_ips():
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"error": "User ID not found in token."}), 401

        ips = TechTransferIP.query.filter_by(user_id=user_id).all()
        
        result = [ip.as_dict() for ip in ips]
        
        return jsonify({"ips": result, "count": len(result)}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@api_bp.route('/techtransfer/myGraph', methods=['GET'])
@token_required
@role_required(['founder', 'admin']) 
def myGraph():
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"error": "User ID not found in token."}), 401

        user_role = get_current_user() 

        is_admin = user_role.role == 'admin'
        query_filter = True

        if not is_admin:
            query_filter = TechTransferIP.user_id == user_id

        # Get submissions grouped by year
        submissions_query = db.session.query(
            extract('year', TechTransferIP.timestamp).label('year'),
            func.count(TechTransferIP.id).label('total_submissions')
        )

        if not is_admin:
            submissions_query = submissions_query.filter(query_filter)
            
        submissions_by_year = (
            submissions_query
            .group_by('year')
            .order_by('year')
            .all()
        )

        # Get submissions grouped by date (for contribution graph)
        daily_submissions_query = db.session.query(
            func.date(TechTransferIP.timestamp).label('date'),
            func.count(TechTransferIP.id).label('count')
        )

        if not is_admin:
            daily_submissions_query = daily_submissions_query.filter(query_filter)

        daily_submissions = (
            daily_submissions_query
            .group_by(func.date(TechTransferIP.timestamp))
            .all()
        )

        # Format daily data
        daily_data = []
        for submission_date, count in daily_submissions:
            if isinstance(submission_date, str):
                date_str = submission_date
            else:
                date_str = submission_date.strftime("%Y-%m-%d")
            
            daily_data.append({
                "date": date_str,
                "count": count
            })

        ip_details_query = db.session.query(
            TechTransferIP.ipTitle,
            TechTransferIP.describetheTech,
            TechTransferIP.summary,
            TechTransferIP.timestamp,
            TechTransferIP.approvalStatus
        )

        if not is_admin:
            ip_details_query = ip_details_query.filter(query_filter)

        ip_details = (
            ip_details_query
            .order_by(TechTransferIP.timestamp.desc())
            .all()
        )

        def time_ago(dt):
            now = datetime.now()
            diff = now - dt
            seconds = diff.total_seconds()

            if seconds < 60:
                return "just now"
            elif seconds < 3600:
                minutes = int(seconds // 60)
                return f"{minutes}m ago"
            elif seconds < 86400:
                hours = int(seconds // 3600)
                return f"{hours}h ago"
            elif seconds < 2592000: 
                days = int(seconds // 86400)
                return f"{days}d ago"
            elif seconds < 31536000: 
                months = int(seconds // 2592000)
                return f"{months}mo ago"
            else:
                years = int(seconds // 31536000)
                return f"{years}y ago"

        ip_details_list = [
            {
                "title": ip.ipTitle,
                "summary": ip.summary,
                "date": time_ago(ip.timestamp),
                "approval_status": ip.approvalStatus
            }
            for ip in ip_details
        ]

        result = [{"year": int(year), "total_submissions": total} for year, total in submissions_by_year]
        
        if result:
            start_year = min(item['year'] for item in result)
            end_year = max(item['year'] for item in result)
            full_result = []

            for y in range(start_year, end_year + 1):
                match = next((item for item in result if item['year'] == y), None)
                full_result.append({
                    "year": y,
                    "total_submissions": match['total_submissions'] if match else 0
                })
        else:
            full_result = []
        safe_log(daily_data)
        return jsonify({
            "ips": full_result,
            "daily_submissions": daily_data,
            "ips_details": ip_details_list,
            "count": len(full_result)
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@api_bp.route('/solutions/myGraph', methods=['GET'])
@token_required
@role_required(['founder', 'admin']) 
def solutions_graph():
    """
    Returns solution submission activity data for GitHub-style contribution graph.
    Shows submissions by year, by day, and detailed submission information.
    """
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"error": "User ID not found in token."}), 401

        user_role = get_current_user() 
        is_admin = user_role.role == 'admin'
        
        # Build query filter
        query_filter = True if is_admin else Solution.user_id == user_id

        # Get submissions grouped by year
        submissions_query = db.session.query(
            extract('year', Solution.created_at).label('year'),
            func.count(Solution.id).label('total_submissions')
        )

        if not is_admin:
            submissions_query = submissions_query.filter(query_filter)
            
        submissions_by_year = (
            submissions_query
            .group_by('year')
            .order_by('year')
            .all()
        )

        # Get submissions grouped by date (for GitHub-style graph)
        daily_submissions_query = db.session.query(
            func.date(Solution.created_at).label('date'),
            func.count(Solution.id).label('count')
        )

        if not is_admin:
            daily_submissions_query = daily_submissions_query.filter(query_filter)
            
        daily_submissions = (
            daily_submissions_query
            .group_by(func.date(Solution.created_at))
            .all()
        )

        # Format daily data
        daily_data = []
        for submission_date, count in daily_submissions:
            # Handle both date objects and strings
            if isinstance(submission_date, str):
                date_str = submission_date
            else:
                date_str = submission_date.strftime("%Y-%m-%d")
            
            daily_data.append({
                "date": date_str,
                "count": count
            })

        # Get detailed submission information
        solutions_details_query = db.session.query(
            Solution.id,
            Solution.description,
            Solution.created_at,
            Solution.status,
            Solution.points,
            Solution.reward_amount,
            Collaboration.title.label('challenge_title')
        ).join(
            Collaboration, Solution.challenge_id == Collaboration.id
        )

        if not is_admin:
            solutions_details_query = solutions_details_query.filter(query_filter)

        solutions_details = (
            solutions_details_query
            .order_by(Solution.created_at.desc())
            .all()
        )

        def time_ago(dt):
            """Convert datetime to human-readable time ago format"""
            now = datetime.now()
            diff = now - dt
            seconds = diff.total_seconds()

            if seconds < 60:
                return "just now"
            elif seconds < 3600:
                minutes = int(seconds // 60)
                return f"{minutes}m ago"
            elif seconds < 86400:
                hours = int(seconds // 3600)
                return f"{hours}h ago"
            elif seconds < 2592000: 
                days = int(seconds // 86400)
                return f"{days}d ago"
            elif seconds < 31536000: 
                months = int(seconds // 2592000)
                return f"{months}mo ago"
            else:
                years = int(seconds // 31536000)
                return f"{years}y ago"

        # Format solution details
        solutions_details_list = []
        for solution in solutions_details:
            # Check if user is a winner (has reward_amount > 0)
            is_winner = solution.reward_amount and solution.reward_amount > 0
            
            detail = {
                "id": solution.id,
                "challenge_title": solution.challenge_title,
                "description": solution.description[:100] + "..." if len(solution.description) > 100 else solution.description,
                "date": time_ago(solution.created_at),
                "status": solution.status.value if solution.status else "new",
            }
            
            # Winners get reward_amount, others get points
            if is_winner:
                detail["reward_amount"] = solution.reward_amount
                detail["points"] = solution.points or 0
                detail["is_winner"] = True
            else:
                detail["points"] = solution.points or 0
                detail["is_winner"] = False
            
            solutions_details_list.append(detail)

        # Format year data
        result = [{"year": int(year), "total_submissions": total} for year, total in submissions_by_year]
        
        # Fill in missing years
        if result:
            start_year = min(item['year'] for item in result)
            end_year = max(item['year'] for item in result)
            full_result = []

            for y in range(start_year, end_year + 1):
                match = next((item for item in result if item['year'] == y), None)
                full_result.append({
                    "year": y,
                    "total_submissions": match['total_submissions'] if match else 0
                })
        else:
            full_result = []

        return jsonify({
            "solutions": full_result,
            "daily_submissions": daily_data,
            "solutions_details": solutions_details_list,
            "count": len(full_result)
        }), 200

    except Exception as e:
        safe_log(f"Error in solutions_graph: {str(e)}")
        return jsonify({"error": str(e)}), 500


@api_bp.route('/collaborations/myGraph', methods=['GET'])
@token_required
@role_required(['organisation'])
def collaborations_graph():
    """
    Returns solution activity data for organisation's collaborations.
    Shows total count of all solutions submitted to user's collaborations.
    """
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"error": "User ID not found in token."}), 401

        # Get all solutions grouped by year
        solutions_query = db.session.query(
            extract('year', Solution.created_at).label('year'),
            func.count(Solution.id).label('total_submissions')
        ).join(
            Collaboration, Solution.challenge_id == Collaboration.id
        ).filter(
            Collaboration.user_id == user_id
        )
            
        solutions_by_year = (
            solutions_query
            .group_by('year')
            .order_by('year')
            .all()
        )

        # Get all solutions grouped by date (for GitHub-style graph)
        daily_solutions_query = db.session.query(
            func.date(Solution.created_at).label('date'),
            func.count(Solution.id).label('count')
        ).join(
            Collaboration, Solution.challenge_id == Collaboration.id
        ).filter(
            Collaboration.user_id == user_id
        )
            
        daily_solutions = (
            daily_solutions_query
            .group_by(func.date(Solution.created_at))
            .all()
        )

        # Format daily data
        daily_data = []
        for submission_date, count in daily_solutions:
            if isinstance(submission_date, str):
                date_str = submission_date
            else:
                date_str = submission_date.strftime("%Y-%m-%d")
            
            daily_data.append({
                "date": date_str,
                "count": count
            })

        # Get collaboration details with solution counts
        collaboration_details_query = db.session.query(
            Collaboration.id,
            Collaboration.title,
            Collaboration.status,
            Collaboration.created_at,
            func.count(Solution.id).label('total_solutions')
        ).outerjoin(
            Solution,
            Solution.challenge_id == Collaboration.id
        ).filter(
            Collaboration.user_id == user_id
        ).group_by(
            Collaboration.id,
            Collaboration.title,
            Collaboration.status,
            Collaboration.created_at
        ).order_by(
            Collaboration.created_at.desc()
        )

        collaboration_details = collaboration_details_query.all()

        # Format collaboration details
        collaboration_details_list = []
        for collab in collaboration_details:
            detail = {
                "id": collab.id,
                "title": collab.title,
                "total_solutions": collab.total_solutions or 0,
                "status": collab.status.value if collab.status else "draft",
                "created_at": collab.created_at.strftime("%Y-%m-%d") if collab.created_at else None
            }
            collaboration_details_list.append(detail)

        # Format year data
        solutions_result = [{"year": int(year), "total_submissions": total} for year, total in solutions_by_year]
        
        # Fill in missing years
        if solutions_result:
            start_year = min(item['year'] for item in solutions_result)
            end_year = max(item['year'] for item in solutions_result)
            full_solutions_result = []

            for y in range(start_year, end_year + 1):
                match = next((item for item in solutions_result if item['year'] == y), None)
                full_solutions_result.append({
                    "year": y,
                    "total_submissions": match['total_submissions'] if match else 0
                })
        else:
            full_solutions_result = []

        return jsonify({
            "solutions": full_solutions_result,
            "daily_submissions": daily_data,
            "collaboration_details": collaboration_details_list,
            "summary": {
                "total_solutions": sum(item['total_submissions'] for item in full_solutions_result),
                "total_collaborations": len(collaboration_details_list)
            }
        }), 200

    except Exception as e:
        safe_log(f"Error in collaborations_graph: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
    
@api_bp.route('/getIps', methods=['GET'])
@token_required
@role_required(['admin'])
def get_ips():
    try:
        ips = TechTransferIP.query.all()
        result = []
        for ip in ips:
            ip_dict = ip.as_dict()

            raw_files = ip_dict.get("supportingFile")

            if raw_files:
                if isinstance(raw_files, str):
                    raw_files = [raw_files]

                files = []
                for f in raw_files:
                    key = f[0] if isinstance(f, list) else f
                    try:
                        url = generate_presigned_url(key)
                        files.append(url)
                    except Exception:
                        files.append(None)

                ip_dict["supportingFile"] = files

            result.append(ip_dict)

        return jsonify({"ips": result, "count": len(result)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    
@api_bp.route('/getTechTransfer', methods=['GET'])
def get_ip():
    try:
        try:
            ip_id = request.args.get('id', type=str)
            result = []

            if ip_id:
                ip = TechTransferIP.query.filter_by(id=ip_id, approvalStatus='approved').first()
                if not ip:
                    return error_response({"error": f"No approved TechTransfer IP found with id {ip_id}"}, 404)
                ips = [ip]
            else:
                ips = TechTransferIP.query.filter_by(approvalStatus='approved').all()

            for ip in ips:
                ip_dict = ip.as_dict()
                ip_dict["user_id"] = None

                raw_files = ip.supportingFile
                urls = []

                if raw_files:
                    if isinstance(raw_files, str):
                        raw_files = [raw_files]

                    for f in raw_files:
                        key = f[0] if isinstance(f, list) else f
                        try:
                            url = generate_presigned_url(key)
                            urls.append(url)
                        except Exception:
                            urls.append(None)

                ip_dict["supportingFileUrl"] = urls
                ip_dict["supportingFile"] = None
                result.append(ip_dict)

        except Exception as e:
            safe_log("query_error")
            return error_response({"error": str(e)}, 500)

        safe_log("ip_fetched")
        return success_response({"ips": result, "count": len(result)})
    except Exception as e:
        safe_log("general_error")
        return error_response({"error": "An internal server error occurred while fetching IP submissions."}, 500)

VALID_STATUSES = {status.value for status in ApprovalStatus}

@api_bp.route('/techtransfer/<string:id>/status', methods=['PUT'])
@token_required
@role_required(['admin'])
def update_ip_status(id):
    try:
        data = request.get_json()
        new_status = data.get('status')

        if not new_status or new_status not in VALID_STATUSES:
            return jsonify({"error": "Invalid or missing 'status' field. Allowed values are: " + ", ".join(VALID_STATUSES)}), 400

        ip_record = TechTransferIP.query.get(id)
        
        
        if not ip_record:
            return jsonify({"error": "IP record not found"}), 404

        ip_record.approvalStatus = ApprovalStatus(new_status)
        db.session.commit()

        user = User.query.get(ip_record.user_id)
        
        admin_users = User.query.filter(User.role == "admin").all()
        status_color = (
                "#28a745" if new_status == "approved"
                else "#dc3545" if new_status == "rejected"
                else "#0d6efd"
            )
        
        submission_url = f'https://hustloop.com/?id={id}'
        
        view_submission_button = f"""
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="left" style="margin-top: 20px; margin-bottom: 20px;">
                    <tr>
                        <td style="border-radius: 4px; background: #007bff; text-align: center;">
                            <a href="{submission_url}" target="_blank" style="
                                background: #007bff; 
                                border: 1px solid #007bff; 
                                font-family: Arial, sans-serif; 
                                font-size: 15px; 
                                line-height: 1.1; 
                                text-align: center; 
                                text-decoration: none; 
                                display: block; 
                                border-radius: 4px; 
                                font-weight: bold; 
                                padding: 10px 20px; 
                                color: #ffffff;
                                mso-padding-alt: 10px 20px;
                            ">
                                View Submission Details
                            </a>
                        </td>
                    </tr>
                </table>
            """
        for admin in admin_users:
            if not admin.email:
                continue
            admin_html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 0;">
                <div style="background-color:#1a1f36; text-align:center; padding:24px;">
                <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" alt="Hustloop Logo" 
                    style="max-width:160px; height:auto; display:block; margin:0 auto 12px auto;">
                <h2 style="margin:0; font-size:22px; font-weight:600; color:#ffffff;">
                    IP Status Updated
                </h2>
                </div>

                <div style="padding:24px; font-size:16px; line-height:1.6; color:#333;">
                <p>Dear {admin.name},</p>
                <p>
                    The status of the Intellectual Property titled 
                    <strong>{ip_record.ipTitle}</strong>, submitted by 
                    <strong>{user.name}</strong>, has been updated to 
                    <strong style="color:{status_color};">{new_status.capitalize()}</strong>.
                </p>
                <table style="width:100%; border-collapse:collapse; margin:24px 0;">
                    <tr>
                    <td style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">IP Title:</td>
                    <td style="padding:8px; border:1px solid #ddd;">{ip_record.ipTitle}</td>
                    </tr>
                    <tr>
                    <td style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">Submitted By:</td>
                    <td style="padding:8px; border:1px solid #ddd;">{user.name} ({user.email})</td>
                    </tr>
                    <tr>
                    <td style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">New Status:</td>
                    <td style="padding:8px; border:1px solid #ddd;">
                        <span style="
                        display:inline-block;
                        padding:6px 14px;
                        border-radius:6px;
                        font-weight:600;
                        font-size:15px;
                        color:{status_color};
                        text-transform:capitalize;
                        background-color:{status_color}20;
                        border:1px solid {status_color}40;
                        ">
                        {new_status.capitalize()}
                        </span>
                    </td>
                    </tr>
                    <tr>
                    <td style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">Updated On:</td>
                    <td style="padding:8px; border:1px solid #ddd;">{format_datetime(datetime.now())}</td>
                    </tr>
                </table>
                {view_submission_button}
                <p style="clear:both; display:block;">
                    You can review this submission and its details in the 
                    <strong>Hustloop Admin Dashboard</strong>.
                </p>

                <p>
                    Regards,<br>
                    <strong>Hustloop</strong>
                </p>
                </div>

                <!-- Footer -->
                <div style="background-color:#f1f3f5; text-align:center; padding:20px; font-size:14px; color:#666;">
                <div style="margin-bottom:8px;">
                    © {datetime.now().year} Hustloop. All rights reserved.
                </div>

                <div style="margin-top:10px;">
                    <a href="https://x.com/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                    <img src="{os.getenv("X_ICON")}" alt="X" 
                        style="width:24px; height:24px; vertical-align:middle;">
                    </a>
                    <a href="https://linkedin.com/company/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                    <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" 
                        style="width:24px; height:24px; vertical-align:middle;">
                    </a>
                </div>
                </div>
            </body>
            </html>
            """
            send_email(
                recipients=[admin.email],
                subject=f"Admin Notification: {ip_record.ipTitle} Status Updated to {new_status.capitalize()}",
                html_body=admin_html_body,
                sender=('Hustloop', current_app.config['MAIL_USERNAME'])
            )
        if user and user.email:
            email_subject = f"Update on Your Tech Transfer: {ip_record.ipTitle}"
            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 0;">
                <div style="background-color:#1a1f36; text-align:center; padding:24px;">
                <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" alt="Hustloop Logo" 
                    style="max-width:160px; height:auto; display:block; margin:0 auto 12px auto;">
                <h2 style="margin:0; font-size:22px; font-weight:600; color:#ffffff;">Technology Transfer Status Update</h2>
                </div>


                <div style="padding:24px; font-size:16px; line-height:1.6; color:#333;">
                    <p>Dear {user.name},</p>

                    <p>
                    The status of your submitted Intellectual Property
                    <strong>{ip_record.ipTitle}</strong> has been updated.
                    </p>

                    <div style="text-align:center; margin:24px 0;">
                    <span style="
                        display:inline-block;
                        padding:6px 14px;
                        border-radius:6px;
                        font-weight:600;
                        font-size:15px;
                        color:{status_color};
                        text-transform:capitalize;
                        background-color:{status_color}20;
                        border:1px solid {status_color}40;
                    ">
                        {new_status.capitalize()}
                    </span>
                    </div>

                    <p>
                    You can log in to your Tech Transfer Portal for more details and next steps.
                    </p>

                    <p>
                    Best regards,<br>
                    <strong>Hustloop</strong>
                    </p>
                </div>

                <!-- Footer with social media icons -->
                <div style="background-color:#f1f3f5; text-align:center; padding:20px; font-size:14px; color:#666;">
                    <div style="margin-bottom:8px;">
                    © {datetime.now().year} Hustloop. All rights reserved.
                    </div>

                    <div style="margin-top:10px;">
                    <a href="https://x.com/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                        <img src="{os.getenv("X_ICON")}" alt="X" 
                            style="width:24px; height:24px; vertical-align:middle;">
                    </a>
                    <a href="https://linkedin.com/company/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                        <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" 
                            style="width:24px; height:24px; vertical-align:middle;">
                    </a>
                    </div>
                </div>
                </div>
            </body>
            </html>
            """
            send_email(
                recipients=[user.email],
                subject=email_subject,
                html_body=html_body,
                sender=('Hustloop', current_app.config['MAIL_USERNAME'])
            )
        else:
            safe_log(f"No valid email found for user_id={ip_record.user_id}")
        return jsonify(ip_record.as_dict()), 200
    except Exception as e:
        db.session.rollback()
        safe_log(f"Error updating IP status: {str(e)}")
        return jsonify({"error": str(e)}), 500

    
@api_bp.route('/techtransfer/saveDraft', methods=['POST'])
@token_required
@role_required(['founder'])
def save_draft():
    try:
        
        user_id = get_current_user_id()
        ipTitle = request.form.get("ipTitle")
        describetheTech = request.form.get("describetheTech")
        summary = request.form.get("summary")
        inventorName = request.form.get("inventorName")
        organization = request.form.get("organization")
        firstName = request.form.get("firstName")
        lastName = request.form.get("lastName")
        contactEmail = request.form.get("contactEmail")


        safe_log(f"User {user_id} requested to save a draft.")

        draft = DraftTechTransferIP(
                user_id=user_id,
                ipTitle=ipTitle,
                firstName=firstName,
                lastName=lastName,
                describetheTech=describetheTech,
                summary=summary,
                inventorName=inventorName,
                organization=organization,
                contactEmail = contactEmail,
                approvalStatus="draft",
            )
        db.session.add(draft)
        action = "created"

        db.session.commit()
        safe_log(f"Draft {action} successfully for user_id={user_id} (ipTitle='{draft.ipTitle}').")
        return jsonify({"message": "Draft saved successfully"}), 200

    except Exception as e:
        safe_log(
            f"Error saving draft for user_id={user_id}: {str(e)}", 
        )
        return jsonify({"error": "An unexpected error occurred while saving the draft."}), 500


@api_bp.route('/techtransfer/getDraft', methods=['GET'])
@token_required
@role_required(['founder'])
def get_draft():
    try:
        user_id = get_current_user_id()

        draft = (
            DraftTechTransferIP.query
            .filter_by(user_id=user_id, approvalStatus='draft')
            .first()
        )
       
        if not draft:
            safe_log(f"No draft found for user_id={user_id}")
            return jsonify({"message": "No draft found"}), 404

        draft_data = {
            "id": draft.id,
            "ipTitle": draft.ipTitle,
            "firstName": draft.firstName,
            "lastName": draft.lastName,
            "describetheTech": draft.describetheTech,
            "summary":draft.summary,
            "inventorName": draft.inventorName,
            "organization": draft.organization,
            "contactEmail": draft.contactEmail,
            "approvalStatus": draft.approvalStatus.value if draft.approvalStatus else None
        }

        db.session.delete(draft)
        db.session.commit()
        print("draft:",draft_data)
        safe_log(f"Draft retrieved and deleted for user_id={user_id}, ipTitle={draft.ipTitle}")
        return jsonify(draft_data), 200

    except Exception as e:
        safe_log(f"Error fetching/deleting draft for user_id={user_id}: {str(e)}")
        return jsonify({"error": "An unexpected error occurred while fetching the draft."}), 500

@api_bp.route('/techtransfer/loadDraft', methods=['GET'])
@token_required
@role_required(['founder'])
def load_draft():
    try:
        user_id = get_current_user_id()
        draft = (
            DraftTechTransferIP.query
            .filter_by(user_id=user_id, approvalStatus='draft')
            .first()
        )
        if not draft:
            safe_log(f"No draft found for user_id={user_id}")
            return jsonify({"message": "No draft found"}), 404
        draft_data = {
            "id": draft.id,
            "ipTitle": draft.ipTitle,
            "firstName": draft.firstName,
            "lastName": draft.lastName,
            "describetheTech": draft.describetheTech,
            "summary":draft.summary,
            "inventorName": draft.inventorName,
            "organization": draft.organization,
            "contactEmail": draft.contactEmail,
            "approvalStatus": draft.approvalStatus.value if draft.approvalStatus else None
        }
        safe_log(f"Draft retrieved for user_id={user_id}, ipTitle={draft.ipTitle}")
        return jsonify(draft_data), 200
    except Exception as e:
        safe_log(f"Error fetching/deleting draft for user_id={user_id}: {str(e)}")
        return jsonify({"error": "An unexpected error occurred while fetching the draft."}), 500

    
def save_uploaded_file(file):
    if not file:
        return None
    filename = f"{datetime.utcnow().timestamp()}_{file.filename}"
    file_path = f"uploads/{filename}"

    return file_path

@socketio.on('join')
def on_join(room_name):
    join_room(room_name)
    print(f"Client joined room: {room_name}")
    
@api_bp.route('/tt_ip/<string:ip_id>/comments', methods=['POST'])
@token_required
@role_required(['admin', 'founder'])
def add_needinfo_comment(ip_id):
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Authentication required'}), 401

    comment = request.form.get('comment', '').strip()
    parent_id = request.form.get('parent_id')
    is_draft = request.form.get('is_draft', 'false').lower() == 'true'
    file = request.files.get('supportingFile')
    
    if not S3_BUCKET_NAME:
        safe_log("S3_BUCKET_NAME is not set — check environment variables or .env file")

    if file:
        data = file.read()
        file.seek(0)
    

    if not comment and not file:
        return jsonify({'error': 'Comment text or an attached file is required'}), 400

    ip_record = TechTransferIP.query.get(ip_id)
    if not ip_record:
        return jsonify({'error': 'TechTransferIP record not found'}), 404

    try:
        file_path = upload_file_to_s3(file, ip_id) if file else None
        file_name = file.filename if file else None

        if is_draft:
            response_data = {
                'message': 'Draft saved successfully',
                'file_key': file_path, 
                'file_name': file_name
            }
            return jsonify(response_data), 200

        new_comment = NeedInfoComment(
            tech_transfer_ip_id=ip_id,
            comment=comment,
            comment_user_id=current_user.uid,
            parent_id=parent_id, 
            supportingFile=file_path)
        
        db.session.add(new_comment)
        db.session.commit()

        is_founder_commenting = (ip_record.user_id == current_user.uid)
        
        recipient_emails = []
        recipient_name = ""

        if is_founder_commenting:
            admins = User.query.filter(User.role.ilike('%admin%')).all() 
            recipient_emails = [admin.email for admin in admins]
            recipient_names = [admin.name for admin in admins]  
            recipient_name = ", ".join(recipient_names)
            safe_log(f"Founder {current_user.name} commented on IP {ip_id}.")
        elif ip_record.user and ip_record.user.email:
            recipient_emails = [ip_record.user.email]
            recipient_name = ip_record.user.name

        submission_url = f"https://hustoop.com/?id={ip_id}"
        email_subject = f"New Comment on IP Submission: {ip_record.ipTitle}"

        view_submission_button = ""
        if any('admin' in (u.role or '').lower() for u in User.query.filter(User.email.in_(recipient_emails)).all()):
            view_submission_button = f"""
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="left" style="margin-top: 20px; margin-bottom: 20px;">
                    <tr>
                        <td style="border-radius: 4px; background: #007bff; text-align: center;">
                            <a href="{submission_url}" target="_blank" style="
                                background: #007bff; 
                                border: 1px solid #007bff; 
                                font-family: Arial, sans-serif; 
                                font-size: 15px; 
                                line-height: 1.1; 
                                text-align: center; 
                                text-decoration: none; 
                                display: block; 
                                border-radius: 4px; 
                                font-weight: bold; 
                                padding: 10px 20px; 
                                color: #ffffff;
                                mso-padding-alt: 10px 20px;
                            ">
                                View Submission Details
                            </a>
                        </td>
                    </tr>
                </table>
            """

        html_body = f"""
        <html>
            <body style="margin:0; padding:0; background-color:#f8f9fa; font-family:Arial, sans-serif;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#1a1f36;">
                    <tr>
                        <td align="center" style="padding:24px;">
                            <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" alt="Hustloop Logo"
                                style="max-width:160px; height:auto; display:block; margin:0 auto 12px auto;">
                            <h2 style="margin:0; font-size:22px; font-weight:600; color:#ffffff;">
                                New Comment on IP Submission
                            </h2>
                        </td>
                    </tr>
                </table>

                <table role="presentation" align="center" width="100%" cellspacing="0" cellpadding="0" border="0"
                    style="max-width:640px; background-color:#ffffff; margin:32px auto; border-radius:8px;
                            box-shadow:0 2px 8px rgba(0,0,0,0.05); padding:32px;">
                    <tr>
                        <td style="font-size:16px; color:#333333;">
                            <p>Hi {recipient_name},</p>

                            <p>A new comment was posted on the IP submission titled 
                            <b>{ip_record.ipTitle}</b> (ID: {ip_id}).</p>

                            <p><b>Comment Author:</b> {current_user.name}</p>

                            <p style="margin-top:10px; padding:12px; border-left:3px solid #ccc; background-color:#f9f9f9;">
                                <b>Comment:</b> {comment}
                            </p>

                            {f'<p><b>Attachment:</b> {file_name}</p>' if file_name else ''}
                            
                            {view_submission_button}
                            <p style="margin-top:32px; clear:both; display:block;">
                                Best regards,<br>The Hustloop Team
                            </p>
                        </td>
                    </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                        style="background-color:#f1f3f5;">
                        <tr>
                            <td align="center" style="padding:20px; font-size:14px; color:#666; font-family:Arial, sans-serif;">
                                <div style="margin-bottom:8px;">
                                    © {datetime.now().year} Hustloop. All rights reserved.
                                </div>
                                <div style="margin-top:10px;">
                                    <a href="https://x.com/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                                        <img src="{os.getenv('X_ICON')}" alt="X"
                                            style="width:24px; height:24px; vertical-align:middle; display:inline-block;">
                                    </a>
                                    <a href="https://linkedin.com/company/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                                        <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn"
                                            style="width:24px; height:24px; vertical-align:middle; display:inline-block;">
                                    </a>
                                </div>
                            </td>
                        </tr>
                </table>
            </body>
        </html>
        """
        try:
            send_email(
                recipients=recipient_emails,
                subject=email_subject,
                html_body=html_body,
                sender=('Hustloop', current_app.config['MAIL_USERNAME'])
            )
            safe_log(f"Comment notification sent for IP {ip_id} to {recipient_emails}")
        except Exception as email_error:
            safe_log(f"Failed to send email notification for IP {ip_id}: {email_error}")

        comment_data = new_comment.as_dict()

        if file_path:
            presigned_url = generate_presigned_url(file_path)
            comment_data['fileURL'] = presigned_url
            comment_data['fileName'] = file_name
            if 'supportingFile' in comment_data:
                del comment_data['supportingFile'] 

        if 'parent_id' not in comment_data:
            comment_data['parent_id'] = parent_id
            
        comment_data['name'] = current_user.name
        comment_data['comment_user_id'] = current_user.uid
        
        socketio.emit('new_comment_added', comment_data, room=f'ip_{ip_id}')
        
        return jsonify(comment_data), 200
    
    except Exception as e:
        db.session.rollback()
        safe_log(
            f"Failed to add comment to TechTransferIP {ip_id} by user {current_user.uid}: {e}"
        )
        return jsonify({'error':f"An internal server error occurred while adding the comment {e}"}), 500

@token_required
@role_required(['admin', 'founder'])
def upload_file_to_s3(file,ip_id):
    current_user = get_current_user()
    if not file or file.filename == '':
        return None
    
    filename = secure_filename(file.filename)
    
    file_extension = os.path.splitext(filename)[1]
    unique_filename = f"{ip_id}/{datetime.now().strftime('%Y/%m/%d')}/{os.path.splitext(filename)[0]}{file_extension}"
    
    allowed_extensions = {'.pdf', '.doc', '.docx'}
    if file_extension.lower() not in allowed_extensions:
        raise ValueError(f"File type {file_extension} not allowed")
    
    try:
        file.seek(0)
        file_content = file.read()
        
        if not file_content:
            raise ValueError("File is empty")
        
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=unique_filename,
            Body=file_content,
            ContentType=file.content_type or 'application/octet-stream',
            Metadata={
                'uploaded_by': str(current_user.uid),
                'uploaded_at': datetime.now(IST).isoformat(),
                'original_filename': filename,
                'ip_record_id': ip_id
            },
            StorageClass='STANDARD'
        )
        return unique_filename
        
    except Exception as e:
        safe_log(f"S3 upload failed for file {filename}: {e}")
        raise ValueError(f"Failed to upload file to S3: {str(e)}")

def upload_file_to_s3_collaboration(file):
    current_user = get_current_user()

    if not file or file.filename == "":
        return None

    filename = secure_filename(file.filename)
    file_extension = os.path.splitext(filename)[1].lower()

    allowed_extensions = {'.pdf', '.doc', '.docx'}
    if file_extension not in allowed_extensions:
        raise ValueError(f"File type {file_extension} not allowed")
        
    unique_filename = f"challenges/{os.path.splitext(filename)[0]}-{uuid.uuid4().hex}{file_extension}"

    try:
        file.seek(0)
        file_content = file.read()

        if not file_content:
            raise ValueError("File is empty")

        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=unique_filename,
            Body=file_content,
            ContentType=file.content_type or "application/octet-stream",
            Metadata={
                "uploaded_by": str(current_user.uid),
                "uploaded_at": datetime.now(IST).isoformat(),
                "original_filename": filename,
            },
            ContentDisposition=f'attachment; filename="{filename}"', 
            StorageClass="STANDARD",
        )

        return f"https://{S3_BUCKET_NAME}.s3.amazonaws.com/{unique_filename}"

    except Exception as e:
        safe_log(f"S3 upload failed for file {filename}: {e}")
        raise ValueError(f"Failed to upload file to S3: {str(e)}")



def generate_presigned_url(s3_key, expiration=3600):
    if not s3_key:
        return None
    try:
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': S3_BUCKET_NAME,
                'Key': s3_key,
                'ResponseContentDisposition': f'attachment; filename="{s3_key.split("/")[-1]}"'
            },
            ExpiresIn=expiration
        )
        return presigned_url
    except Exception as e:
        safe_log(f"Failed to generate presigned URL for {s3_key}: {e}")
        return None


def delete_file_from_s3(s3_key):
    if not s3_key:
        return
    try:
        s3_client.delete_object(
            Bucket=S3_BUCKET_NAME,
            Key=s3_key
        )
        safe_log(f"Successfully deleted S3 file: {s3_key}")
    except Exception as e:
        safe_log(f"Failed to delete S3 file {s3_key}: {e}")
        
        
@api_bp.route('/tt_ip/<string:ip_id>/comments', methods=['GET'])
@token_required
@role_required(['admin', 'founder'])
def get_needinfo_comments(ip_id):
    current_user = get_current_user()
    
    if not current_user:
        return jsonify({'error': 'Authentication required'}), 401
    try:
        ip_record = TechTransferIP.query.get(ip_id)

        if not ip_record:
            return jsonify({'error': 'TechTransferIP record not found'}), 404
        
        raw_files = ip_record.supportingFile if isinstance(ip_record.supportingFile, list) else [ip_record.supportingFile]
        
        file_urls = []

        for f in raw_files:
            key = f[0] if isinstance(f, list) else f
            try:
                url = generate_presigned_url(key)
                file_urls.append(url)
            except Exception:
                file_urls.append(None)

        ip_details = {
            "name": ip_record.firstName + " " + ip_record.lastName,
            "id": ip_record.id,
            "filePath": file_urls[0] if file_urls else None,
            "title": ip_record.ipTitle,
            "describetheTech": ip_record.describetheTech,
            "summary": ip_record.summary,
            "approvalStatus": ip_record.approvalStatus,
            "organization": ip_record.organization,
            "supportingFile": file_urls
        }

        comments = (
            db.session.query(NeedInfoComment, User)
            .join(User, NeedInfoComment.comment_user_id == User.uid)
            .filter(NeedInfoComment.tech_transfer_ip_id == ip_id)
            .order_by(NeedInfoComment.timestamp) 
            .all()
        )
        comments_list = []
        
        for comment, user in comments:
            comment_dict = comment.as_dict()
            
            comment_dict["name"] = user.name
            comment_dict["parent_id"] = comment.parent_id 
            
            if comment.supportingFile:
                try:
                    presigned_url = generate_presigned_url(comment.supportingFile)
                    comment_dict["fileURL"] = presigned_url
                    comment_dict["fileName"] = os.path.basename(comment.supportingFile)
                    if "supportingFileUrl" in comment_dict:
                        del comment_dict["supportingFileUrl"]
                    if "supportingFileKey" in comment_dict:
                         del comment_dict["supportingFileKey"]
                         
                except Exception as e:
                    safe_log(f"Failed to generate presigned URL for {comment.supportingFile}: {e}")
                    comment_dict["fileURL"] = None

            comments_list.append(comment_dict)

        return jsonify({
            'ip_details': ip_details,
            'comments': comments_list
        }), 200

    except Exception as e:
        safe_log(f"Error fetching comments for TechTransferIP {ip_id}: {e}")
        return jsonify({
            'error': 'An internal server error occurred while fetching comments.'
        }), 500


    
@api_bp.route('/tt_ip/<string:comment_id>/comments', methods=['PUT'])
@token_required
@role_required(['admin', 'founder'])
def update_comment_route(comment_id):
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Authentication required'}), 401

    try:
        data = request.get_json()
        new_text = data.get('comment')

        if not new_text:
            return jsonify({"error": "New comment text is required"}), 400

        comment = NeedInfoComment.query.get(comment_id)
        
        if not comment:
            return jsonify({"error": "Comment not found"}), 404
        user_roles = current_user.role
        is_admin = 'admin' in user_roles
        is_owner = comment.comment_user_id == current_user.uid
        
        can_proceed_with_update = False
        can_update = ''
        
        if is_admin:
            can_proceed_with_update = True
        elif is_owner:
            created_ist = comment.timestamp
            now_ist = datetime.now(comment.timestamp.tzinfo)
            can_update = now_ist <= created_ist + timedelta(minutes=5)
            if can_update:
                can_proceed_with_update = True
            else:
                return jsonify({
                    "error": "Comment can only be updated within 5 minutes of creation",
                    "can_delete": False
                }), 403
        elif 'founder' in user_roles:
            return jsonify({"error": "You can only update your own comments"}), 403        
        else:
            return jsonify({"error": "You can only update your own comments"}), 403

        comment.comment = new_text
        comment.isUpdated = True
        
        db.session.commit()

        updated_comment = comment.as_dict()

        socketio.emit('comment_updated', updated_comment, room=f'ip_{comment.tech_transfer_ip_id}')

        return jsonify({
            "message": "Comment updated successfully",
            "comment": updated_comment,
            "can_update": True
        }), 200

    except Exception as e:
        db.session.rollback()
        try:
            safe_log(f"Error updating comment {comment_id}: {e}")
        except TypeError:
            print(f"[safe_log] {e}")
        return jsonify({'error': 'An internal server error occurred'}), 500

@api_bp.route('/tt_ip/<string:comment_id>/comments', methods=['DELETE'])
@token_required
@role_required(['admin', 'founder'])
def delete_comment_route(comment_id):
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Authentication required'}), 401

    try:
        comment = NeedInfoComment.query.get(comment_id)
        if not comment:
            return jsonify({"error": "Comment not found"}), 404

        user_roles = current_user.role
        is_admin = 'admin' in user_roles
        is_owner = comment.comment_user_id == current_user.uid
        
        can_proceed_with_deletion = False

        if is_admin:
            can_proceed_with_deletion = True
        elif is_owner:
            created_ist = comment.timestamp
            now_ist = datetime.now(comment.timestamp.tzinfo) if comment.timestamp.tzinfo else datetime.now(IST)
            
            can_delete_within_time = now_ist <= created_ist + timedelta(minutes=30)
            
            if can_delete_within_time:
                can_proceed_with_deletion = True
            else:
                return jsonify({
                    "error": "Comment can only be deleted within 30 minutes of creation",
                    "can_delete": False
                }), 403
        elif 'founder' in user_roles:
            return jsonify({"error": "You can only delete your own comments"}), 403
        else:
            return jsonify({"error": "You can only delete your own comments"}), 403

        ip_id = comment.tech_transfer_ip_id
        file_key = comment.supportingFile  

        if file_key:
            try:
                delete_file_from_s3(file_key)
                safe_log(f"Deleted S3 file for comment {comment_id}: {file_key}")
            except Exception as s3_error:
                safe_log(f"Failed to delete S3 file for comment {comment_id}: {s3_error}")
        db.session.delete(comment)
        db.session.commit()
        socketio.emit('comment_deleted', {"id": comment_id}, room=f'ip_{ip_id}')

        return jsonify({
            "message": "Comment deleted successfully",
            "can_delete": True,
            "deleted_id": comment_id
        }), 200

    except Exception as e:
        db.session.rollback()
        try:
            safe_log(f"Error deleting comment {comment_id}: {e}")
        except TypeError:
            print(f"[safe_log] {e}")
        return jsonify({'error': 'An internal server error occurred'}), 500


@api_bp.route('/agnite-registrations', methods=['POST'])
@limiter.limit("2 per minute")
def agnite_registrations():
    # Check if event is enabled using the model itself
    if not AigniteRegistration.is_enabled():
        return jsonify({"error": "Event not found or not available"}), 404
    
    if not request.is_json:
        return jsonify({"error": "Request body must be JSON"}), 400

    data = request.get_json()

    full_name = data.get('full_name')
    email_address = data.get('email_address')
    phone_number = data.get('phone_number')
    event = data.get('event')
    who_you_are = data.get('who_you_are')

    if not all([full_name, email_address, phone_number]):
        return jsonify({"error": "All fields are required"}), 400

    if AigniteRegistration.query.filter_by(email_address=email_address).first():
        return jsonify({"error": "Email address already registered"}), 409

    # Create a new Registration object
    new_registration = AigniteRegistration(
        full_name=full_name,
        email_address=email_address,
        phone_number=phone_number,
        event='aignite' ,
        who_you_are=who_you_are
    )

    try:
        db.session.add(new_registration)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Could not save registration"}), 500

    try:
        html_body = f"""
        <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f0f4f8; padding: 20px 0;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);">
        
        <!-- Header Image & Logo -->
        <tr>
            <td align="center" style="padding: 20px; background-color: #f8f9fa;">
                <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" alt="Aignite Logo" style="max-width: 180px; height: auto; display: block; margin: 0 auto;">
            </td>
        </tr>
        
        <!-- Main Content Section -->
        <tr>
            <td style="padding: 30px 40px; line-height: 1.6; color: #333333; text-align: left;">
                <h2 style="color: #1a1a1a; font-size: 24px; margin-top: 0; margin-bottom: 20px; font-weight: 700;">Hi {full_name},</h2>
                
                <p style="margin: 0 0 24px; font-size: 16px;">
                    Thank you for registering for <b>SIF's Aignite</b>. We’re excited to have you join the online workshop. 
                    It runs for 6 days, 4 hours per day. We’ll follow up soon with the agenda, session links, and reminders.
                </p>

                <!-- Payment Details Block -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #e6e9ff; border-radius: 8px; padding: 15px; margin-bottom: 24px; border-left: 5px solid #5560e0;">
                    <tr>
                        <td style="font-size: 15px; color: #1a1a1a;">
                            <p style="margin: 0 0 10px; font-weight: bold;">&#8226; Early Bird: <span style="font-size: 18px; color: #1a1a1a;">₹3,500</span> <s style="color: #777777;"> (Regular ₹4,500)</s></p>
                            <p style="margin: 0 0 10px; font-weight: bold;">&#8226; If you’ve already paid via QR, you can ignore the link below.</p>
                            <p style="margin: 0; font-weight: bold;">&#8226; If not, secure your spot now:</p>
                        </td>
                    </tr>
                </table>

                <!-- Call to Action Button (Payment) -->
                <div style="text-align: center; margin: 20px 0;">
                    <a href="{os.getenv('PAYMENT_LINK')}" style="display: inline-block; background-color: #5560e0; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; text-align: center; transition: background-color 0.3s;">Complete Payment</a>
                </div>

                <h3 style="color: #1a1a1a; font-size: 20px; margin-top: 30px; margin-bottom: 10px; border-bottom: 1px solid #eeeeee; padding-bottom: 5px;">What’s Next</h3>
                <ul style="padding-left: 20px; margin: 0 0 30px; font-size: 15px;">
                    <li style="margin-bottom: 8px;">Once payment is confirmed, your seat is reserved.</li>
                    <li>You’ll receive a final confirmation email with all the event essentials.</li>
                </ul>

                <!-- Hustloop Promotion Section (UNIQUE BOX) -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f0f7ff; border-radius: 8px; padding: 25px; margin-top: 30px; border: 1px solid #d0e8ff;">
                    <tr>
                        <td style="font-family: 'Inter', Helvetica, Arial, sans-serif;">
                            <h3 style="color: #1a1a1a; font-size: 20px; margin-top: 0; margin-bottom: 15px; text-align: center;">
                                <span style="color: #5560e0;">💡</span> Get Early Access to Hustloop
                            </h3>
                            <p style="margin: 0 0 16px; font-size: 15px;">Hustloop is a collaborative platform that connects MSMEs with innovators and problem solvers. Post real operational challenges, receive crowdsourced solutions from qualified teams, and choose the best idea to develop into a working prototype or MVP.</p>
                            
                            <h4 style="color: #5560e0; font-size: 16px; margin-top: 20px; margin-bottom: 8px;">How it works</h4>
                            <ul style="padding-left: 20px; margin: 0 0 16px; font-size: 15px;">
                                <li style="margin-bottom: 8px;">Transparent shortlisting of submissions</li>
                                <li style="margin-bottom: 8px;">Milestone-based rewards for winning teams</li>
                                <li>Points system for shortlisted participants</li>
                            </ul>
                            
                            <h4 style="color: #5560e0; font-size: 16px; margin-top: 20px; margin-bottom: 8px;">Why it matters</h4>
                            <ul style="padding-left: 20px; margin: 0 0 20px; font-size: 15px;">
                                <li style="margin-bottom: 8px;">List your toughest problem statements for free</li>
                                <li style="margin-bottom: 8px;">Crowdsource multiple ideas, select the best, and guide it to MVP</li>
                                <li>Pay a small success fee only when a solution meets your milestones</li>
                            </ul>
                            
                            <p style="margin: 0 0 20px; font-size: 15px; font-weight: bold; text-align: center;">
                                As an early supporter, you’ll be first to try Hustloop and shape our product roadmap!
                            </p>

                            <!-- Dedicated CTA for Hustloop -->
                            <div style="text-align: center;">
                                <a href="{os.getenv('WEBSITE_LINK')}" style="display: inline-block; background-color: #ff6a00; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; text-align: center; transition: background-color 0.3s;">Join the Early Access Program</a>
                            </div>
                        </td>
                    </tr>
                </table>
                <!-- End Hustloop Promotion Section -->

                <p style="margin: 30px 0 0;"><strong>Questions?</strong></p>
                <p style="margin: 0 0 16px;">Visit our website or Contact page. We’re here to help.</p>
                
                <p style="margin: 24px 0 0; font-size: 16px;">Sincerely,<br/><strong>The Hustloop Team</strong></p>
                <p style="margin: 4px 0 0; font-size: 14px; color: #5560e0;">Smart hustle. Infinite growth.</p>
            </td>
        </tr>

        <!-- Footer Section -->
        <tr>
            <td style="padding: 20px 40px; background-color: #f8f9fa; border-top: 1px solid #eeeeee;">
                
                <!-- Social Media Icons -->
                <div style="text-align: center; margin-bottom: 15px;">
                    <a href="{os.getenv('X_LINK')}" style="margin: 0 10px; display: inline-block;"><img src="{os.getenv('X_ICON')}" alt="X" style="height: 24px; width: 24px; border-radius: 4px;"></a>
                    <a href="{os.getenv('LINKEDIN_LINK')}" style="margin: 0 10px; display: inline-block;"><img src="{os.getenv('LINKEDIN_ICON')}" alt="LinkedIn" style="height: 24px; width: 24px; border-radius: 4px;"></a>
                </div>
                
                <!-- Footer Text -->
                <div style="text-align: center; font-size: 12px; color: #999999;">
                    <p style="margin: 0 0 4px;">&copy; 2025 Hustloop. All rights reserved.</p>
                    <p style="margin: 0;">You are receiving this email because you registered on our website.</p>
                </div>
            </td>
        </tr>
    </table>
</div>

        """

        send_email(
            recipients=[email_address],
            subject=f"Successfully Registered for {event}",
            html_body=html_body,
            sender=('Hustloop', current_app.config['MAIL_USERNAME'])
        )
        safe_log(f"Registration for Aignite successful:{email_address}")
    except Exception as e:
        safe_log(f"Email sending failed: {e}")
    return jsonify({"message": "Registration successful", "email": email_address}), 201

    
@api_bp.route('/get-aignite', methods=['GET'])
@token_required
@role_required(["admin"])
def get_aignite():
    # Get query parameters
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    fetch_all = request.args.get('all', 'false').lower() == 'true'

    if fetch_all:
        registrations = AigniteRegistration.query.filter_by(is_config_record=False).order_by(AigniteRegistration.registered_at.desc()).all()
        output = [
            {
                'id': reg.id,
                'full_name': reg.full_name,
                'email_address': reg.email_address,
                'phone_number': reg.phone_number,
                'event': reg.event,
                'who_you_are': reg.who_you_are,
                'registered_at': reg.registered_at.isoformat()
            }
            for reg in registrations
        ]
        return jsonify({
            'items': output,
            'total': len(output),
            'page': 1,
            'per_page': len(output),
            'pages': 1,
            'has_next': False,
            'has_prev': False
        })
    
    # Paginated fetch (default behavior) - exclude config records
    paginated_registrations = AigniteRegistration.query.filter_by(is_config_record=False).order_by(AigniteRegistration.registered_at.desc()).paginate(
        page=page,
        per_page=per_page,
        error_out=False
    )

    registrations = paginated_registrations.items
    output = [
        {
            'id': reg.id,
            'full_name': reg.full_name,
            'email_address': reg.email_address,
            'phone_number': reg.phone_number,
            'event': reg.event,
            'who_you_are': reg.who_you_are,
            'registered_at': reg.registered_at.isoformat()
        }
        for reg in registrations
    ]

    return jsonify({
        'items': output,
        'total': paginated_registrations.total,
        'page': paginated_registrations.page,
        'per_page': paginated_registrations.per_page,
        'pages': paginated_registrations.pages,
        'has_next': paginated_registrations.has_next,
        'has_prev': paginated_registrations.has_prev
    })

    

        
@api_bp.route('/delete-multiple-aignite', methods=['POST'])
@token_required
@role_required(['admin'])
def delete_multiple_aignite_registrations():
    try:
        data = request.get_json()
        ids = data.get('ids', [])

        if not ids or not isinstance(ids, list):
            return jsonify({
                'message': 'Invalid request. Provide a list of IDs to delete.'
            }), 400


        delete_count = (
            AigniteRegistration.query
            .filter(AigniteRegistration.id.in_(ids))
            .delete(synchronize_session='fetch')
        )
        db.session.commit()

        return jsonify({
            'message': f'Successfully deleted {delete_count} Aignite registration(s).',
            'deleted_count': delete_count
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'An error occurred during bulk deletion.',
            'error': str(e)
        }), 500


@api_bp.route('/event-config/<string:event_name>', methods=['GET'])
def get_event_config(event_name):
    """Public endpoint to check if an event is enabled"""
    try:
        config = AigniteRegistration.get_event_config()
        return jsonify({
            'event_name': event_name,
            'is_enabled': config.is_event_enabled if config else False
        }), 200
    except Exception as e:
        safe_log(f"Error fetching event config: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@api_bp.route('/admin/event-config/aignite/toggle', methods=['POST'])
@token_required
@role_required(['admin'])
def toggle_event_availability():
    try:
        config = AigniteRegistration.get_event_config()
        
        # Store the previous state
        previous_state = config.is_event_enabled
        
        # Toggle the enabled status
        config.is_event_enabled = not config.is_event_enabled
        db.session.commit()
        
        new_state = config.is_event_enabled
        status_text = "Is Running" if new_state else "Not Running"
        
        # Get all admin users from database
        admin_users = User.query.filter_by(role='admin').all()
        
        subject = f"Event Status Changed: Aignite Registration {status_text}"
        
        email_body = f"""
        <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f0f4f8; padding: 20px 0;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);">
        
        <!-- Header Image & Logo -->
        <tr>
            <td align="center" style="padding: 20px; background-color: #f8f9fa;">
                <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" alt="Hustloop Logo" style="max-width: 180px; height: auto; display: block; margin: 0 auto;">
            </td>
        </tr>
        
        <!-- Main Content Section -->
        <tr>
            <td style="padding: 30px 40px; line-height: 1.6; color: #333333; text-align: left;">
                <h2 style="color: {'#16a34a' if new_state else '#ef4444'}; font-size: 24px; margin-top: 0; margin-bottom: 20px; font-weight: 700;">
                    Event Registration Status Changed
                </h2>
                
                <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid {'#16a34a' if new_state else '#ef4444'};">
                    <p style="margin: 10px 0; font-size: 15px;"><strong>Event:</strong> Aignite 2024</p>
                    <p style="margin: 10px 0; font-size: 15px;"><strong>Previous Status:</strong> {'Enabled' if previous_state else 'Disabled'}</p>
                    <p style="margin: 10px 0; font-size: 15px;"><strong>New Status:</strong> <span style="color: {'#16a34a' if new_state else '#ef4444'}; font-weight: 700; font-size: 16px;">{status_text}</span></p>
                    <p style="margin: 10px 0; font-size: 15px;"><strong>Changed At:</strong> {datetime.now(IST).strftime('%Y-%m-%d %H:%M:%S IST')}</p>
                </div>
                
                <p style="color: #555; margin-top: 20px; font-size: 15px; line-height: 1.6;">
                    {'✅ Registration is now <strong>open to the public</strong>. Users can access the registration page and submit their details.' if new_state else '🚫 Registration has been <strong>closed</strong>. The event page will display a 404 error to visitors.'}
                </p>
                
                <div style="background-color: #fff7ed; padding: 15px; border-radius: 6px; margin-top: 20px; border-left: 3px solid #f59e0b;">
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                        <strong>ℹ️ Note:</strong> This change affects the public-facing registration page immediately.
                    </p>
                </div>
            </td>
        </tr>
        
        <!-- Footer Section -->
        <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 15px 0; font-size: 14px; color: #666;">
                    Stay connected with us on social media
                </p>
                
                <!-- Social Media Icons -->
                <table border="0" cellspacing="0" cellpadding="0" align="center">
                    <tr>
                        <td style="padding: 0 10px;">
                            <a href="https://www.linkedin.com/company/hustloop/" target="_blank" style="text-decoration: none;">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png" alt="LinkedIn" style="width: 32px; height: 32px; display: block; border-radius: 4px;">
                            </a>
                        </td>
                        <td style="padding: 0 10px;">
                            <a href="https://www.instagram.com/hustloop/" target="_blank" style="text-decoration: none;">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" alt="Instagram" style="width: 32px; height: 32px; display: block; border-radius: 4px;">
                            </a>
                        </td>
                        <td style="padding: 0 10px;">
                            <a href="https://x.com/hustloop" target="_blank" style="text-decoration: none;">
                                <img src="https://about.x.com/content/dam/about-twitter/x/brand-toolkit/logo-black.png.twimg.1920.png" alt="X (Twitter)" style="width: 32px; height: 32px; display: block; border-radius: 4px;">
                            </a>
                        </td>
                    </tr>
                </table>
                
                <p style="margin: 20px 0 0 0; color: #999; font-size: 12px; line-height: 1.5;">
                    This is an automated notification from HustLoop Event Management System.<br>
                    © {datetime.now().year} Hustloop. All rights reserved.
                </p>
            </td>
        </tr>
    </table>
</div>
        """
        
        for admin in admin_users:
            try:
                send_email(
                    recipients=[admin.email],
                    subject=subject,
                    html_body=email_body,
                    sender=('Hustloop', current_app.config['MAIL_USERNAME'])
                )
                safe_log(f"Event toggle notification sent to admin: {admin.email}")
            except Exception as email_error:
                safe_log(f"Failed to send email notification to {admin.email}: {str(email_error)}")
                # Continue sending to other admins even if one fails
        
        return jsonify({
            'message': f'Event aignite {"enabled" if new_state else "disabled"}',
            'event_config': {
                'event_name': 'aignite',
                'is_enabled': new_state
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        safe_log(f"Error toggling event config: {str(e)}")
        import traceback
        safe_log(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500




# @api_bp.route("/upload-logo", methods=["POST"])
# @token_required
# @role_required(['organisation'])
# def upload_logo(file):
#     if not file:
#         return jsonify({"error": "No file provided"}), 400

#     allowed_extensions = {"jpg", "jpeg", "png"}
#     if not file.filename.lower().endswith(tuple(allowed_extensions)):
#         return jsonify({"error": "File type not allowed. Use JPG or PNG."}), 400

#     filename = f"msme_logos/{file.filename}"
    
#     try:
#         s3_client.upload_fileobj(
#             file,
#             S3_BUCKET_NAME,
#             filename,
#             ExtraArgs={"ContentType": file.content_type}
#         )
#         logo_url = f"https://{S3_BUCKET_NAME}.s3.{os.getenv('AWS_DEFAULT_REGION')}.amazonaws.com/{filename}"
#         return jsonify({"logo_url": logo_url}), 200
#     except Exception as e:
#         safe_log(f"Error uploading to S3:, {e}")
#         return jsonify({"error": "Failed to upload file"}), 500


@api_bp.route("/msme-profiles", methods=["POST"])
@token_required
@role_required(['organisation'])
@limiter.limit("2 per minute")
def create_or_update_msme_profile():
    user = get_current_user()
    if not user:
        return error_response("User not found", 404)


    form = request.form
    safe_log(f"Form Data:{form}")
    file = request.files.get('logo')  
    
    company_name = form.get("company_name")
    sector = form.get("sector")
    description = form.get("short_description", "")
    website_url = form.get("website_url", "")
    linkedin_url = form.get("linkedin_url", "")
    affiliated_by = form.get("affiliated_by", "")
    x_url = form.get("x_url", "")
    phone_number = form.get("phone_number", "")
    instagram_url = form.get("instagram_url", "")

    if not company_name:
        return error_response("Company name is required", 400)
    if len(company_name) > 300: 
        return error_response("Company name must not exceed 300 characters.", 400)
    if not sector:
        return error_response("Sector is required", 400)
    if len(sector) > 300:
        return error_response("Sector name must not exceed 300 characters.", 400)
    
    if description and len(description) > 15000:
        return error_response("Description must not exceed 15000 characters.", 400)

    if website_url and len(website_url) > 300:
        return error_response("Website URL must not exceed 300 characters.", 400)

    if linkedin_url and len(linkedin_url) > 300:
        return error_response("LinkedIn URL must not exceed 300 characters.", 400)

    if x_url and len(x_url) > 300:
        return error_response("X URL must not exceed 300 characters.", 400)
    
    if instagram_url and len(instagram_url) > 300:
        return error_response("Instagram URL must not exceed 300 characters.", 400)
    
    if phone_number and len(phone_number) > 10:
        return error_response("Phone number must not exceed 10 characters.", 400)
    
    if len(affiliated_by) > 300:
        return error_response("Affiliated By must not exceed 300 characters.", 400)

    logo_url = None
    
    if file:
        try:
            if file.filename.split(".")[-1].lower() not in {"jpg", "jpeg", "png"}:
                return error_response("Logo must be a JPG, JPEG, or PNG file", 400)

            logo_files = request.files.getlist('logo')
            if len(logo_files) != 1:
                return error_response("Only one logo file is allowed", 400)
            

            filename = f"msme_logos/{file.filename}"
            s3_client.upload_fileobj(
                file,
                S3_BUCKET_NAME,
                filename,
                ExtraArgs={"ContentType": file.content_type,"ContentDisposition": "attachment"}
            )
            logo_url = f"https://{S3_BUCKET_NAME}.s3.{os.getenv('AWS_DEFAULT_REGION')}.amazonaws.com/{filename}"
        except Exception as e:
            safe_log(f"Error uploading to S3: {e}")
            return jsonify({"error": "Failed to upload file"}), 500

    profile = MSMEProfile.query.filter_by(user_id=user.uid).first()
    
    is_new_profile = profile is None  

    if profile:
        profile.company_name = company_name or profile.company_name
        profile.sector = sector or profile.sector
        profile.description = description or profile.description
        profile.website_url = website_url or profile.website_url
        profile.linkedin_url = linkedin_url or profile.linkedin_url
        profile.x_url = x_url or profile.x_url
        profile.instagram_url = instagram_url or profile.instagram_url
        profile.phone_number = phone_number or profile.phone_number
        profile.affiliated_by = affiliated_by or profile.affiliated_by
        if logo_url:
            profile.logo_url = logo_url 

        profile.is_submitted = True
        profile.is_editable = False
    else:
        profile = MSMEProfile(
            company_name=company_name,
            sector=sector,
            description=description,
            affiliated_by=affiliated_by,
            website_url=website_url,
            linkedin_url=linkedin_url,
            x_url=x_url,
            instagram_url=instagram_url,
            phone_number=phone_number,
            logo_url=logo_url,
            user_id=user.uid,
            is_submitted=True,
            is_editable=False
        )
        db.session.add(profile)

    try:
        db.session.commit()
        safe_log("organisation Profile saved successfully", user.uid)

        if is_new_profile:
            try:
                admins = User.query.filter(User.role == "admin").all()
                
                social_media_html = ""
                if linkedin_url or x_url or instagram_url:
                    social_media_html = """
                    <tr>
                        <td colspan="2" style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa;">
                            <span style="font-weight:600;">Social Media:</span>
                            <div style="margin-top:8px;">
                    """
                    if linkedin_url:
                        social_media_html += f'<a href="{linkedin_url}" style="margin-right:15px; color:#0077b5; text-decoration:none;">LinkedIn</a>'
                    if x_url:
                        social_media_html += f'<a href="{x_url}" style="margin-right:15px; color:#000000; text-decoration:none;">X (Twitter)</a>'
                    if instagram_url:
                        social_media_html += f'<a href="{instagram_url}" style="margin-right:15px; color:#E4405F; text-decoration:none;">Instagram</a>'
                    
                    social_media_html += """
                            </div>
                        </td>
                    </tr>
                    """
                
                for admin in admins:
                    html_body = f"""
                    <html>
                    <body style="margin:0; padding:0; background-color:#f8f9fa; font-family:Arial, sans-serif;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#1a1f36;">
                            <tr>
                                <td align="center" style="padding:24px;">
                                    <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" alt="Hustloop Logo"
                                        style="max-width:160px; height:auto; display:block; margin:0 auto 12px auto;">
                                    <h2 style="margin:0; font-size:22px; font-weight:600; color:#ffffff;">
                                        New Organisation Profile Created
                                    </h2>
                                </td>
                            </tr>
                        </table>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8f9fa;">
                            <tr>
                                <td style="padding:24px; font-size:16px; line-height:1.6; color:#333;">
                                    <p>Dear {admin.name},</p>
                                    <p>
                                        A new <strong>Organisation profile</strong> has been created on the platform. Below are the details:
                                    </p>

                                    <table width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse; margin:24px 0;">
                                        <tr>
                                            <td width="30%" style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">Company Name:</td>
                                            <td style="padding:8px; border:1px solid #ddd;">{company_name}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">User:</td>
                                            <td style="padding:8px; border:1px solid #ddd;">{user.name} ({user.email})</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">Sector:</td>
                                            <td style="padding:8px; border:1px solid #ddd;">{sector}</td>
                                        </tr>
                                        {f'''<tr>
                                            <td style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">Affiliated By:</td>
                                            <td style="padding:8px; border:1px solid #ddd;">{affiliated_by}</td>
                                        </tr>''' if affiliated_by else ''}
                                        <tr>
                                            <td colspan="2" style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa;">
                                                <span style="font-weight:600;">Description:</span>
                                                <div style="color:#333; line-height:1.6; margin-top:8px;">
                                                    {description}
                                                </div>
                                            </td>
                                        </tr>
                                        {f'''<tr>
                                            <td style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">Website:</td>
                                            <td style="padding:8px; border:1px solid #ddd;"><a href="{website_url}" style="color:#5560e0;">{website_url}</a></td>
                                        </tr>''' if website_url else ''}
                                        {f'''<tr>
                                            <td style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">Phone Number:</td>
                                            <td style="padding:8px; border:1px solid #ddd;">{phone_number}</td>
                                        </tr>''' if phone_number else ''}
                                        {social_media_html}
                                        {f'''<tr>
                                            <td style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">Logo:</td>
                                            <td style="padding:8px; border:1px solid #ddd;"><img src="{logo_url}" alt="Company Logo" style="max-width:150px; height:auto;"></td>
                                        </tr>''' if logo_url else ''}
                                    </table>

                                    <p>
                                        Please log in to the <strong>Hustloop Admin Dashboard</strong> to review the profile and take any necessary actions.
                                    </p>

                                    <p>Regards,<br><strong>Hustloop</strong></p>
                                </td>
                            </tr>
                        </table>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f3f5;">
                            <tr>
                                <td align="center" style="padding:20px; font-size:14px; color:#666; font-family:Arial, sans-serif;">
                                    <div style="margin-bottom:8px;">
                                        © {datetime.now().year} Hustloop. All rights reserved.
                                    </div>
                                    <div style="margin-top:10px;">
                                        <a href="{os.getenv('X_LINK')}" target="_blank" style="text-decoration:none; margin:0 8px;">
                                            <img src="{os.getenv('X_ICON')}" alt="X"
                                                style="width:24px; height:24px; vertical-align:middle; display:inline-block;">
                                        </a>
                                        <a href="{os.getenv('LINKEDIN_LINK')}" target="_blank" style="text-decoration:none; margin:0 8px;">
                                            <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn"
                                                style="width:24px; height:24px; vertical-align:middle; display:inline-block;">
                                        </a>
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                    """
                    
                    send_email(
                        subject=f"New Organisation Profile Created - {company_name}",
                        sender=('Hustloop', current_app.config['MAIL_USERNAME']),
                        recipients=[admin.email],
                        html_body=html_body
                    )

                safe_log(f"Organisation profile creation notification sent to {len(admins)} admin(s)")
            except Exception as email_error:
                safe_log(f"Failed to send Organisation profile notification email: {email_error}")
                
        return jsonify({
            "message": "Organisation profile saved successfully",
            "profile": profile.as_dict()
        }), 201 if not profile.is_submitted else 200
    except Exception as e:
        db.session.rollback()
        safe_log({"Organisation Profile Error": str(e)})
        return jsonify({"error": "An error occurred while saving the profile", "details": str(e)}), 500

@api_bp.route('/request-email-update', methods=['POST'])
@limiter.limit("3 per minute")
@token_required
def request_email_update():
    try:
        user = get_current_user()
        if not user:
            return error_response('User not found or invalid token', 404)

        data = request.get_json()
        new_email = data.get('email')

        if not new_email:
            return error_response('Email is required', 400)

        s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
        token = s.dumps({
            'uid': user.uid,
            'new_email': new_email,
            'current_email': user.email
        }, salt='email-update')

        verification_url = f"{current_app.config['FRONTEND_URL']}/verify-email-update?token={token}"

        header = f"""
            <tr>
                <td align="center" style="padding:24px; background:#0f172a;">
                    <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" alt="Hustloop Logo"
                        style="max-width:160px; height:auto; display:block; margin:0 auto 12px auto;">
                    <h2 style="margin:0; font-size:22px; font-weight:600; color:#ffffff;">
                        Verify Your New Email
                    </h2>
                </td>
            </tr>
            """

        security_header = f"""
            <tr>
                <td align="center" style="padding:24px; background:#7f1d1d;">
                    <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" alt="Hustloop Logo"
                        style="max-width:160px; height:auto; display:block; margin:0 auto 12px auto;">
                    <h2 style="margin:0; font-size:22px; font-weight:600; color:#ffffff;">
                        Security Alert: Email Change Requested
                    </h2>
                </td>
            </tr>
            """


        footer = f"""
        <tr>
            <td align="center" style="padding:20px; font-size:14px; color:#666; font-family:Arial, sans-serif;">
                <div style="margin-bottom:8px;">
                    © {datetime.now().year} Hustloop. All rights reserved.
                </div>
                <div style="margin-top:10px;">
                    <a href="{os.getenv('X_LINK')}" target="_blank" style="text-decoration:none; margin:0 8px;">
                        <img src="{os.getenv('X_ICON')}" alt="X"
                            style="width:24px; height:24px; vertical-align:middle; display:inline-block;">
                    </a>
                    <a href="{os.getenv('LINKEDIN_LINK')}" target="_blank" style="text-decoration:none; margin:0 8px;">
                        <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn"
                            style="width:24px; height:24px; vertical-align:middle; display:inline-block;">
                    </a>
                </div>
            </td>
        </tr>
        """

        new_email_body = f"""
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0"
                        style="background:#ffffff;border-radius:8px;font-family:Arial,sans-serif;">
                        {header}
                        <tr>
                            <td style="padding:20px;color:#555;text-align:center;">
                                <p>
                                    You requested to update your email address. Click the button below to verify your new email.
                                </p>
                                <div style="margin:30px 0;">
                                    <a href="{verification_url}"
                                    style="background:#007bff;color:#fff;padding:12px 24px;
                                    border-radius:4px;text-decoration:none;font-weight:bold;display:inline-block;">
                                        Verify New Email
                                    </a>
                                </div>
                                <p style="font-size:13px;word-break:break-all;">
                                    {verification_url}
                                </p>
                                <p style="font-size:12px;color:#777;">
                                    This link expires in 1 hour.
                                </p>
                            </td>
                        </tr>
                        {footer}
                    </table>
                </td>
            </tr>
        </table>
        """


        old_email_body = f"""
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff3f3;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0"
                        style="background:#ffffff;border-radius:8px;font-family:Arial,sans-serif;">
                        {security_header}
                        <tr>
                            <td style="padding:20px;color:#555;text-align:center;">
                                <p>
                                    A request was made to change your account email to
                                    <strong>{new_email}</strong>.
                                </p>
                                <p>
                                    If this was not you, please secure your account immediately.
                                </p>
                            </td>
                        </tr>
                        {footer}
                    </table>
                </td>
            </tr>
        </table>
        """


        send_email(
            subject="Verify your new email address - Hustloop",
            recipients=[new_email],
            html_body=new_email_body,
            sender=(current_app.config['MAIL_USERNAME'], current_app.config['MAIL_USERNAME'])
        )

        send_email(
            subject="Security alert: Email change requested",
            recipients=[user.email],
            html_body=old_email_body,
            sender=(current_app.config['MAIL_USERNAME'], current_app.config['MAIL_USERNAME'])
        )

        safe_log(f"email_update_verification_sent:{user.uid}")

        return success_response("Verification link sent to new email")

    except Exception as e:
        safe_log(f"email_update_request_error:{type(e).__name__}:{e}")
        return error_response('An unexpected error occurred', 500)



@api_bp.route('/confirm-email-update', methods=['POST'])
@limiter.limit("5 per minute")
def confirm_email_update():
    try:
        token = request.json.get('token')
        if not token:
            return error_response('Token is required', 400)

        s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
        try:
            data = s.loads(token, salt='email-update', max_age=3600)  
        except:
            return error_response('Invalid or expired token', 400)

        user = User.query.get(data['uid'])
        if not user:
            return error_response('User not found', 404)

        if user.email != data['current_email']:
            return error_response('Email verification failed', 400)

        user.email = data['new_email']
        
        try:
            auth.update_user(user.uid, email=data['new_email'], email_verified=True)
        except Exception as e:
            db.session.rollback()
            safe_log(f"Firebase email update error: {str(e)}")
            return error_response('Failed to update email', 500)

        db.session.commit()

        send_email(
            subject="Email Update Confirmed - Hustloop",
            recipients=[user.email],
            html_body="""Your email has been successfully updated.""",
            sender=(current_app.config['MAIL_USERNAME'], current_app.config['MAIL_USERNAME'])
        )

        return success_response("Email updated successfully",user={"name": user.name,"email":user.email})
    except Exception as e:
        db.session.rollback()
        safe_log(f"Email update confirmation error: {type(e).__name__}: {e}")
        return error_response('An unexpected error occurred', 500)


@api_bp.route("/msme-profiles", methods=["GET"])
@token_required
@role_required(['organisation'])
def get_user_msme_profile():
    user = get_current_user()
    if not user:
        return error_response("User not found", 404)
    
    profile = MSMEProfile.query.filter_by(user_id=user.uid).first()
    
    if not profile:
        return error_response("Profile not found", 404)
    
    def extract_username(url, base_url):
        if not url:
            return ""
        for prefix in [f"https://{base_url}/", f"http://{base_url}/", f"{base_url}/"]:
            if url.startswith(prefix):
                return url[len(prefix):]
        return url
    
    linkedin_username = extract_username(profile.linkedin_url, "linkedin.com/company")
    x_username = extract_username(profile.x_url, "x.com")
    instagram_username = extract_username(profile.instagram_url, "instagram.com")
    
    profile_data = {
        "name": profile.company_name,
        "sector": profile.sector,
        "short_description": profile.description or "",
        "affiliated_by": profile.affiliated_by or "",
        "website_url": profile.website_url or "",
        "phone_number": profile.phone_number or "",
        "linkedin_url": linkedin_username,
        "x_url": x_username,
        "instagram_username": instagram_username,
        "logo_url": profile.logo_url or "",
        "is_submitted": profile.is_submitted,
        "is_editable": profile.is_editable
    }
    
    return jsonify({
        "message": "Profile fetched successfully",
        "profile": profile_data
    }), 200

@api_bp.route('/msme_profiles', methods=['GET'])
@token_required
@role_required(["admin"])
def get_msme_profiles():
    profiles = MSMEProfile.query.all()
    if not profiles:
        return jsonify({"message": "No Organisation profiles found"}), 404
    safe_log(f"Profiles:{profiles}")
    data = [{
        "id": p.id,
        "company_name": p.company_name,
        "sector": p.sector,
        "description": p.description,
        "website_url": p.website_url,
        "linkedin_url": p.linkedin_url,
        "x_url": p.x_url,
        "logo_url": p.logo_url,
        "is_submitted": p.is_submitted,
        "user_id":p.user_id
    } for p in profiles]

    return jsonify(data), 200

    
@api_bp.route("/isProfileSubmitted", methods=["GET"])
@token_required
@role_required(['organisation'])
def isProfileSubmitted():

    user = get_current_user()
    if not user:
        return error_response('User not found', 404)

    existing_profile = MSMEProfile.query.filter_by(user_id=user.uid).first()

    if existing_profile:
        profile_data = {
            'is_editable': existing_profile.is_editable,
            'is_submitted': existing_profile.is_submitted,
        }
        
        if existing_profile.is_submitted:
            return jsonify({
                'status': 'submitted',
                'message': 'A profile for this user has already been submitted.',
                'profile': profile_data
            }), 200
        else:
            return jsonify({
                'status': 'in_progress',
                'message': 'A profile for this user is already in progress.',
                'profile': profile_data
            }), 200
            
    return jsonify({
        'status': 'not_created',
        'message': 'No profile has been created for this user yet.',
        'profile': None
    }), 200
    

@api_bp.route("/collaborations", methods=["POST"])
@token_required
@role_required(['organisation'])
@limiter.limit("2 per minute")
def create_collaboration():
    try:
        user = get_current_user()
        if not user:
            return error_response("User not found", 404)

        form = request.form
        
        files = request.files.getlist("attachments") 
        
        data = {
            "title": form.get("title"),
            "description": form.get("description"),
            "challenge_type": form.get("challenge_type"),
            "contact_name": form.get("contact_name"),
            "contact_role": form.get("contact_role"),
            "sector": form.get("sector"),
            "technologyArea": form.get("technologyArea"),
            "startDate": form.get("startDate"),
            "endDate": form.get("endDate"),
            "reward_amount": form.get("reward_amount"),
            "reward_min": form.get("reward_min"),
            "reward_max": form.get("reward_max"),
        }
        
        
        required_fields = [
            "title", "description", "challenge_type", "contact_name", 
            "sector", "technologyArea", "contact_role", 
            "startDate", "endDate"
        ]

        reward_amount_raw = data.get("reward_amount")
        reward_min_raw = data.get("reward_min")
        reward_max_raw = data.get("reward_max")

        reward_amount = None
        reward_min = None
        reward_max = None
        
        missing = [f for f in required_fields if f not in data or not data[f]]
        
        if missing:
            return error_response(f"Missing required fields: {', '.join(missing)}", 400)
        if len(data["title"]) > MAX_TITLE_LENGTH:
            return error_response("Title is too long", 400)
        if len(data["description"]) > MAX_DESCRIPTION_LENGTH:
            return error_response("Description is too long", 400)
        if len(data["contact_name"]) > MAX_CONTACT_NAME_LENGTH:
            return error_response("Contact name is too long", 400)
        if len(data["sector"]) > MAX_SECTOR_LENGTH:
            return error_response("Sector is too long", 400)
        if len(data["technologyArea"]) > MAX_TECH_AREA_LENGTH:
            return error_response("Technology area is too long", 400)

        if reward_amount_raw not in (None, "", "null"):
            try:
                reward_amount = float(reward_amount_raw)
            except:
                return error_response("reward_amount must be a number", 400)

            if reward_amount < 0:
                return error_response("reward_amount must be a non-negative number", 400)

            if reward_amount > 1_000_000_000:
                return error_response("reward_amount too large", 400)

        if reward_min_raw not in (None, "", "null") or reward_max_raw not in (None, "", "null"):

            if reward_min_raw in (None, "", "null") or reward_max_raw in (None, "", "null"):
                return error_response("Both reward_min and reward_max are required", 400)

            try:
                reward_min = float(reward_min_raw)
                reward_max = float(reward_max_raw)
            except:
                return error_response("reward_min and reward_max must be numbers", 400)

            if reward_min < 0 or reward_max < 0:
                return error_response("Reward values must be non-negative", 400)

            if reward_min > reward_max:
                return error_response("reward_min must be less than or equal to reward_max", 400)

            if reward_max > 1_000_000_000:
                return error_response("reward_max too large", 400)     

        try:
            start_date = datetime.fromisoformat(data["startDate"].replace("Z", "+00:00"))
            end_date = datetime.fromisoformat(data["endDate"].replace("Z", "+00:00"))
        except ValueError:
            return error_response("Invalid date format. Use ISO 8601 for startDate and endDate.", 400)

        collab = Collaboration(
            title=data["title"],
            description=data["description"],
            reward_amount=data.get("reward_amount"),
            reward_min=data.get("reward_min"),
            reward_max=data.get("reward_max"),
            challenge_type=data["challenge_type"],
            start_date=start_date,
            end_date=end_date,
            sector=data.get("sector"),
            technology_area=data.get("technologyArea"),
            contact_name=data["contact_name"],
            contact_role=data["contact_role"],
            user_id=user.uid,
        )

        db.session.add(collab)
        db.session.commit()

        uploaded_keys = []
        for file in files:
            try:
                key = upload_file_to_s3_collaboration(file)
                uploaded_keys.append(key)
            except Exception as e:
                safe_log(f"File upload failed: {e}")
                return error_response(str(e), 400)

        
        collab.attachments = json.dumps(uploaded_keys)
        db.session.commit()

        safe_log(f"Created Collaboration {collab.id} by User {collab.user_id}")
        description_html = markdown.markdown(
        collab.description,
        extensions=[
                    "extra",          
                    "codehilite",     
                    "sane_lists",     
                    "toc",            
                    "attr_list"       
        ]
        )
        admins = User.query.filter(User.role == "admin").all()
        for admin in admins:
            html_body = f"""
            <html>
            <body style="margin:0; padding:0; background-color:#f8f9fa; font-family:Arial, sans-serif;">

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#1a1f36;">
                    <tr>
                        <td align="center" style="padding:24px;">
                            <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" alt="Hustloop Logo"
                                style="max-width:160px; height:auto; display:block; margin:0 auto 12px auto;">
                            <h2 style="margin:0; font-size:22px; font-weight:600; color:#ffffff;">
                                New Incentive Challenge Submitted
                            </h2>
                        </td>
                    </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8f9fa;">
                    <tr>
                        <td style="padding:24px; font-size:16px; line-height:1.6; color:#333;">
                            <p>Dear {admin.name},</p>
                            <p>
                                A new <strong>Incetive Challenge</strong> has been submitted and is awaiting your review.
                            </p>

                            <table width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse; margin:24px 0;">
                                <tr>
                                    <td width="30%" style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">Title:</td>
                                    <td style="padding:8px; border:1px solid #ddd;">{collab.title}</td>
                                </tr>
                                <tr>
                                    <td style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">Submitted By:</td>
                                    <td style="padding:8px; border:1px solid #ddd;">{collab.contact_name} ({collab.contact_role})</td>
                                </tr>
                                <tr>
                                <td style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">Reward:</td>
                                    <td style="padding:8px; border:1px solid #ddd;">
                                        {f"₹{collab.reward_amount}" if collab.reward_amount is not None else f"₹{collab.reward_min} - ₹{collab.reward_max}"}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">Sector:</td>
                                    <td style="padding:8px; border:1px solid #ddd;">{collab.sector}</td>
                                </tr>
                                <tr>
                                    <td style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">Technology Area:</td>
                                    <td style="padding:8px; border:1px solid #ddd;">{collab.technology_area}</td>
                                </tr>
                                <tr>
                                    <td style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">Challenge Type:</td>
                                    <td style="padding:8px; border:1px solid #ddd;">{collab.challenge_type}</td>
                                </tr>
                                <tr>
                                    <td colspan="2" style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa;">
                                        <span style="font-weight:600;">Description:</span>
                                        <div style="color:#333; line-height:1.6;">
                                            {description_html}
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">Start Date:</td>
                                    <td style="padding:8px; border:1px solid #ddd;">{format_datetime(collab.start_date)}</td>
                                </tr>
                                <tr>
                                    <td style="padding:8px; border:1px solid #ddd; background-color:#f8f9fa; font-weight:600;">End Date:</td>
                                    <td style="padding:8px; border:1px solid #ddd;">{format_datetime(collab.end_date)}</td>
                                </tr>
                            </table>

                            <p>
                                Please log in to the <strong>Hustloop Admin Dashboard</strong> to review the details and take the next steps.
                            </p>

                            <p>Regards,<br><strong>Hustloop</strong></p>
                        </td>
                    </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f3f5;">
                    <tr>
                        <td align="center" style="padding:20px; font-size:14px; color:#666; font-family:Arial, sans-serif;">
                            <div style="margin-bottom:8px;">
                                © {datetime.now().year} Hustloop. All rights reserved.
                            </div>
                            <div style="margin-top:10px;">
                                <a href="https://x.com/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                                    <img src="{os.getenv('X_ICON')}" alt="X"
                                        style="width:24px; height:24px; vertical-align:middle; display:inline-block;">
                                </a>
                                <a href="https://linkedin.com/company/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                                    <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn"
                                        style="width:24px; height:24px; vertical-align:middle; display:inline-block;">
                                </a>
                            </div>
                        </td>
                    </tr>
                </table>

            </body>
            </html>
            """
            send_email(
                subject="New Incentive Challenge Submitted",
                sender=('Hustloop', current_app.config['MAIL_USERNAME']),
                recipients=[admin.email],
                html_body=html_body
            )
        return jsonify({
            "message": "Collaboration created successfully",
            "id": collab.id
        }), 201

    except KeyError as e:
        db.session.rollback()
        return error_response(f"Missing field: {str(e)}", 400)

    except Exception as e:
        db.session.rollback()
        safe_log(f"Error creating collaboration:{e}")
        return error_response("An unexpected error occurred while creating the collaboration", 500)


@api_bp.route('/sectors', methods=['GET'])
def get_sectors():
    sectors = Sector.query.all()
    result = [
        {
            "id": sector.id,
            "name": sector.name,
            "children": [tech.name for tech in sector.technology_areas]
        }
        for sector in sectors
    ]
    return jsonify(result), 200

@api_bp.route('/sectors/add', methods=['POST']) 
@token_required
@role_required(['organisation','admin'])
def add_sector_or_technology(): 
    
    user = get_current_user()
    
    if not user:
        return error_response("User not found", 404)
    
    data = request.get_json() 
    
    sector_name = data.get("sector") 
    tech_name = data.get("technologyArea") 

    if not sector_name or not tech_name: 
        return jsonify({"error": "Both sector and technology names are required"}), 400 
    sector = Sector.query.filter_by(name=sector_name).first() 
    if not sector: 
        sector = Sector(name=sector_name) 
        db.session.add(sector) 
        db.session.commit() 
    technology = TechnologyArea.query.filter_by(name=tech_name, sector_id=sector.id).first() 
    if not technology: 
        technology = TechnologyArea(name=tech_name, sector_id=sector.id) 
        db.session.add(technology)  
        db.session.commit() 
    return jsonify({"message": "Sector and Technology saved successfully"}), 201

    
@api_bp.route("/get-collaboration", methods=["GET"])
def get_collaborations():
    try:
        challenge_type = request.args.get("challenge_type")
        query = Collaboration.query

        if challenge_type:
            allowed_types = ["corporate", "msme", "government"]
            if challenge_type not in allowed_types:
                return error_response("Invalid challenge_type", 400)
            query = query.filter_by(challenge_type=challenge_type)

        collaborations = query.all()
        data = []

        now = datetime.now(IST)

        for c in collaborations:
            application_ended = c.end_date
            extended_end_date = c.extended_end_date
            review_started = extended_end_date if extended_end_date else application_ended
            review_ended = review_started + relativedelta(months=1)

            if len(c.solutions) > 20:
                review_ended = review_ended + timedelta(days=15)

            screening_started = review_ended
            screening_ended = screening_started + relativedelta(months=1)
            screening_ended = screening_ended.replace(tzinfo=IST)

            timeline_ended = now > screening_ended

            count = Solution.query.filter_by(challenge_id=c.id).count()
            qa_count = QAItem.query.filter_by(collaboration_id=c.id).count()

            item = c.to_dict()
            item["submission_count"] = count
            item["qa_count"] = qa_count
            item["timeline_ended"] = timeline_ended

            data.append(item)

        def status_rank(s):
            if s == "active":
                return 1
            if s not in ["stopped", "expired"]:
                return 2
            if s == "stopped":
                return 3
            return 4

        data.sort(key=lambda x: (
            status_rank(x["status"]),
            x["timeline_ended"]
        ))

        return success_response({"collaborations": data})

    except Exception:
        return error_response("Something went wrong", 500)




@api_bp.route("/get-users-collaboration", methods=["GET"])
@token_required
@role_required(['organisation'])
def get_users_collaborations():
    try:
        user = get_current_user()
        if not user:
            return error_response("User not found", 404)

        collaboration_id = request.args.get("id")  
        query = Collaboration.query

        if user.role == "organisation":
            query = query.filter_by(user_id=user.uid)

        if collaboration_id:
            query = query.filter_by(id=collaboration_id)
            
        collaborations = query.all()

        if not collaborations:
            return success_response({"collaborations": []})

        collaborations_list = [collab.to_dict() for collab in collaborations]

        return jsonify({
            "message": "Collaborations retrieved successfully",
            "collaborations": collaborations_list,
            "length":len(collaborations_list)
        }), 200

    except Exception as e:
        safe_log(f"Error getting collaborations:{e}")
        return error_response(
            "An unexpected error occurred while fetching collaborations", 500
        )


@api_bp.route("/collaborations/<string:collab_id>", methods=["PUT"])
@token_required
@role_required(['organisation'])
def update_collaboration(collab_id):
    try:
        user = get_current_user()
        if not user:
            return error_response("User not found", 404)

        collab = Collaboration.query.get(collab_id)
        if not collab:
            return error_response("Collaboration not found", 404)

        if collab.user_id != user.uid:
            return error_response("You are not authorized to update this collaboration", 403)

        data = request.get_json() or {}

        def parse_to_utc(dt_str):
            try:
                dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
                return dt.astimezone(timezone.utc)
            except:
                return None

        incoming_start = parse_to_utc(data.get("startDate"))
        incoming_end = parse_to_utc(data.get("endDate"))

        db_start = collab.start_date.replace(tzinfo=IST).astimezone(timezone.utc)
        db_end = collab.end_date.replace(tzinfo=IST).astimezone(timezone.utc)

        if incoming_start and incoming_start.date() != db_start.date():
            return error_response("Start date cannot be modified", 400)

        if incoming_end and incoming_end.date() != db_end.date():
            return error_response("End date cannot be modified", 400)

        if data.get("reward_min") is not None and data.get("reward_min") != collab.reward_min:
            return error_response("Reward minimum cannot be modified", 400)

        if data.get("reward_max") is not None and data.get("reward_max") != collab.reward_max:
            return error_response("Reward maximum cannot be modified", 400)

        if data.get("reward_amount") is not None and data.get("reward_amount") != collab.reward_amount:
            return error_response("Reward amount cannot be modified", 400)

        allowed_fields = {
            "title": data.get("title"),
            "description": data.get("description"),
            "challenge_type": data.get("challenge_type"),
            "contact_name": data.get("contact_name"),
            "contact_role": data.get("contact_role"),
            "sector": data.get("sector"),
            "technology_area": data.get("technologyArea"),
        }

        for field, value in allowed_fields.items():
            if value is not None:
                setattr(collab, field, value)

        db.session.commit()
        safe_log("collaboration_update_success")
        return success_response("Collaboration updated successfully")
    except Exception:
        db.session.rollback()
        safe_log("collaboration_update_error")
        return error_response("Failed to update collaboration", 500)

def send_reward_update_email(owner_email, owner_name, collab_title, old_reward_type, old_reward_value, new_reward_type, new_reward_value):
    html_body = f"""
    <html>
    <body style="margin:0; padding:0; background:#f5f7fa; font-family:Arial, sans-serif;">

    <table align="center" cellpadding="0" cellspacing="0" width="100%"
           style="max-width:620px; margin:40px auto; background:#ffffff;
                  border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
            <td style="background:#0f172a; padding:30px; text-align:center;">
                <img src="https://api.hustloop.com/static/images/logo.png"
                     alt="Hustloop" style="width:150px; margin-bottom:10px;">
                <h1 style="color:#ffffff; margin:0; font-size:24px;">
                    Reward Updated
                </h1>
            </td>
        </tr>

        <!-- Body -->
        <tr>
            <td style="padding:30px; color:#333; font-size:15px; line-height:1.7;">
                <p>Hello {owner_name},</p>

                <p>
                    We're writing to inform you that the reward for your challenge has been updated by our admin team.
                </p>

                <p style="font-size:16px; color:#0f172a; font-weight:600; margin-top:20px;">
                    Challenge: <span style="color:#2563eb;">{collab_title}</span>
                </p>

                <!-- Reward Comparison Table -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin:25px 0; border-collapse:collapse;">
                    <tr>
                        <td style="padding:15px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px 0 0 0; width:50%;">
                            <p style="margin:0; font-size:13px; color:#64748b; font-weight:600; text-transform:uppercase;">Previous Reward</p>
                            <p style="margin:8px 0 0 0; font-size:18px; color:#475569; font-weight:700;">
                                {old_reward_value}
                            </p>
                            <p style="margin:4px 0 0 0; font-size:12px; color:#94a3b8;">
                                ({old_reward_type})
                            </p>
                        </td>
                        <td style="padding:15px; background:#ecfdf5; border:1px solid #a7f3d0; border-left:none; border-radius:0 6px 0 0; width:50%;">
                            <p style="margin:0; font-size:13px; color:#059669; font-weight:600; text-transform:uppercase;">New Reward</p>
                            <p style="margin:8px 0 0 0; font-size:18px; color:#047857; font-weight:700;">
                                {new_reward_value}
                            </p>
                            <p style="margin:4px 0 0 0; font-size:12px; color:#10b981;">
                                ({new_reward_type})
                            </p>
                        </td>
                    </tr>
                </table>

                <div style="margin:25px 0; padding:18px 20px; border-radius:6px;
                            background:#eff6ff; border-left:4px solid #3b82f6;">
                    <p style="margin:0; color:#1e40af; font-size:14px;">
                        <strong>Note:</strong> This change has been made to better align with the current market conditions and the scope of your collaboration.
                    </p>
                </div>

                <p>
                    If you have any questions about this update, please don't hesitate to reach out to our support team.
                </p>

                <p style="margin-top:25px;">
                    Best regards,<br>
                    <strong>The Hustloop Team</strong>
                </p>
            </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f1f5f9;padding:18px 24px;text-align:center;border-radius:0 0 8px 8px;color:#6b7280;font-size:13px;">
            <div style="max-width:560px;margin:0 auto;">
              <div style="margin-bottom:8px;">© {datetime.now().year} Hustloop. All rights reserved.</div>
              <div style="margin-top:10px;">
                    <a href="https://x.com/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                        <img src="{os.getenv("X_ICON")}" alt="X" 
                            style="width:24px; height:24px; vertical-align:middle;">
                    </a>
                    <a href="https://linkedin.com/company/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                        <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" style="width:24px; height:24px;">
                    </a>
                </div>
            </div>
          </td>
        </tr>

    </table>

    </body>
    </html>
    """

    send_email(
        subject=f"Hustloop - Reward Updated for \"{collab_title}\"",
        recipients=[owner_email],
        html_body=html_body,
        sender=("Hustloop", current_app.config["MAIL_USERNAME"])
    )


@api_bp.route("/collaborations/<string:collab_id>/rewards", methods=["PUT"])
@token_required
@role_required(["admin"])
def update_collaboration_rewards(collab_id):
    try:
        collab = Collaboration.query.get(collab_id)
        if not collab:
            return error_response("Collaboration not found", 404)

        data = request.get_json() or {}

        reward_amount = data.get("reward_amount")
        reward_min = data.get("reward_min")
        reward_max = data.get("reward_max")

        is_fixed = reward_amount not in (None, "", 0)
        is_range = (reward_min not in (None, "", 0)) and (reward_max not in (None, "", 0))

        # Capture old reward values before updating
        old_reward_amount = collab.reward_amount
        old_reward_min = collab.reward_min
        old_reward_max = collab.reward_max

        # Determine old reward type and format value
        if old_reward_amount:
            old_reward_type = "Fixed Amount"
            old_reward_value = f"₹{old_reward_amount:,.0f}"
        elif old_reward_min and old_reward_max:
            old_reward_type = "Range"
            old_reward_value = f"₹{old_reward_min:,.0f} - ₹{old_reward_max:,.0f}"
        else:
            old_reward_type = "Not Set"
            old_reward_value = "No reward set"

        # Update the collaboration rewards
        if is_fixed:
            collab.reward_amount = reward_amount
            collab.reward_min = None
            collab.reward_max = None
            new_reward_type = "Fixed Amount"
            new_reward_value = f"₹{reward_amount:,.0f}"

        if is_range:
            collab.reward_amount = None
            collab.reward_min = reward_min
            collab.reward_max = reward_max
            new_reward_type = "Range"
            new_reward_value = f"₹{reward_min:,.0f} - ₹{reward_max:,.0f}"

        # Get collaboration owner details
        owner = User.query.filter_by(uid=collab.user_id).first()
        
        # Send email notification to collaboration owner
        if owner and owner.email:
            try:
                send_reward_update_email(
                    owner_email=owner.email,
                    owner_name=owner.name,
                    collab_title=collab.title,
                    old_reward_type=old_reward_type,
                    old_reward_value=old_reward_value,
                    new_reward_type=new_reward_type,
                    new_reward_value=new_reward_value
                )
                safe_log(f"reward_update_email_sent:{owner.email}")
            except Exception as email_error:
                safe_log(f"reward_update_email_error:{email_error}")

        # Send notification to participants
        participants = Solution.query.filter_by(challenge_id=collab_id).all()
        for p in participants:
            participant_user = User.query.filter_by(uid=p.user_id).first()
            if participant_user and participant_user.email:
                try:
                    participant_html = f"""
                    <html>
                    <body style="margin:0; padding:0; background:#f5f7fa; font-family:Arial, sans-serif;">

                    <table align="center" cellpadding="0" cellspacing="0" width="100%"
                           style="max-width:620px; margin:40px auto; background:#ffffff;
                                  border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">

                        <!-- Header -->
                        <tr>
                            <td style="background:#0f172a; padding:30px; text-align:center;">
                                <img src="https://api.hustloop.com/static/images/logo.png"
                                     alt="Hustloop" style="width:150px; margin-bottom:10px;">
                                <h1 style="color:#ffffff; margin:0; font-size:24px;">
                                    Challenge Reward Updated
                                </h1>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding:30px; color:#333; font-size:15px; line-height:1.7;">
                                <p>Hello {participant_user.name},</p>

                                <p>
                                    Great news! The reward for a challenge you're participating in has been updated.
                                </p>

                                <p style="font-size:16px; color:#0f172a; font-weight:600; margin-top:20px;">
                                    Challenge: <span style="color:#2563eb;">{collab.title}</span>
                                </p>

                                <!-- Reward Comparison Table -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin:25px 0; border-collapse:collapse;">
                                    <tr>
                                        <td style="padding:15px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px 0 0 0; width:50%;">
                                            <p style="margin:0; font-size:13px; color:#64748b; font-weight:600; text-transform:uppercase;">Previous Reward</p>
                                            <p style="margin:8px 0 0 0; font-size:18px; color:#475569; font-weight:700;">
                                                {old_reward_value}
                                            </p>
                                            <p style="margin:4px 0 0 0; font-size:12px; color:#94a3b8;">
                                                ({old_reward_type})
                                            </p>
                                        </td>
                                        <td style="padding:15px; background:#ecfdf5; border:1px solid #a7f3d0; border-left:none; border-radius:0 6px 0 0; width:50%;">
                                            <p style="margin:0; font-size:13px; color:#059669; font-weight:600; text-transform:uppercase;">New Reward</p>
                                            <p style="margin:8px 0 0 0; font-size:18px; color:#047857; font-weight:700;">
                                                {new_reward_value}
                                            </p>
                                            <p style="margin:4px 0 0 0; font-size:12px; color:#10b981;">
                                                ({new_reward_type})
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                                <div style="margin:25px 0; padding:18px 20px; border-radius:6px;
                                            background:#dbeafe; border-left:4px solid #3b82f6;">
                                    <p style="margin:0; color:#1e40af; font-size:14px;">
                                        <strong>Keep going!</strong> This update reflects the value of your contribution. Continue working on your submission to maximize your chances of winning.
                                    </p>
                                </div>

                                <p style="margin-top:25px;">
                                    Best regards,<br>
                                    <strong>The Hustloop Team</strong>
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                          <td style="background:#f1f5f9;padding:18px 24px;text-align:center;border-radius:0 0 8px 8px;color:#6b7280;font-size:13px;">
                            <div style="max-width:560px;margin:0 auto;">
                              <div style="margin-bottom:8px;">© {datetime.now().year} Hustloop. All rights reserved.</div>
                              <div style="margin-top:10px;">
                                    <a href="https://x.com/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                                        <img src="{os.getenv("X_ICON")}" alt="X" 
                                            style="width:24px; height:24px; vertical-align:middle;">
                                    </a>
                                    <a href="https://linkedin.com/company/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                                        <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" style="width:24px; height:24px;">
                                    </a>
                                </div>
                            </div>
                          </td>
                        </tr>

                    </table>

                    </body>
                    </html>
                    """
                    send_email(
                        subject=f"Hustloop - Reward Updated for \"{collab.title}\"",
                        recipients=[participant_user.email],
                        html_body=participant_html,
                        sender=("Hustloop", current_app.config["MAIL_USERNAME"])
                    )
                    safe_log(f"participant_reward_update_email_sent:{participant_user.email}")
                except Exception as email_error:
                    safe_log(f"participant_reward_update_email_error:{email_error}")

        # Send notification to all admins
        admins = User.query.filter_by(role="admin").all()
        for admin in admins:
            try:
                admin_html = f"""
                <html>
                <body style="margin:0; padding:0; background:#f5f7fa; font-family:Arial, sans-serif;">

                <table align="center" cellpadding="0" cellspacing="0" width="100%"
                       style="max-width:620px; margin:40px auto; background:#ffffff;
                              border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">

                    <!-- Header -->
                    <tr>
                        <td style="background:#0f172a; padding:30px; text-align:center;">
                            <img src="https://api.hustloop.com/static/images/logo.png"
                                 alt="Hustloop" style="width:150px; margin-bottom:10px;">
                            <h1 style="color:#ffffff; margin:0; font-size:24px;">
                                Admin Alert: Reward Updated
                            </h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:30px; color:#333; font-size:15px; line-height:1.7;">
                            <p>Hello {admin.name},</p>

                            <p>
                                A collaboration reward has been updated by an administrator.
                            </p>

                            <div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:15px;margin:20px 0;border-radius:4px;">
                              <p style="margin:0 0 8px;font-size:14px;color:#64748b;font-weight:600;">CHALLENGE DETAILS</p>
                              <p style="margin:5px 0;font-size:15px;color:#111;"><strong>Title:</strong> {collab.title}</p>
                              <p style="margin:5px 0;font-size:15px;color:#111;"><strong>Owner:</strong> {owner.name} ({owner.email})</p>
                              <p style="margin:5px 0;font-size:15px;color:#111;"><strong>Participants:</strong> {len(participants)}</p>
                            </div>

                            <!-- Reward Comparison Table -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin:25px 0; border-collapse:collapse;">
                                <tr>
                                    <td style="padding:15px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px 0 0 0; width:50%;">
                                        <p style="margin:0; font-size:13px; color:#64748b; font-weight:600; text-transform:uppercase;">Previous Reward</p>
                                        <p style="margin:8px 0 0 0; font-size:18px; color:#475569; font-weight:700;">
                                            {old_reward_value}
                                        </p>
                                        <p style="margin:4px 0 0 0; font-size:12px; color:#94a3b8;">
                                            ({old_reward_type})
                                        </p>
                                    </td>
                                    <td style="padding:15px; background:#ecfdf5; border:1px solid #a7f3d0; border-left:none; border-radius:0 6px 0 0; width:50%;">
                                        <p style="margin:0; font-size:13px; color:#059669; font-weight:600; text-transform:uppercase;">New Reward</p>
                                        <p style="margin:8px 0 0 0; font-size:18px; color:#047857; font-weight:700;">
                                            {new_reward_value}
                                        </p>
                                        <p style="margin:4px 0 0 0; font-size:12px; color:#10b981;">
                                            ({new_reward_type})
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <div style="margin:25px 0; padding:18px 20px; border-radius:6px;
                                        background:#eff6ff; border-left:4px solid #3b82f6;">
                                <p style="margin:0; color:#1e40af; font-size:14px;">
                                    <strong>Notification Status:</strong> The owner and all {len(participants)} participants have been notified about this reward update.
                                </p>
                            </div>

                            <p style="margin-top:25px;">
                                Best regards,<br>
                                <strong>Hustloop System</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="background:#f1f5f9;padding:18px 24px;text-align:center;border-radius:0 0 8px 8px;color:#6b7280;font-size:13px;">
                        <div style="max-width:560px;margin:0 auto;">
                          <div style="margin-bottom:8px;">© {datetime.now().year} Hustloop. All rights reserved.</div>
                          <div style="margin-top:10px;">
                                <a href="https://x.com/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                                    <img src="{os.getenv("X_ICON")}" alt="X" 
                                        style="width:24px; height:24px; vertical-align:middle;">
                                </a>
                                <a href="https://linkedin.com/company/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                                    <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" style="width:24px; height:24px;">
                                </a>
                            </div>
                        </div>
                      </td>
                    </tr>

                </table>

                </body>
                </html>
                """
                send_email(
                    subject="Admin Alert: Challenge Reward Updated",
                    recipients=[admin.email],
                    html_body=admin_html,
                    sender=("Hustloop", current_app.config["MAIL_USERNAME"])
                )
                safe_log(f"admin_reward_update_email_sent:{admin.email}")
            except Exception as email_error:
                safe_log(f"admin_reward_update_email_error:{email_error}")

        db.session.commit()
        safe_log("admin_update_rewards_success")
        return success_response("Collaboration rewards updated successfully")
    except Exception:
        db.session.rollback()
        safe_log("admin_update_rewards_error")
        return error_response("Failed to update collaboration rewards", 500)


@api_bp.route("/collaborations/<string:id>/extend", methods=["POST"])
@token_required
@role_required(["admin"])
def extend_collaboration(id):
    try:
        user = get_current_user()
        if not user:
            return error_response("User not found", 404)

        collab = Collaboration.query.get(id)
        if not collab:
            return error_response("Collaboration not found", 404)

        data = request.get_json()
        extended_str = data["extended_end_date"]
        if extended_str.endswith('Z'):
            cleaned_str = extended_str.split('.')[0] + '+00:00'
        else:
            cleaned_str = extended_str
        new_end_date_utc = datetime.fromisoformat(cleaned_str)
        new_end_date_ist = new_end_date_utc.astimezone(IST)
        
        created_by = "User"
        if user.role == "admin":
            created_by = "Admin"
        else:
            return jsonify({"error": "You are not authorized to extend this campaign"}), 403

        announcement = Announcement(
            user_id=user.uid,
            collaboration_id=id,
            title="Challenge Extended",
            message=f"The challenge has been extended until {new_end_date_ist.strftime('%B %d, %Y')}.",
            type="update",
            created_by=created_by,
            attachments=json.dumps([])
        )
        db.session.add(announcement)
        db.session.commit()

        collab.extend_end_date(new_end_date_ist)
        if collab.status in ["expired", "stopped"]:
            collab.status = "active"
        db.session.commit()

        owner = User.query.filter_by(uid=collab.user_id).first()

        owner_html = f"""
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;padding:20px;">
          <tr>
            <td align="center">
              <table width="550" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;font-family:Arial, sans-serif;">
                <tr>
                    <td align="center" style="padding:24px;">
                        <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" style="max-width:160px;">
                    </td>
                </tr>
                <tr>
                  <td style="padding:25px;">
                    <h2 style="margin:0 0 10px;font-size:22px;color:#111;">Challenge Extended</h2>
                    <p style="font-size:15px;color:#444;line-height:1.6;">Hello {owner.name},</p>
                    <p style="font-size:15px;color:#444;line-height:1.6;">Your challenge <strong>{collab.title}</strong> has been extended.</p>
                    <p style="font-size:16px;color:#111;line-height:1.6;">New End Date: <strong>{new_end_date_ist.strftime('%B %d, %Y')}</strong></p>
                    <p style="font-size:15px;color:#444;line-height:1.6;">You can log in anytime to review submissions.</p>
                    <p style="font-size:15px;color:#444;margin-top:25px;">Regards,<br><strong>Hustloop Team</strong></p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px;background:#fafafa;text-align:center;">
                    <p style="font-size:13px;color:#888;margin-bottom:10px;">Follow us for updates</p>
                    <div style="margin-top:10px;">
                      <a href="https://x.com/hustloop" target="_blank"><img src="{os.getenv('X_ICON')}" style="width:24px;height:24px;"></a>
                      <a href="https://linkedin.com/company/hustloop" target="_blank"><img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" style="width:24px;height:24px;"></a>
                    </div>
                    <p style="font-size:12px;color:#aaa;margin-top:15px;">© {datetime.now().year} Hustloop. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        """

        send_email(
            subject="Challenge Extended",
            recipients=[owner.email],
            html_body=owner_html,
            sender=('Hustloop', current_app.config['MAIL_USERNAME'])
        )

        participants = Solution.query.filter_by(challenge_id=id).all()
        for p in participants:
            participant_user = User.query.filter_by(uid=p.user_id).first()
            if participant_user:
                p_html = f"""
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;padding:20px;">
                  <tr>
                    <td align="center">
                      <table width="550" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;font-family:Arial, sans-serif;">
                        <tr>
                            <td align="center" style="padding:24px;">
                                <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" style="max-width:160px;">
                            </td>
                        </tr>
                        <tr>
                          <td style="padding:25px;">
                            <h2 style="margin:0 0 10px;font-size:22px;color:#111;">Challenge Extended</h2>
                            <p style="font-size:15px;color:#444;line-height:1.6;">Hello {participant_user.name},</p>
                            <p style="font-size:15px;color:#444;line-height:1.6;">The challenge <strong>{collab.title}</strong> you are participating in has been extended.</p>
                            <p style="font-size:16px;color:#111;line-height:1.6;">New End Date: <strong>{new_end_date_ist.strftime('%B %d, %Y')}</strong></p>
                            <p style="font-size:15px;color:#444;line-height:1.6;">Keep going and submit your best work!</p>
                            <p style="font-size:15px;color:#444;margin-top:25px;">Regards,<br><strong>Hustloop Team</strong></p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:20px;background:#fafafa;text-align:center;">
                            <p style="font-size:13px;color:#888;margin-bottom:10px;">Follow us for updates</p>
                            <div style="margin-top:10px;">
                              <a href="https://x.com/hustloop" target="_blank"><img src="{os.getenv('X_ICON')}" style="width:24px;height:24px;"></a>
                              <a href="https://linkedin.com/company/hustloop" target="_blank"><img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" style="width:24px;height:24px;"></a>
                            </div>
                            <p style="font-size:12px;color:#aaa;margin-top:15px;">© {datetime.now().year} Hustloop. All rights reserved.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                """
                send_email(
                    subject="Challenge Extended",
                    recipients=[participant_user.email],
                    html_body=p_html,
                    sender=('Hustloop', current_app.config['MAIL_USERNAME'])
                )

        admins = User.query.filter_by(role="admin").all()
        for admin in admins:
            admin_html = f"""
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;padding:20px;">
              <tr>
                <td align="center">
                  <table width="550" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;font-family:Arial, sans-serif;">
                    <tr>
                        <td align="center" style="padding:24px;">
                            <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" style="max-width:160px;">
                        </td>
                    </tr>
                    <tr>
                      <td style="padding:25px;">
                        <h2 style="margin:0 0 10px;font-size:22px;color:#111;">Challenge Extension Notification</h2>
                        <p style="font-size:15px;color:#444;line-height:1.6;">Hello {admin.name},</p>
                        <p style="font-size:15px;color:#444;line-height:1.6;">A challenge has been extended by an administrator.</p>
                        
                        <div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:15px;margin:20px 0;border-radius:4px;">
                          <p style="margin:0 0 8px;font-size:14px;color:#64748b;font-weight:600;">CHALLENGE DETAILS</p>
                          <p style="margin:5px 0;font-size:15px;color:#111;"><strong>Title:</strong> {collab.title}</p>
                          <p style="margin:5px 0;font-size:15px;color:#111;"><strong>Owner:</strong> {owner.name} ({owner.email})</p>
                          <p style="margin:5px 0;font-size:15px;color:#111;"><strong>Participants:</strong> {len(participants)}</p>
                          <p style="margin:5px 0;font-size:15px;color:#111;"><strong>New End Date:</strong> {new_end_date_ist.strftime('%B %d, %Y')}</p>
                          <p style="margin:5px 0;font-size:15px;color:#111;"><strong>Status:</strong> {collab.status.value}</p>
                        </div>
                        
                        <p style="font-size:15px;color:#444;line-height:1.6;">All stakeholders (owner and participants) have been notified about this extension.</p>
                        <p style="font-size:15px;color:#444;margin-top:25px;">Regards,<br><strong>Hustloop System</strong></p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:20px;background:#fafafa;text-align:center;">
                        <p style="font-size:13px;color:#888;margin-bottom:10px;">Follow us for updates</p>
                        <div style="margin-top:10px;">
                          <a href="https://x.com/hustloop" target="_blank"><img src="{os.getenv('X_ICON')}" style="width:24px;height:24px;"></a>
                          <a href="https://linkedin.com/company/hustloop" target="_blank"><img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" style="width:24px;height:24px;"></a>
                        </div>
                        <p style="font-size:12px;color:#aaa;margin-top:15px;">© {datetime.now().year} Hustloop. All rights reserved.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            """
            send_email(
                subject="Admin Alert: Challenge Extended",
                recipients=[admin.email],
                html_body=admin_html,
                sender=('Hustloop', current_app.config['MAIL_USERNAME'])
            )

        safe_log("extend_collaboration")
        return success_response({
            "message": "Extended end date updated and notifications sent",
            "extended_end_date": collab.extended_end_date.isoformat(),
            "status": collab.status
        })

    except Exception as e:
        return error_response(str(e), 400)


@api_bp.route("/collaborations/<string:id>/stop-resume", methods=["POST"])
@token_required
@role_required(["admin"])
def stop_or_resume_collaboration(id):
    try:
        user = get_current_user()
        if not user:
            return error_response("User not found", 404)

        collab = Collaboration.query.get(id)
        if not collab:
            safe_log("not_found")
            return error_response("Collaboration not found", 404)

        if collab.status == CollaborationStatus.expired:
            safe_log("expired")
            return error_response("Expired campaign cannot be resumed", 400)

        owner = User.query.filter_by(uid=collab.user_id).first()
        participants = Solution.query.filter_by(challenge_id=id).all()

        def build_email_html(name, title, message):
            year = datetime.now().year
            return f"""
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;padding:20px;">
              <tr>
                <td align="center">
                  <table width="550" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;font-family:Arial, sans-serif;">

                    <tr>
                        <td align="center" style="padding:24px;">
                            <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" style="max-width:160px;">
                        </td>
                    </tr>

                    <tr>
                      <td style="padding:25px;">
                        <h2 style="margin:0 0 10px;font-size:22px;color:#111;">{title}</h2>

                        <p style="font-size:15px;color:#444;line-height:1.6;">
                          Hello {name},
                        </p>

                        <p style="font-size:15px;color:#444;line-height:1.6;">
                          {message}
                        </p>

                        <p style="font-size:15px;color:#444;margin-top:25px;">
                          Regards,<br>
                          <strong>Hustloop Team</strong>
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding:20px;background:#fafafa;text-align:center;">
                        <p style="font-size:13px;color:#888;margin-bottom:10px;">Follow us for updates</p>

                        <div style="margin-top:10px;">
                          <a href="https://x.com/hustloop" target="_blank" style="text-decoration:none;margin:0 8px;">
                            <img src="{os.getenv('X_ICON')}" style="width:24px;height:24px;">
                          </a>

                          <a href="https://linkedin.com/company/hustloop" target="_blank" style="text-decoration:none;margin:0 8px;">
                            <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" style="width:24px;height:24px;">
                          </a>
                        </div>

                        <p style="font-size:12px;color:#aaa;margin-top:15px;">
                          © {year} Hustloop. All rights reserved.
                        </p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
            """
        created_by = "User"
        if user.role == "admin":
            created_by = "Admin"
        else:
            return jsonify({"error": "You are not authorized to resume this campaign"}), 403

        if collab.status == CollaborationStatus.stopped:
            collab.status = CollaborationStatus.active
            collab.stop_date = None
            db.session.commit()

            announcement = Announcement(
                user_id=user.uid,
                created_by=created_by,
                collaboration_id=id,
                title="Campaign Resumed",
                message=f"The campaign '{collab.title}' has been resumed.",
                type="general",
                attachments=json.dumps([])
            )
            db.session.add(announcement)
            db.session.commit()

            owner_html = build_email_html(
                owner.name,
                "Campaign Resumed",
                f"Your challenge <strong>{collab.title}</strong> has been resumed."
            )

            send_email(
                subject="Campaign Resumed",
                recipients=[owner.email],
                html_body=owner_html,
                sender=("Hustloop", current_app.config['MAIL_USERNAME'])
            )

            for p in participants:
                u = User.query.filter_by(uid=p.user_id).first()
                if u:
                    p_msg = f"The challenge <strong>{collab.title}</strong> you participated in is now active again. We’ve reopened the competition and your submissions are once again eligible. Jump back in and continue your progress!"
                    p_html = build_email_html(
                        u.name,
                        "Campaign Resumed",
                        p_msg
                    )
                    send_email(
                        subject="Campaign Resumed",
                        recipients=[u.email],
                        html_body=p_html,
                        sender=("Hustloop", current_app.config['MAIL_USERNAME'])
                    )

            safe_log("resumed")
            return success_response({"message": "Campaign resumed", "status": "active"})

        collab.stop_date = datetime.now(IST)
        collab.status = CollaborationStatus.stopped
        db.session.commit()

        created_by = "User"
        if user.role == "admin":
            created_by = "Admin"
        else:
            return jsonify({"error": "You are not authorized to stop this campaign"}), 403

        announcement = Announcement(
            user_id=user.uid,
            created_by=created_by,
            collaboration_id=id,
            title="Campaign Stopped",
            message=f"The campaign '{collab.title}' has been stopped.",
            type="general",
            attachments=json.dumps([])
        )
        db.session.add(announcement)
        db.session.commit()

        owner_html = build_email_html(
            owner.name,
            "Campaign Stopped",
            f"Your challenge <strong>{collab.title}</strong> has been stopped."
        )

        send_email(
            subject="Campaign Stopped",
            recipients=[owner.email],
            html_body=owner_html,
            sender=("Hustloop", current_app.config['MAIL_USERNAME'])
        )

        for p in participants:
            u = User.query.filter_by(uid=p.user_id).first()
            if u:
                p_msg = f"The challenge <strong>{collab.title}</strong> has been stopped. But great news — new challenges are opening soon on Hustloop. Stay active and explore upcoming opportunities where your skills can shine!"
                p_html = build_email_html(
                    u.name,
                    "Campaign Stopped",
                    p_msg
                )
                send_email(
                    subject="Campaign Stopped",
                    recipients=[u.email],
                    html_body=p_html,
                    sender=("Hustloop", current_app.config['MAIL_USERNAME'])
                )

        safe_log("stopped")
        return success_response({"message": "Campaign stopped", "status": "stopped"})

    except Exception as e:
        safe_log("error")
        return error_response("Something went wrong", 500)



@api_bp.route("/collaborations/<string:id>/toggle-status-updates", methods=["POST"])
@token_required
@role_required(["admin"])
def toggle_status_updates(id):
    try:
        user = get_current_user()
        if not user:
            safe_log("user_not_found")
            return error_response("User not found", 404)

        collab = Collaboration.query.get(id)
        if not collab:
            safe_log("collab_not_found")
            return error_response("Collaboration not found", 404)

        collab.allow_status_updates = not collab.allow_status_updates
        db.session.commit()

        owner = User.query.get(collab.user_id)
        owner_email = owner.email if owner else None

        if owner_email:
            send_status_update_toggle_email(
                owner_email,
                collab.title,
                collab.allow_status_updates,
                owner.name
            )

        safe_log("status_update_toggled")
        return success_response({
            "message": "Status updates toggled",
            "allow_status_updates": collab.allow_status_updates
        })

    except Exception as e:
        safe_log("toggle_error")
        return error_response("Something went wrong", 500)

def send_status_update_toggle_email(email, challenge_title, is_enabled, name):
    status_text = "enabled" if is_enabled else "disabled"

    html_body = f"""
    <html>
    <body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial, sans-serif;">

        <table align="center" width="100%" cellpadding="0" cellspacing="0"
            style="max-width:620px;margin:40px auto;background:#ffffff;
                   border-radius:8px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

            <tr>
                <td style="background:#0b1220;padding:26px;text-align:center;">
                    <img src="https://api.hustloop.com/static/images/logo.png"
                         style="width:150px;margin-bottom:8px;" />
                    <h2 style="color:#ffffff;margin:0;font-size:22px;">
                        Status Update Setting Changed
                    </h2>
                </td>
            </tr>

            <tr>
                <td style="padding:28px;color:#333;font-size:15px;line-height:1.7;">
                    <p>Hello {name},</p>

                    <p>
                        The status update option for your challenge:
                    </p>

                    <p style="font-size:17px;font-weight:bold;color:#111;">
                        {challenge_title}
                    </p>

                    <p>
                        has been <strong>{status_text}</strong> by an administrator.
                    </p>

                    <p style="margin-top:20px;">
                        You can now { "update" if is_enabled else "no longer update" } solution status from your dashboard.
                    </p>

                    <p style="margin-top:28px;font-size:13px;color:#555;">
                        If you believe this was a mistake, please contact support@hustloop.com.
                    </p>
                </td>
            </tr>

            <tr>
                <td style="background:#f1f5f9;padding:18px;text-align:center;font-size:13px;color:#6b7280;line-height:1.6;">

                    © {datetime.now().year} Hustloop · All Rights Reserved

                    <div style="margin-top:10px;">
                        <a href="https://x.com/hustloop" target="_blank" style="text-decoration:none;margin:0 8px;">
                            <img src="{os.getenv('X_ICON')}"
                                alt="X" style="width:22px;height:22px;vertical-align:middle;">
                        </a>

                        <a href="https://linkedin.com/company/hustloop" target="_blank" style="text-decoration:none;margin:0 8px;">
                            <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png"
                                alt="LinkedIn" style="width:22px;height:22px;vertical-align:middle;">
                        </a>
                    </div>

                </td>
            </tr>


        </table>

    </body>
    </html>
    """

    send_email(
        subject="Hustloop - Status Update Setting Changed",
        recipients=[email],
        html_body=html_body,
        sender=("Hustloop", current_app.config["MAIL_USERNAME"])
    )


@api_bp.route("/collaborations/<string:collab_id>", methods=["DELETE"])
@token_required
@role_required(['organisation'])
def delete_collaboration(collab_id):
    try:
        user = get_current_user()
        if not user:
            return error_response("User not found", 404)

        collab = Collaboration.query.get(collab_id)
        if not collab:
            return error_response("Collaboration not found", 404)

        if collab.user_id != user.uid:
            return error_response("You are not authorized to delete this collaboration", 403)

        db.session.delete(collab)
        db.session.commit()
        safe_log(f"Delete Collaborations {collab.user_id}")
        return jsonify({"message": "Collaboration deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        print("Error deleting collaboration:", e)
        return error_response("An unexpected error occurred while deleting the collaboration", 500)

@api_bp.route("/collaborations/user/<user_id>", methods=["GET"])
@token_required
@role_required(["admin"])
def get_collaborations_by_user(user_id):
    user = get_current_user()
    if not user:
        return error_response("User not found", 404)
    try:
        items = Collaboration.query.filter_by(user_id=user_id).all()

        if not items:
            safe_log("No collaborations found")
            return error_response("No collaborations found", 404)

        result = [item.to_dict() for item in items]

        safe_log("Fetched collaborations")
        return success_response(result)

    except Exception as e:
        safe_log(str(e))
        return error_response("Something went wrong", 500)
    
def is_allowed_file(file_obj):
    if not file_obj:
        return False, "No file object"
    filename = file_obj.filename
    if not filename:
        return False, "Empty filename"
    if file_obj.content_type not in ALLOWED_MIME:
        return False, f"Invalid content type: {file_obj.content_type}"
    size = 0
    if hasattr(file_obj, 'content_length') and file_obj.content_length:
        size = file_obj.content_length
    else:
        file_obj.stream.seek(0, os.SEEK_END)
        size = file_obj.stream.tell()
        file_obj.stream.seek(0)
    if size > MAX_FILE_SIZE:
        return False, f"File too large: {size} bytes"
    return True, None

def send_new_solution_notification(recipient_user, challenge, solution, submitter):
    try:
        recipient_name = recipient_user.name or "User"

        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 0;">

            <div style="background-color:#1a1f36; text-align:center; padding:24px;">
                <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" alt="Hustloop Logo"
                    style="max-width:160px; margin-bottom:12px;">
                <h2 style="margin:0; font-size:22px; font-weight:600; color:#ffffff;">
                    New Solution Submitted
                </h2>
            </div>

            <div style="padding:24px; font-size:16px; color:#333;">
                <p>Dear {recipient_name},</p>

                <p>
                    A new solution has been submitted for the challenge:
                    <strong>{challenge.title}</strong>.
                </p>

                <p>
                    Submitted by:
                    <strong>{submitter.name}</strong>
                    (<a href="mailto:{submitter.email}">{submitter.email}</a>)
                </p>

                <div style="margin:20px 0; padding:18px; background:#f8f9fc; border-left:4px solid #4c6fff;">
                    <p style="margin:0; font-size:15px; line-height:22px;">
                        <strong>Solution Details</strong><br>
                        • <strong>Submitted On:</strong> {format_datetime(solution.created_at)}<br>
                        • <strong>Challenge:</strong> {challenge.title}<br>
                    </p>
                </div>

                <p>You can review the solution inside your Hustloop dashboard.</p>

                <p>Regards,<br><strong>Hustloop</strong></p>
            </div>

            <div style="background-color:#f1f3f5; text-align:center; padding:20px; font-size:14px; color:#666;">
                <div style="margin-bottom:8px;">
                    © {datetime.now().year} Hustloop. All rights reserved.
                </div>

                <div style="margin-top:10px;">
                    <table border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                        <tr>
                            <td style="padding:0 8px;">
                                <a href="https://x.com/hustloop" target="_blank" style="text-decoration:none;">
                                    <img src="{os.getenv("X_ICON")}" alt="X" 
                                        style="display:block; width:24px; height:24px;">
                                </a>
                            </td>
                            <td style="padding:0 8px;">
                                <a href="https://linkedin.com/company/hustloop" target="_blank" style="text-decoration:none;">
                                    <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" 
                                        style="display:block; width:24px; height:24px;">
                                </a>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>

        </body>
        </html>
        """
        send_email(
            subject=f"New Solution Submitted for {challenge.title}",
            recipients=[recipient_user.email],
            html_body=html_body,
            sender=("Hustloop", current_app.config["MAIL_USERNAME"])
        )

        safe_log(f"solution_notify_sent:{recipient_user.email}")

    except Exception as e:
        safe_log(f"solution_notify_error:{str(e)}")


def send_solution_confirmation_email(creator_user, challenge, solution):
    """Send confirmation email to the solution creator/participant"""
    try:
        creator_name = creator_user.name or "User"

        html_body = f"""
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8f9fa;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8f9fa;">
                <tr>
                    <td align="center" style="padding: 20px 0;">
                        <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #ffffff;">
                            
                            <!-- Header -->
                            <tr>
                                <td align="center" style="background-color: #1a1f36; padding: 24px;">
                                    <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" alt="Hustloop Logo" 
                                         style="display: block; max-width: 160px; height: auto; margin-bottom: 12px;" />
                                    <h2 style="margin: 0; font-size: 22px; font-weight: 600; color: #ffffff; font-family: Arial, sans-serif;">
                                        Solution Submitted Successfully! 🎉
                                    </h2>
                                </td>
                            </tr>
                            
                            <!-- Main Content -->
                            <tr>
                                <td style="padding: 24px; font-size: 16px; color: #333333; font-family: Arial, sans-serif;">
                                    <p style="margin: 0 0 16px 0;">Dear {creator_name},</p>
                                    
                                    <p style="margin: 0 0 20px 0;">
                                        Congratulations! Your solution has been successfully submitted for the challenge:
                                        <strong>{challenge.title}</strong>.
                                    </p>
                                    
                                    <!-- Confirmation Box -->
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
                                        <tr>
                                            <td style="padding: 18px; background-color: #e8f5e9; border-left: 4px solid #4caf50;">
                                                <p style="margin: 0; font-size: 15px; line-height: 22px; color: #333333;">
                                                    <strong>✓ Submission Confirmed</strong><br/>
                                                    • <strong>Challenge:</strong> {challenge.title}<br/>
                                                    • <strong>Submitted On:</strong> {format_datetime(solution.created_at)}<br/>
                                                    • <strong>Solution ID:</strong> #{solution.id}
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <!-- What's Next Box -->
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
                                        <tr>
                                            <td style="padding: 18px; background-color: #f8f9fc; border-left: 4px solid #2196f3;">
                                                <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 600; color: #1a1f36;">
                                                    What's Next?
                                                </p>
                                                <p style="margin: 0; font-size: 14px; line-height: 22px; color: #555555;">
                                                    • Your solution is successfully submitted to the challenge organizers<br/>
                                                    • You can track your solution status in your dashboard<br/>
                                                    • You'll receive updates via email as your solution progresses<br/>
                                                    • If you submitted as a team, you can add team members from your dashboard
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <p style="margin: 20px 0 0 0;">
                                        You can view and manage your solution anytime from your 
                                        <a href="https://hustloop.com/" style="color: #2196f3; text-decoration: none; font-weight: 600;">
                                            Hustloop
                                        </a>.
                                    </p>
                                    
                                    <p style="margin: 24px 0 0 0; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666666; font-size: 14px;">
                                        Thank you for participating in this challenge. We wish you the best of luck!
                                    </p>
                                    
                                    <p style="margin: 16px 0 0 0;">Best regards,<br/><strong>Hustloop Team</strong></p>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td align="center" style="background-color: #f1f3f5; padding: 20px; font-size: 14px; color: #666666; font-family: Arial, sans-serif;">
                                    <p style="margin: 0 0 8px 0;">
                                        © {datetime.now().year} Hustloop. All rights reserved.
                                    </p>
                                    
                                    <table border="0" cellpadding="0" cellspacing="0" style="margin: 10px auto 0;">
                                        <tr>
                                            <td style="padding: 0 8px;">
                                                <a href="https://x.com/hustloop" target="_blank" style="text-decoration: none;">
                                                    <img src="{os.getenv("X_ICON")}" alt="X" 
                                                         style="display: block; width: 24px; height: 24px;" />
                                                </a>
                                            </td>
                                            <td style="padding: 0 8px;">
                                                <a href="https://linkedin.com/company/hustloop" target="_blank" style="text-decoration: none;">
                                                    <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" 
                                                         style="display: block; width: 24px; height: 24px;" />
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        send_email(
            subject=f"Solution Submitted Successfully - {challenge.title}",
            recipients=[creator_user.email],
            html_body=html_body,
            sender=("Hustloop", current_app.config["MAIL_USERNAME"])
        )

        safe_log(f"solution_confirmation_sent:{creator_user.email}")

    except Exception as e:
        safe_log(f"solution_confirmation_error:{str(e)}")


@api_bp.route("/solutions/<string:collab_id>", methods=["POST"])
@limiter.limit("5 per minute")
@token_required
@role_required(["founder"])
def create_solution(collab_id):
    try:
        user = get_current_user()
        if not user:
            return error_response("User not found", 404)

        challenge_id = collab_id
        description = request.form.get("description")
        contact_name = request.form.get("contactName")
        mobile_number = request.form.get("mobileNumber")
        place_of_residence = request.form.get("placeOfResidence")
        state = request.form.get("state")

        if not description:
            return error_response("Description is required")

        if len(description) > 15000:
            return error_response("Description must not Exceed 15000 characters")

        if not contact_name:
            return error_response("Contact name is required")

        if not mobile_number:
            return error_response("Mobile number is required")

        if not place_of_residence:
            return error_response("Place of residence is required")

        if not state:
            return error_response("State is required")
        
        if len(contact_name) > 300:
            return error_response("Contact name must not Exceed 300 characters")

        if len(mobile_number) > 10:
            return error_response("Mobile number must not Exceed 10 characters")

        if len(place_of_residence) > 50:
            return error_response("Place of residence must not Exceed 50 characters")

        if len(state) > 50:
            return error_response("State must not Exceed 50 characters")


        if not challenge_id or not description or not contact_name:
            return error_response("Missing required fields")

        collaboration = Collaboration.query.get(challenge_id)
        if not collaboration:
            return error_response("Invalid challengeId")

        existing_solution = Solution.query.filter_by(
            challenge_id=challenge_id,
            user_id=user.uid
        ).first()

        if existing_solution:
            return error_response("You have already submitted a solution for this challenge")

        # Create solution
        solution = Solution(
            challenge_id=challenge_id,
            description=description,
            contact_name=contact_name,
            mobile_number=mobile_number,
            user_id=user.uid,
            place_of_residence=place_of_residence,
            state=state,
            created_at=datetime.now(IST)
        )
        
        db.session.add(solution)
        db.session.flush()

        # FILE UPLOAD
        files = request.files.getlist("files")
        uploaded_files_meta = []

        if files:
            if len(files) > MAX_FILES:
                return error_response(f"Max {MAX_FILES} files allowed")

            for f in files:
                ok, reason = is_allowed_file(f)
                if not ok:
                    db.session.rollback()
                    return error_response(f"Invalid file '{f.filename}': {reason}")

                filename = secure_filename(f.filename)
                key = f"solution-docs/{uuid.uuid4().hex}_{filename}"

                f.stream.seek(0)
                s3_client.upload_fileobj(
                    f.stream,
                    S3_BUCKET_NAME,
                    key,
                    ExtraArgs={"ContentType": f.content_type}
                )

                file_rec = File(
                    name=filename,
                    url=key,
                    size=(f.content_length or 0),
                    solution_id=solution.id
                )
                db.session.add(file_rec)

                uploaded_files_meta.append({
                    "name": filename,
                    "url": key,
                    "size": (f.content_length or 0)
                })

        # Final commit
        db.session.commit()

        # -----------------------------
        # SEND NOTIFICATION EMAILS
        # -----------------------------

        # To solution creator (participant) - confirmation email
        send_solution_confirmation_email(
            creator_user=user,
            challenge=collaboration,
            solution=solution
        )

        # To challenge owner
        challenge_owner = User.query.filter_by(uid=collaboration.user_id).first()
        if challenge_owner:
            send_new_solution_notification(
                recipient_user=challenge_owner,
                challenge=collaboration,
                solution=solution,
                submitter=user
            )

        # To admins
        admins = User.query.filter_by(role="admin").all()
        for admin in admins:
            send_new_solution_notification(
                recipient_user=admin,
                challenge=collaboration,
                solution=solution,
                submitter=user
            )

        safe_log(f"solution_created:{solution.id}")

        return success_response({
            "message": "Solution submitted",
            "solutionId": solution.id,
            "files": uploaded_files_meta
        })

    except Exception as e:
        db.session.rollback()
        safe_log(f"Error creating solution:{str(e)}")
        return error_response("Internal server error")



def generate_firebase_password():
    upper = secrets.choice(string.ascii_uppercase)
    lower = secrets.choice(string.ascii_lowercase)
    digit = secrets.choice(string.digits)
    symbol = secrets.choice("!@#$%^&*()-_=+")

    base = [upper, lower, digit, symbol]

    chars = string.ascii_letters + string.digits + "!@#$%^&*()-_=+"
    base += [secrets.choice(chars) for _ in range(12)]

    random.shuffle(base)

    return "".join(base)

@api_bp.route("/verify-team-member", methods=["GET"])
@limiter.limit("3 per minute")
def verify_team_member():
    try:
        token = request.args.get("token")
        if not token:
            return error_response("Token missing")

        invite = TeamInvite.query.filter_by(id=token).first()
        if not invite:
            return error_response("Invalid token")

        already_used = invite.used
        if already_used:
            return error_response("already_invited")

        expires_at = invite.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at.astimezone(IST) < datetime.now(IST):
            return success_response({
                "status": "expired",
                "message": "Token expired",
                "email": None,
                "solution_id": None
            })

        invite.used = True
        db.session.commit()

        email = invite.email
        solution_id = invite.solution_id

        user = User.query.filter_by(email=email).first()
        if not user:
            return error_response("User not found in system")

        try:
            firebase_user = auth.get_user_by_email(email)
            if not firebase_user.email_verified:
                auth.update_user(firebase_user.uid, email_verified=True)
        except Exception as e:
            safe_log(f"firebase_verify_error:{e}")

        user.status = "active"
        user.is_confirmed = True
        db.session.commit()

        team_record = TeamSolutionMembers.query.filter_by(
            solution_id=solution_id,
            user_id=user.uid
        ).first()

        if not team_record:
            return error_response("Team membership record not found")

        was_pending = team_record.status != "accepted"
        team_record.status = "accepted"
        db.session.commit()

        if was_pending:
            verified_comment = Comment(
                id=str(uuid.uuid4()),
                solution_id=solution_id,
                collaboration_id=None,
                author_id=user.uid,
                text=f"{user.name} Joined The Team",
                isUpdated=False,
                isDraft=False,
                supportingFile=None,
                parent_id=None,
                comment_type="verified",
                timestamp=datetime.now(IST)
            )
            db.session.add(verified_comment)
            db.session.commit()

        safe_log("team_member_verified")

        return success_response({
            "status": "success",
            "email": email,
            "solution_id": solution_id,
            "redirect_to": "/"
        })

    except Exception as e:
        db.session.rollback()
        safe_log(f"team_verify_error:{e}")
        return error_response("Verification failed")


def send_team_invite_email(email, invite_link, password, isUserPresent, name, challenge_title, solution_creator):
    html_body = f"""
    <html>
    <body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial, sans-serif;">
      <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;margin:32px auto;">
        <tr>
          <td style="background:#0b1220;padding:28px 24px;text-align:center;border-radius:8px 8px 0 0;">
            <img src="https://api.hustloop.com/static/images/logo.png" alt="Hustloop" style="width:140px;display:block;margin:0 auto 10px;">
            <h2 style="color:#ffffff;margin:0;font-size:20px;">You're invited to collaborate</h2>
          </td>
        </tr>

        <tr>
          <td style="background:#ffffff;padding:28px 24px;border:1px solid #e6e9ef;">
            <p style="margin:0 0 12px 0;color:#1f2937;font-size:15px;">Hi {name},</p>

            <p style="margin:0 0 12px 0;color:#374151;font-size:15px;line-height:1.6;">
              <strong>{solution_creator}</strong> has invited you to collaborate on the solution for:
            </p>

            <p style="margin:0 0 18px 0;color:#0f172a;font-size:16px;font-weight:600;">{challenge_title}</p>

            <div style="text-align:center;margin:20px 0;">
              <a href="{invite_link}"
                 style="background:#2563eb;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;
                        font-weight:700;display:inline-block;font-size:15px;">
                Verify & Join Team
              </a>
            </div>

            {"" if isUserPresent else f"""
            <div style="margin:18px 0;padding:14px;border-radius:8px;background:#f8fafc;border-left:4px solid #2563eb;">
              <p style="margin:0;color:#0f172a;font-size:14px;">Temporary password for first-time login:</p>
              <p style="margin:8px 0 0 0;font-size:18px;font-weight:700;color:#0b1220;">{password}</p>
            </div>
            """}

            <p style="margin:18px 0 8px 0;color:#374151;font-size:13px;">
              This invitation link will expire in <strong>1 hour</strong>.
            </p>

            <p style="margin:0;color:#6b7280;font-size:13px;">
              If you did not expect this email, you can ignore it or contact support@hustloop.com
            </p>
          </td>
        </tr>

        <tr>
          <td style="background:#f1f5f9;padding:18px 24px;text-align:center;border-radius:0 0 8px 8px;color:#6b7280;font-size:13px;">
            <div style="max-width:560px;margin:0 auto;">
              <div style="margin-bottom:8px;">© {datetime.now().year} Hustloop. All rights reserved.</div>
              <div style="margin-top:10px;">
                    <a href="https://x.com/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                        <img src="{os.getenv("X_ICON")}" alt="X" 
                            style="width:24px; height:24px; vertical-align:middle;">
                    </a>
                    <a href="https://linkedin.com/company/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                        <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" style="width:24px; height:24px;">
                    </a>
                </div>
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    send_email(
        subject=f"Hustloop - Invite to collaborate on \"{challenge_title}\"",
        recipients=[email],
        html_body=html_body,
        sender=("Hustloop", current_app.config["MAIL_USERNAME"])
    )


def resend_team_invite_email(email, invite_link,name):
    html_body = f"""
    <html>
    <body style="margin:0; padding:0; background:#eef2f7; font-family:Arial, sans-serif;">

    <table align="center" cellpadding="0" cellspacing="0" width="100%"
           style="max-width:620px; margin:40px auto; background:#ffffff;
                  border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">

        <tr>
            <td style="background:#0f172a; padding:30px; text-align:center;">
                <img src="https://api.hustloop.com/static/images/logo.png"
                     alt="Hustloop" style="width:150px; margin-bottom:10px;">
                <h1 style="color:#ffffff; margin:0; font-size:24px;">
                    Your Team Invite is Waiting
                </h1>
            </td>
        </tr>

        <tr>
            <td style="padding:30px; color:#333; font-size:15px; line-height:1.7;">
                <p>Hello {name},</p>

                <p>
                    This is a reminder that you have been invited to join a solution
                    collaboration on <strong>Hustloop</strong>.
                </p>

                <p>Please use the button below to verify your account and join the team:</p>

                <div style="text-align:center; margin:28px 0;">
                    <a href="{invite_link}"
                       style="background:#2563eb; color:#fff; padding:14px 26px;
                              border-radius:6px; text-decoration:none; font-size:16px;
                              font-weight:bold; display:inline-block;">
                        Verify & Join Team
                    </a>
                </div>

                <div style="margin:25px 0; padding:18px 20px; border-radius:6px;
                            background:#f8fafc; border-left:4px solid #6366f1;">
                    <p style="margin:0; color:#1e293b;">
                        If you already received a previous invite email,
                        you can continue using the same password to log in.
                    </p>
                    <p style="margin-top:8px; color:#1e293b;">
                        If you forgot it, simply reset your password on the login page.
                    </p>
                </div>

                <p>
                    This invitation link will expire in <strong>1 hour</strong>.
                </p>

                <p>If you were not expecting this invitation, you may safely ignore this message.</p>
            </td>
        </tr>

        <tr>
          <td style="background:#f1f5f9;padding:18px 24px;text-align:center;border-radius:0 0 8px 8px;color:#6b7280;font-size:13px;">
            <div style="max-width:560px;margin:0 auto;">
              <div style="margin-bottom:8px;">© {datetime.now().year} Hustloop. All rights reserved.</div>
              <div style="margin-top:10px;">
                    <a href="https://x.com/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                        <img src="{os.getenv("X_ICON")}" alt="X" 
                            style="width:24px; height:24px; vertical-align:middle;">
                    </a>
                    <a href="https://linkedin.com/company/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                        <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" style="width:24px; height:24px;">
                    </a>
                </div>
            </div>
          </td>
        </tr>

    </table>

    </body>
    </html>
    """

    send_email(
        subject="Hustloop Team Invite Reminder",
        recipients=[email],
        html_body=html_body,
        sender=("Hustloop", current_app.config["MAIL_USERNAME"])
    )


@api_bp.route("/resend-invite-team-member", methods=["POST"])
@limiter.limit("3 per minute")
def resend_invite_team_member():
    try:
        data = request.json
        id = data.get("id")

        if not id:
            return error_response("Missing id")

        invite = TeamInvite.query.filter_by(id=id).first()
        if not invite:
            return error_response("Invite not found")

        user = User.query.filter_by(email=invite.email).first()
        if not user:
            return error_response("User not found")

        # Store original invite data before reassigning
        original_email = invite.email
        original_solution_id = invite.solution_id

        TeamInvite.query.filter_by(id=id).update({"used": True})
        db.session.commit()

        token = uuid.uuid4().hex
        invite = TeamInvite(
            id=token,
            email=original_email,
            solution_id=original_solution_id,
            expires_at=datetime.now(IST) + timedelta(hours=1),
            used=False
        )
        db.session.add(invite)
        db.session.commit()

        invite_link = f"https://hustloop.com/verify-team-member?token={token}"

        try:
            resend_team_invite_email(invite.email, invite_link, user.name)
        except Exception as mail_err:
            safe_log(f"resend_invite_mail_error:{mail_err}")
            return error_response("Failed to send email")

        member = User.query.filter_by(email=invite.email).first()
        if member:
            exists = TeamSolutionMembers.query.filter_by(
                solution_id=invite.solution_id,
                user_id=member.uid
            ).first()
            if not exists:
                db.session.add(
                    TeamSolutionMembers(
                        id=str(uuid.uuid4()),
                        solution_id=invite.solution_id,
                        user_id=member.uid,
                        status="pending"
                    )
                )
                db.session.commit()

        safe_log(f"resend_team_invite_sent:{invite.email}")

        return success_response({
            "status": "resent",
            "message": "Invitation link resent successfully"
        })

    except Exception as e:
        db.session.rollback()
        safe_log(f"resend_invite_error:{e}")
        return error_response("Invitation resend failed")





# @api_bp.route("/solutions/<string:collab_id>", methods=["POST"])
# @limiter.limit("5 per minute")
# @token_required
# @role_required(["founder"])
# def create_solution(collab_id):
#     user = get_current_user()
#     if not user:
#         return error_response("User not found", 404)
        
#     challenge_id = collab_id
#     description = request.form.get("description")
#     contact_name = request.form.get("contactName")
#     mobile_number = request.form.get("mobileNumber")
#     place_of_residence = request.form.get("placeOfResidence")
#     state = request.form.get("state")

#     if not challenge_id or not description or not contact_name:
#         return jsonify({"error": "Missing required fields"}), 400

#     collaboration = Collaboration.query.get(challenge_id)
#     if not collaboration:
#         return jsonify({"error": "Invalid challengeId"}), 404
    
#     existing_solution = Solution.query.filter_by(
#         challenge_id=challenge_id,
#         user_id=user.uid
#     ).first()

#     if existing_solution:
#         return jsonify({
#             "error": "You have already submitted a solution for this challenge"
#         }), 400

#     files = request.files.getlist("files")
#     if not files or len(files) == 0:
#         return jsonify({"error": "No files uploaded"}), 400
#     if len(files) > MAX_FILES:
#         return jsonify({"error": f"Max {MAX_FILES} files allowed"}), 400

#     uploaded_files_meta = []
#     try:
#         solution = Solution(
#             challenge_id=challenge_id,
#             description=description,
#             contact_name=contact_name,
#             mobile_number=mobile_number,
#             user_id=user.uid,
#             place_of_residence=place_of_residence,
#             state=state,
#             created_at=datetime.now(IST)
#         )
#         db.session.add(solution)
#         db.session.flush()  
#         for f in files:
#             ok, reason = is_allowed_file(f)
#             if not ok:
#                 db.session.rollback()
#                 return jsonify({"error": f"Invalid file '{f.filename}': {reason}"}), 400

#             filename = secure_filename(f.filename)
#             key = f"solution-docs/{filename}"

#             f.stream.seek(0)
#             s3_client.upload_fileobj(f.stream, S3_BUCKET_NAME, key, ExtraArgs={"ContentType": f.content_type})

#             file_rec = File(name=filename, url=key, size=(f.content_length or 0), solution_id=solution.id)
#             db.session.add(file_rec)
#             uploaded_files_meta.append({"name": filename, "url": key, "size": (f.content_length or 0)})
#         db.session.commit()
#         return jsonify({
#             "message": "Solution submitted",
#             "solutionId": solution.id,
#             "files": uploaded_files_meta
#         }), 201

#     except Exception as e:
#         safe_log(f"Error creating solution:{e}")
#         db.session.rollback()
#         return jsonify({"error": "Internal server error"}), 500


    
@api_bp.route("/solutions/<string:collab_id>", methods=["GET"])
@token_required
@role_required(["founder",'organisation',"admin"])
def get_solution(collab_id):
    user = get_current_user()
    if not user:
        return error_response("User not found", 404)
    
    if not founder_msme(user):
        return jsonify({
            "error": "Only founders with role 'Solve Organisation's challenge' are Get Solution"
        }), 403
    
    challenge_id = collab_id
    solution = Solution.query.filter_by(
        challenge_id=challenge_id,
        user_id=user.uid
    ).first()

    if not solution:
        return jsonify({"error": "No solution found for this user and challenge"}), 404

    files = File.query.filter_by(solution_id=solution.id).all()
    file_list = []

    for f in files:
        try:
            presigned_url = s3_client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": S3_BUCKET_NAME,
                    "Key": f.url, 
                    "ResponseContentDisposition": f'attachment; filename="{f.name}"'
                },
                ExpiresIn=3600  
            )
        except Exception as e:
            safe_log(f"Error generating presigned URL for {f.name}: {e}")
            presigned_url = None

        file_list.append({
            "name": f.name,
            "path": f.url,  
            "previewUrl": presigned_url,  
            "size": f.size
        })

    return jsonify({
        "solutionId": solution.id,
        "title":solution.title,
        "challengeId": solution.challenge_id,
        "description": solution.description,
        "contactName": solution.contact_name,
        "mobileNumber": solution.mobile_number,
        "placeOfResidence": solution.place_of_residence,
        "state": solution.state,
        "createdAt": solution.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        "files": file_list
    }), 200


@api_bp.route("/solutions", methods=["GET"])
@token_required
@role_required(["founder", 'organisation', "admin"])
def get_all_solutions():
    user = get_current_user()
    if not user:
        return error_response("User not found", 404)

    if not founder_msme(user):
        return jsonify({
            "error": "Only founders with role 'Solve Organisation's challenge' can get solutions"
        }), 403

    query = Solution.query

    if user.role == "founder":

        own_solutions = Solution.user_id == user.uid

        team_solution_ids = [
            t.solution_id for t in TeamSolutionMembers.query.filter_by(user_id=user.uid).all()
        ]

        if team_solution_ids:
            query = query.filter(
                or_(own_solutions, Solution.id.in_(team_solution_ids))
            )
        else:
            query = query.filter(own_solutions)

    elif user.role == "organisation":
        my_challenges = [c.id for c in Collaboration.query.filter_by(user_id=user.uid).all()]

        if not my_challenges:
            return success_response({"solutions": []})

        query = query.filter(Solution.challenge_id.in_(my_challenges))

    elif user.role == "admin":
        pass

    else:
        return jsonify({"error": "Invalid role"}), 403

    status_filter = request.args.get("status")
    challenge_id = request.args.get("challengeId")

    if status_filter:
        query = query.filter(Solution.status == status_filter)
    if challenge_id:
        query = query.filter(Solution.challenge_id == challenge_id)

  
    solutions = query.order_by(Solution.created_at.desc()).all()

    results = []

    for solution in solutions:
        file_list = []
        files = File.query.filter_by(solution_id=solution.id).all()
        for f in files:
            try:
                presigned_url = s3_client.generate_presigned_url(
                    "get_object",
                    Params={
                        "Bucket": S3_BUCKET_NAME,
                        "Key": f.url,
                        "ResponseContentDisposition": f'attachment; filename="{f.name}"'
                    },
                    ExpiresIn=3600
                )
            except Exception as e:
                safe_log(f"Error generating presigned URL for {f.name}: {e}")
                presigned_url = None

            file_list.append({
                "name": f.name,
                "path": f.url,
                "previewUrl": presigned_url,
                "size": f.size
            })

        comments = Comment.query.filter_by(solution_id=solution.id).order_by(
            Comment.timestamp.desc()
        ).all()

        

        comment_list = [
            {
                "id": c.id,
                "authorId": c.author_id,
                "authorName": getattr(c.author, "full_name", None),
                "authorRole": getattr(c.author, "role", None),
                "text": c.text,
                "timestamp": c.timestamp.strftime("%Y-%m-%d %H:%M:%S")
            }
            for c in comments
        ]
        last_active = comments[0].timestamp.strftime("%Y-%m-%d %H:%M:%S") if comments else None
        challenge = solution.challenge
        challenge_creator_profile = (
            challenge.creator.msme_profile
            if challenge and challenge.creator and challenge.creator.msme_profile
            else None
        )
        team_members = []

        creator = User.query.filter_by(uid=solution.user_id).first()
        if creator:
            team_members.append({
                "userId": creator.uid,
                "name": creator.name,
                "email": creator.email,
            })

        team_links = TeamSolutionMembers.query.filter_by(solution_id=solution.id).all()
      
        for link in team_links:
            member = User.query.filter_by(uid=link.user_id).first()
            if member:
                team_members.append({
                    "userId": member.uid,
                    "name": member.name,
                    "email": member.email,
                    "status":link.status
                })
        is_owner = (solution.user_id == user.uid)

        results.append({
            "solutionId": solution.id,
            "challengeId": solution.challenge_id,
            "description": solution.description,
            "user_id":solution.user_id,
            "contactName": solution.contact_name,
            "placeOfResidence": solution.place_of_residence,
            "points": solution.points,
            "state": solution.state,
            "status": solution.status.value if hasattr(solution.status, "value") else solution.status,
            "createdAt": solution.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "files": file_list,
            "comments": comment_list,
            "team_members": team_members,
            "lastActive": last_active,
            "isOwner": is_owner,
            "challenge": {
                "title": challenge.title if challenge else None,
                "sector": challenge.sector if challenge else None,
                "technologyArea": challenge.technology_area if challenge else None,
                "allow_status_updates": challenge.allow_status_updates if challenge else True,
                "status":challenge.status.value if hasattr(challenge.status, "value") else challenge.status,
                "postedBy": {
                    "companyName": challenge_creator_profile.company_name if challenge_creator_profile else None,
                } if challenge_creator_profile else None
            } if challenge else None
        })

    return jsonify({
        "solutions": results
    }), 200

@api_bp.route("/solution/<string:solution_id>/team-members/<string:user_id>", methods=["DELETE"])
@token_required
@role_required(["founder","admin"])
def remove_team_member(solution_id, user_id):
    try:
        user = get_current_user()
        if not user:
            return error_response("User not found", 404)

        solution = Solution.query.filter_by(id=solution_id).first()
        if not solution:
            return error_response("Solution not found", 404)

        if solution.user_id != user.uid:
            return error_response("Only the owner can remove team members", 403)

        link = TeamSolutionMembers.query.filter_by(
            solution_id=solution_id,
            user_id=user_id
        ).first()

        if not link:
            return error_response("Team member not found", 404)

        member = User.query.filter_by(uid=user_id).first()
        removed_name = member.name if member else user_id
        owner_name = user.name if user else "Owner"

        db.session.delete(link)

        remove_comment = Comment(
            id=str(uuid.uuid4()),
            solution_id=solution.id,
            collaboration_id=solution.challenge_id,
            author_id=user.uid,
            text=f"{owner_name} removed {removed_name}",
            isUpdated=False,
            isDraft=False,
            supportingFile=None,
            parent_id=None,
            comment_type="delete",
            timestamp=datetime.now(IST)
        )
        db.session.add(remove_comment)

        db.session.commit()

        safe_log(f"team_member_removed:{user_id}")
        return success_response({"message": "Team member removed"})

    except Exception as e:
        db.session.rollback()
        safe_log(f"team_member_remove_error:{e}")
        return error_response("Failed to remove team member")



@api_bp.route("/solution/<string:solution_id>/team-members", methods=["POST"])
@token_required
@role_required(["founder"])
@limiter.limit("2 per minute")
def add_team_member(solution_id):
    isUserPresent=None
    try:
        user = get_current_user()
        if not user:
            return error_response("User not found", 404)

        solution = Solution.query.filter_by(id=solution_id).first()
        challenge = Collaboration.query.filter_by(id=solution.challenge_id).first()

        if challenge.status == "expired" or challenge.status == "stopped":
            return error_response("Challenge is expired", 403)

        if not solution:
            return error_response("Solution not found", 404)

        if solution.user_id != user.uid:
            return error_response("Only the owner can add team members", 403)
        
        solutionCreator = user.name

        data = request.json
        email = data.get("email")
        name = data.get("name")
        if not email:
            return error_response("Email is required")
        if not name:
            return error_response("Name is required")

        member = User.query.filter_by(email=email).first()
        password = generate_firebase_password()
        if not member:
            isUserPresent=False
            try:
                firebase_user = auth.get_user_by_email(email)
                firebase_uid = firebase_user.uid
            except auth.UserNotFoundError:
                firebase_user = auth.create_user(
                    email=email,
                    password=password,
                    display_name=name,
                    email_verified=False
                )
                firebase_uid = firebase_user.uid

            member = User(
                uid=firebase_uid,
                name=name,
                email=email,
                role="founder",
                founder_role="Solve Organisation's challenge",
                auth_provider="local",
                is_confirmed=False,
                is_banned=False,
                has_subscription=False,
                status="pending",
                must_reset_password=True,
                created_at=datetime.utcnow()
            )
            db.session.add(member)
            db.session.commit()

        else:
            isUserPresent=True
            member.role = "founder"
            member.founder_role = "Solve Organisation's challenge"
            db.session.commit()

            exists = TeamSolutionMembers.query.filter_by(
                solution_id=solution_id,
                user_id=member.uid
            ).first()

            if exists:
                return success_response({"message": "Member already added"})

            existing_solution = Solution.query.filter_by(
                challenge_id=solution.challenge_id,
                user_id=member.uid).first()
            if existing_solution:
                return error_response(
                    f"{member.name} has already submitted their own solution for this challenge and cannot be added as a team member",
                    409
                )

        # -------------------------------
        # Create team membership (pending)
        # -------------------------------
        team_record = TeamSolutionMembers(
            id=str(uuid.uuid4()),
            solution_id=solution_id,
            user_id=member.uid,
            status="pending"
        )
        db.session.add(team_record)

        # -------------------------------
        # Add invited comment
        # -------------------------------
        invited_comment = Comment(
            id=str(uuid.uuid4()),
            solution_id=solution_id,
            collaboration_id=solution.challenge_id,
            author_id=user.uid,
            text=f"Invited: {member.name or email}",
            isUpdated=False,
            isDraft=False,
            supportingFile=None,
            parent_id=None,
            comment_type="invited",
            timestamp=datetime.now(IST)
        )
        db.session.add(invited_comment)

        db.session.commit()

        # -------------------------------
        # Send email AFTER commit
        # -------------------------------
        invite_token = uuid.uuid4().hex

        invite = TeamInvite(
            id=invite_token,
            email=email,
            solution_id=solution_id,
            expires_at=datetime.now(IST) + timedelta(hours=1)
        )
        db.session.add(invite)
        db.session.commit()

        invite_link = f"https://hustloop.com/verify-team-member?token={invite_token}"

        try:
            send_team_invite_email(email, invite_link,password,isUserPresent,name,challenge.title,solutionCreator)
        except Exception as e:
            safe_log(f"add_member_send_mail_error:{e}")
            return error_response("Failed to send invite")

        safe_log(f"add_member_invite_sent:{email}")

        return success_response({
            "message": "Invitation sent",
            "email": email,
            "solution_id": solution_id
        })

    except Exception as e:
        db.session.rollback()
        safe_log(f"add_team_member_error:{e}")
        return error_response("Failed to add team member")



def find_user_by_email(email):
    return User.query.filter_by(email=email).first()

@api_bp.route("/solutions/<solution_id>/status", methods=["PUT"])
@token_required
@role_required(['organisation', "admin"])
def update_solution_status(solution_id):
    try:
        user = get_current_user()
        if not user:
            safe_log("solution_status_update_failed: user_not_found")
            return error_response("User not found", 404)

        data = request.get_json()
        new_status = data.get("status")

        if not new_status:
            safe_log(f"solution_status_update_failed: status_missing for user {user.uid}")
            return error_response("Status is required", 400)

        solution = Solution.query.filter_by(id=solution_id).first()
        if not solution:
            safe_log(f"solution_status_update_failed: solution_not_found for user {user.uid}")
            return error_response("Solution not found", 404)

        founder = solution.user
        founder_email = founder.email if founder else None

        msme = solution.challenge.creator if solution.challenge else None
        msme_email = msme.email if msme else None

        admin_users = User.query.filter_by(role="admin").all()
        admin_emails = [a.email for a in admin_users]

        if user.role == "organisation":
            my_challenges = [c.id for c in Collaboration.query.filter_by(user_id=user.uid).all()]
            if solution.challenge_id not in my_challenges:
                safe_log(f"solution_status_update_denied: user {user.uid} not_authorized for solution {solution_id}")
                return error_response("Not authorized to modify this solution", 403)

        solution.status = new_status

        if new_status == "solution_accepted_points":
            solution.points = 50
            solution.reward_amount = 0
        elif new_status == "winner":
            reward_amount = solution.challenge.reward_amount if solution.challenge and solution.challenge.reward_amount else 0
            solution.points = 50
            solution.reward_amount = reward_amount
        else:
            solution.points = 0
            solution.reward_amount = 0

        db.session.commit()

        status_color = STATUS_COLOR_MAP.get(new_status, "#0d6efd")

        if user.role == "admin":
            recipients = list(filter(None, {founder_email, msme_email}))
        else:
            recipients = list(filter(None, set(admin_emails + [founder_email])))

        # submission_url = f"https://hustloop.com/submission/{solution.id}"

        # view_submission_button = f"""
        #     <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="left" style="margin-top: 20px; margin-bottom: 20px;">
        #         <tr>
        #             <td style="border-radius: 4px; background: #007bff; text-align: center;">
        #                 <a href="{submission_url}" target="_blank" style="
        #                     background: #007bff; 
        #                     border: 1px solid #007bff; 
        #                     font-family: Arial, sans-serif; 
        #                     font-size: 15px; 
        #                     text-decoration: none; 
        #                     display: block; 
        #                     border-radius: 4px; 
        #                     font-weight: bold; 
        #                     padding: 10px 20px; 
        #                     color: #ffffff;">
        #                     View Submission Details
        #                 </a>
        #             </td>
        #         </tr>
        #     </table>
        # """

        # Create winner announcement BEFORE the email loop (to avoid duplicates)
        if new_status == "winner":
            collab = Collaboration.query.get(solution.challenge_id)
            isOwner = collab.user_id == user.uid
            isAdmin = user.role == "admin"
            created_by = "User"
            company_name = MSMEProfile.query.filter_by(user_id=solution.challenge.user_id).first().company_name
            if isAdmin:
                created_by = "Admin"
            elif isOwner and company_name:
                created_by = company_name + " " + "Staff"
            
            announcement = Announcement(
                user_id=user.uid,
                created_by=created_by,
                collaboration_id=solution.challenge_id,
                title="Winner Announced",
                message="The winner is " + solution.user.name,
                type="result",
            )
            collab.status = "stopped"
            db.session.add(collab)
            db.session.add(announcement)
            db.session.commit()
        for email in recipients:

            recipient_user = find_user_by_email(email)  
            recipient_name = recipient_user.name if recipient_user else "User"

            if new_status == "solution_accepted_points" and recipient_user.uid == solution.user_id:
                token = uuid.uuid4().hex
                expires_at = datetime.utcnow() + timedelta(hours=24)
                pitch_token = PitchingToken(
                    id=str(uuid.uuid4()),
                    solution_id=solution.id,
                    user_id=recipient_user.uid,
                    token=token,
                    expires_at=expires_at
                )
                db.session.add(pitch_token)
                db.session.commit()
                pitch_form_link = f"{os.getenv('FRONTEND_URL')}/pitching-form?token={token}"
                html_body = f"""
                <html>
                <body style="margin:0; padding:0; background-color:#f8f9fa; font-family: Arial, sans-serif;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f8f9fa" style="padding:0; margin:0;">
                    <tr>
                        <td align="center">

                            <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#1a1f36" style="border-radius:4px 4px 0 0;">
                                <tr>
                                    <td align="center" style="padding:24px;">
                                        <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" alt="Hustloop Logo" style="max-width:160px; margin-bottom:12px;">
                                        <h2 style="margin:0; font-size:22px; font-weight:600; color:#ffffff;">
                                            Solution Accepted
                                        </h2>
                                    </td>
                                </tr>
                            </table>

                            <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff">
                                <tr>
                                    <td style="padding:24px; font-size:16px; color:#333;">
                                        
                                        <p>Dear {recipient_name},</p>

                                        <p>Your solution for <strong>{solution.challenge.title}</strong> has been accepted.</p>
                                        <p>You must now submit your pitching session details.</p>

                                        <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin:30px auto;">
                                            <tr>
                                                <td align="center" bgcolor="#1a1f36" style="border-radius:6px;">
                                                    <a href="{pitch_form_link}" target="_blank" 
                                                    style="display:inline-block; padding:12px 22px; 
                                                    color:#ffffff; text-decoration:none; font-weight:600;
                                                    font-size:16px; border-radius:6px;">
                                                    Fill Pitching Form
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>

                                        <p><strong>Points Awarded:</strong> 50</p>
                                        <p><strong>Updated On:</strong> {format_datetime(datetime.now())}</p>

                                        <p>Regards,<br><strong>Hustloop</strong></p>
                                    </td>
                                </tr>
                            </table>

                            <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#f1f3f5" style="border-radius:0 0 4px 4px; margin-top:10px;">
                                <tr>
                                    <td align="center" style="padding:20px; font-size:14px; color:#666;">
                                        © {datetime.now().year} Hustloop. All rights reserved.
                                    </td>
                                </tr>

                                <tr>
                                    <td align="center" style="padding-bottom:20px;">

                                        <a href="https://x.com/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                                            <img src="{os.getenv('X_ICON')}" alt="X" 
                                                style="width:24px; height:24px; vertical-align:middle;">
                                        </a>

                                        <a href="https://linkedin.com/company/hustloop" target="_blank" style="text-decoration:none; margin:0 8px;">
                                            <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" 
                                                style="width:24px; height:24px; vertical-align:middle;">
                                        </a>

                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>
                </table>
                </body>
                </html>
                """
            elif new_status == "winner":
                reward_amount = solution.challenge.reward_amount

                html_body = f"""
                    <html>
                    <body style="margin:0; padding:0; background-color:#f8f9fa; font-family:Arial, sans-serif;">

                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1a1f36;">
                            <tr>
                                <td align="center" style="padding:24px;">
                                    <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" alt="Hustloop Logo" 
                                        style="max-width:160px; display:block; margin-bottom:12px;">
                                    <h2 style="margin:0; font-size:22px; font-weight:600; color:#ffffff;">
                                        Solution Status Updated
                                    </h2>
                                </td>
                            </tr>
                        </table>

                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td style="padding:24px; font-size:16px; color:#333333;">

                                    <p>Dear {recipient_name},</p>

                                    <p>Your solution for <strong>{solution.challenge.title}</strong> has been selected as the winner.</p>

                                    <table align="center" cellpadding="0" cellspacing="0" border="0" 
                                        style="margin:30px auto;">
                                        <tr>
                                            <td align="center" 
                                                style="background:#16a34a; color:#ffffff; padding:12px 20px;
                                                    border-radius:6px; font-size:18px; font-weight:600;">
                                                ₹ {reward_amount}
                                            </td>   
                                        </tr>
                                        <tr>
                                            <td align="center" 
                                                style="padding-top:16px; font-size:15px; color:#14532d; font-weight:500;">
                                                Your reward will be credited soon.
                                            </td>
                                        </tr>
                                    </table>

                                    <p><strong>Points:</strong> {solution.points}</p>
                                    <p><strong>Updated On:</strong> {format_datetime(datetime.now())}</p>

                                    <p>Regards,<br><strong>Hustloop</strong></p>
                                </td>
                            </tr>
                        </table>

                        <table width="100%" cellpadding="0" cellspacing="0" border="0" 
                            style="background-color:#f1f3f5;">
                            <tr>
                                <td align="center" 
                                    style="padding:20px; font-size:14px; color:#666666;">
                                    © {datetime.now().year} Hustloop. All rights reserved.
                                </td>
                            </tr>
                        </table>

                    </body>
                    </html>
                    """
            else:
                html_body = f"""
                    <html>
                    <body style="margin:0; padding:0; background-color:#f8f9fa; font-family:Arial, sans-serif;">

                    <table width="100%" cellspacing="0" cellpadding="0" border="0" 
                        style="margin:0; padding:0; background-color:#f8f9fa;">
                        <tr>
                            <td align="center" style="padding:0; margin:0;">

                                <table width="600" cellspacing="0" cellpadding="0" border="0" 
                                    style="background-color:#ffffff; border-radius:6px; overflow:hidden; margin:0 auto;">

                                    <tr>
                                        <td align="center" style="background-color:#1a1f36; padding:24px;">
                                            <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" alt="Hustloop Logo" 
                                                style="max-width:160px; display:block; margin-bottom:12px;">
                                            <h2 style="margin:0; font-size:22px; font-weight:600; color:#ffffff;">
                                                Solution Status Updated
                                            </h2>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td style="padding:24px; color:#333333; font-size:16px; line-height:1.5;">

                                            <p style="margin:0;">Dear {recipient_name},</p>
                                            <p style="margin-top:16px;">The status of the solution has been updated.</p>

                                            <table align="center" cellspacing="0" cellpadding="0" border="0" 
                                                style="margin:20px auto;">
                                                <tr>
                                                    <td style="
                                                        padding:6px 14px;
                                                        border-radius:6px;
                                                        font-weight:600;
                                                        font-size:15px;
                                                        color:{status_color};
                                                        background-color:{status_color}20;
                                                        border:1px solid {status_color}40;
                                                        text-align:center;">
                                                        {new_status.replace('_',' ').title()}
                                                    </td>
                                                </tr>
                                            </table>

                                            <p><strong>Points:</strong> {solution.points}</p>
                                            <p><strong>Updated On:</strong> {format_datetime(datetime.now())}</p>

                                            <p>Regards,<br><strong>Hustloop</strong></p>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td align="center" style="background-color:#f1f3f5; padding:20px; font-size:14px; color:#666666;">
                                            <div style="margin-bottom:8px;">
                                                © {datetime.now().year} Hustloop. All rights reserved.
                                            </div>

                                            <table align="center" cellspacing="0" cellpadding="0" border="0" 
                                                style="margin:10px auto 0 auto;">
                                                <tr>
                                                    <td style="padding:0 8px;">
                                                        <a href="https://x.com/hustloop" target="_blank" style="text-decoration:none;">
                                                            <img src="{os.getenv('X_ICON')}" alt="X" 
                                                                style="width:24px; height:24px; display:block;">
                                                        </a>
                                                    </td>
                                                    <td style="padding:0 8px;">
                                                        <a href="https://linkedin.com/company/hustloop" target="_blank" style="text-decoration:none;">
                                                            <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" 
                                                                alt="LinkedIn" style="width:24px; height:24px; display:block;">
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    </body>
                    </html>
                    """


            send_email(
                recipients=[email],
                subject=f"Solution Status Updated: {solution.challenge.title}",
                html_body=html_body,
                sender=("Hustloop", current_app.config["MAIL_USERNAME"])
            )
        comments_to_add = []
        safe_log(f"status:{new_status}")

        if new_status == "solution_accepted_points":

            comments_to_add.append(
                Comment(
                    id=str(uuid.uuid4()),
                    solution_id=solution.id,
                    collaboration_id=solution.challenge_id,
                    author_id=user.uid,
                    text="Solution accepted",
                    isUpdated=False,
                    isDraft=False,
                    supportingFile=None,
                    parent_id=None,
                    comment_type="status_update",
                    timestamp=datetime.now(IST)
                )
            )

            # Comment 2: Reward points
            comments_to_add.append(
                Comment(
                    id=str(uuid.uuid4()),
                    solution_id=solution.id,
                    collaboration_id=solution.challenge_id,
                    author_id=user.uid,
                    text="Rewarded 50 points",
                    isUpdated=False,
                    isDraft=False,
                    supportingFile=None,
                    parent_id=None,
                    comment_type="points",
                    timestamp=datetime.now(IST)
                )
            )
        elif new_status == "winner":
            comments_to_add.append(Comment(
                id=str(uuid.uuid4()),
                solution_id=solution.id,
                collaboration_id=solution.challenge_id,
                author_id=user.uid,
                text="Winner announced",
                isUpdated=False,
                isDraft=False,
                supportingFile=None,
                parent_id=None,
                comment_type="status_update",
                timestamp=datetime.now(IST)
            ))
            comments_to_add.append(Comment(
                id=str(uuid.uuid4()),
                solution_id=solution.id,
                collaboration_id=solution.challenge_id,
                author_id=user.uid,
                text=f"Reward amount credited: ₹ {solution.challenge.reward_amount}",
                isUpdated=False,
                isDraft=False,
                supportingFile=None,
                parent_id=None,
                comment_type="points",
                timestamp=datetime.now(IST)
            ))
        else:
            # Default: one general status update comment
            comments_to_add.append(
                Comment(
                    id=str(uuid.uuid4()),
                    solution_id=solution.id,
                    collaboration_id=solution.challenge_id,
                    author_id=user.uid,
                    text=f"Status changed to '{new_status.replace('_',' ').title()}'",
                    isUpdated=False,
                    isDraft=False,
                    supportingFile=None,
                    parent_id=None,
                    comment_type="status_update",
                    timestamp=datetime.now(IST)
                )
            )

        # Save all comments
        for c in comments_to_add:
            db.session.add(c)
        db.session.commit()

        safe_log(
            f"solution_status_updated: user {user.uid} -> {new_status} for {solution_id} | emailed={recipients}"
        )


        return jsonify({
            "message": "Status updated successfully",
            "solutionId": solution.id,
            "newStatus": new_status,
            "points": solution.points,
        }), 200

    except Exception as e:
        db.session.rollback()
        safe_log(f"solution_status_update_error for solution {solution_id}: {str(e)}")
        return error_response("An unexpected error occurred while updating status", 500)


@api_bp.route('/solutions/<string:solution_id>', methods=['DELETE'])
@token_required
@role_required(['founder','admin'])
def delete_solution(solution_id):
    solution=None
    try:
        user = get_current_user()
        if not user:
            return error_response("User not found", 404)

        solution = Solution.query.filter_by(id=solution_id).first()
        
        if user.role != "admin" and user.uid != solution.user_id:
            return error_response("You are not authorized to delete this solution", 403)
        
        if not solution:
            return error_response("Solution not found", 404)

        if solution.user_id != user.uid:
            return error_response("You are not the owner of this solution", 403)

        TeamSolutionMembers.query.filter_by(solution_id=solution_id).delete()

        files = File.query.filter_by(solution_id=solution_id).all()
        for f in files:
            try:
                s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=f.url)
            except Exception as e:
                safe_log(f"s3_delete_error:{e}")

            db.session.delete(f)

        Comment.query.filter_by(solution_id=solution_id).delete()

        db.session.delete(solution)

        db.session.commit()
        safe_log(f"solution_deleted:{solution_id}")
        return success_response("Solution deleted successfully")
    except Exception as e:
        safe_log(f"delete_solution_error:{e}")
        db.session.rollback()
        return error_response("Failed to delete solution")
    
@api_bp.route("/comments", methods=["GET"])
@token_required
@role_required(["founder", 'organisation', "admin"])
def get_comments():
    
    user = get_current_user()
    
    if not user:
        return error_response("User not found", 404)
    
    if not founder_msme(user):
        return jsonify({
            "error": "Only founders with role 'Solve Organisation's challenge' are Get Comments"
        }), 403
    
    solution_id = request.args.get("solutionId")
    if not solution_id:
        return error_response("solutionId is required", 400)

    comments = (
        Comment.query
        .options(joinedload(Comment.author))
        .filter_by(solution_id=solution_id)
        .order_by(Comment.timestamp.asc())
        .all()
    )

    comment_list = []
    for c in comments:
        comment_data = c.to_dict()
        presigned_url = None
        file_name = None

        if c.supportingFile:
            try:
                presigned_url = s3_client.generate_presigned_url(
                    "get_object",
                    Params={
                        "Bucket": S3_BUCKET_NAME,
                        "Key": c.supportingFile,
                        "ResponseContentDisposition": f'attachment; filename="{os.path.basename(c.supportingFile)}"',
                    },
                    ExpiresIn=3600
                )
                file_name = os.path.basename(c.supportingFile)
            except Exception as e:
                safe_log(f"Error generating presigned URL for comment {c.id}: {e}")

        comment_data["fileURL"] = presigned_url
        comment_data["fileName"] = file_name

        comment_list.append(comment_data)

    return jsonify({"comments": comment_list}), 200

@socketio.on("join_solution")
def handle_join_solution(data):
    solution_id = data.get("solutionId")
    join_room(f"solution_{solution_id}")
    socketio.emit("joined", {"message": f"Joined room for solution {solution_id}"})


@socketio.on("leave_solution")
def handle_leave_solution(data):
    solution_id = data.get("solutionId")
    leave_room(f"solution_{solution_id}")
    socketio.emit("left", {"message": f"Left room for solution {solution_id}"})
    
@api_bp.route("/comments", methods=["POST"])
@token_required
@role_required(["founder", 'organisation', "admin"])
@limiter.limit("2 per minute")
def create_comment():
    user = get_current_user()

    if not user:
        return error_response("User not found", 404)
    
    if not founder_msme(user):
        return jsonify({
            "error": "Only founders with role 'Solve Organisation's challenge' are POST Comments"
        }), 403
        
    if request.content_type.startswith("multipart/form-data"):
        solution_id = request.form.get("solutionId")
        collaboration_id = request.form.get("challengeId")
        text = request.form.get("text", "").strip()
        parent_id = request.form.get("parentId")
        is_draft = request.form.get("isDraft", "false").lower() == "true"
        file = request.files.get("file")
    else:
        data = request.get_json() or {}
        solution_id = data.get("solutionId")
        collaboration_id = data.get("challengeId")
        text = (data.get("text") or "").strip()
        parent_id = data.get("parentId")
        is_draft = data.get("isDraft", False)
        file = None


    if not solution_id:
        return error_response("solutionId is required", 400)
    if not text and not file:
        return error_response("Either text or file must be provided", 400)


    solution = Solution.query.get(solution_id)
    if solution.status in ["rejected", "solution_accepted_points"]:
        safe_log("solution_closed")
        return error_response("You cannot comment on this solution", 403)
    
    if not solution:
        return error_response("Solution not found", 404)

    collab = solution.challenge
    if not collab:
        safe_log("collab_not_found")
        return error_response("Challenge not found", 404)

    application_ended = collab.end_date
    extended_end_date = collab.extended_end_date
    review_started = extended_end_date if extended_end_date else application_ended
    review_ended = review_started + relativedelta(months=1)
    if len(collab.solutions) > 20:
        review_ended = review_ended + timedelta(days=15)
    screening_started = review_ended
    screening_ended = screening_started + relativedelta(months=1)

    now = datetime.now(IST)
    screening_ended = screening_ended.replace(tzinfo=IST)

    if now > screening_ended:
        safe_log("timeline_over")
        return error_response("Commenting is closed as the challenge timeline has ended", 403)

    file_path = None
    filename = None
    if file:
        try:
            filename = secure_filename(file.filename)
            file_ext = os.path.splitext(filename)[1]
            unique_key = f"comments/{filename}"

            s3_client.upload_fileobj(
                Fileobj=file,
                Bucket=S3_BUCKET_NAME,
                Key=unique_key,
                ExtraArgs={
                    "ContentType": file.content_type,
                    "ACL": "private"
                }
            )

            file_path = unique_key
        except Exception as e:
            safe_log(f"S3 upload failed: {e}")
            return error_response("Failed to upload file to S3", 500)


    comment = Comment(
        solution_id=solution_id,
        collaboration_id=collaboration_id,
        author_id=user.uid,
        text=text if text else "",
        parent_id=parent_id,
        isDraft=is_draft,
        supportingFile=file_path,
        timestamp=datetime.now(IST)
    )
    
    db.session.add(comment)
    db.session.commit()

    presigned_url = None
    if file_path:
        try:
            presigned_url = s3_client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": S3_BUCKET_NAME,
                    "Key": file_path,
                    "ResponseContentDisposition": f'attachment; filename="{os.path.basename(file_path)}"',
                },
                ExpiresIn=3600,
            )
        except Exception as e:
            safe_log(f"Error generating presigned URL: {e}")

    comment_data = comment.to_dict()
    comment_data["fileURL"] = presigned_url
    comment_data["fileName"] = filename
    
    socketio.emit("new_comment", comment_data, room=f"solution_{comment.solution_id}")
    founder = solution.user
    founder_email = founder.email if founder else None

    msme = solution.challenge.creator if solution.challenge else None
    msme_email = msme.email if msme else None

    admin_users = User.query.filter_by(role="admin").all()
    admin_emails = [u.email for u in admin_users if u.email]

    # admin_users = User.query.filter_by(email="ksravishankar4@gmail.com").first()
    # admin_emails = [admin_users.email] if admin_users and admin_users.email else []
    
    if user.role == "organisation":
        recipients = list(filter(None, {founder_email} | set(admin_emails)))
    elif user.role == "admin":
        recipients = list(filter(None, {founder_email, msme_email}))
    else:  
        recipients = list(filter(None, set(admin_emails + ([msme_email] if msme_email else []))))

    safe_log(f"comment_notification: commenter={user.uid} -> recipients={recipients}")

    def get_display_name(recipient_user, commenter_user):
        if recipient_user and recipient_user.uid == commenter_user.uid:
            return "You"

        if commenter_user.role == "organisation":
            company_name = (
                commenter_user.msme_profile.company_name
                if commenter_user.msme_profile
                else commenter_user.name
            )
            return f"{company_name} (MSME-Staff)"
        if commenter_user.role == "admin":
            return f"Hustloop Triager"

        role_label = commenter_user.role.upper()
        return f"{commenter_user.name} ({role_label})"

    file_section = f"<p><b>Attachment:</b> {filename}</p>" if filename else ""

 
    # submission_url = f"https://hustloop.com/solution/{solution.id}"

    # view_submission_button = f"""
    #     <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="left"
    #         style="margin-top:20px;margin-bottom:20px;">
    #         <tr>
    #             <td style="border-radius:4px;background:#007bff;text-align:center;">
    #                 <a href="{submission_url}" target="_blank" style="
    #                     background:#007bff;
    #                     border:1px solid #007bff;
    #                     font-family:Arial,sans-serif;
    #                     font-size:15px;
    #                     display:block;
    #                     border-radius:4px;
    #                     font-weight:bold;
    #                     padding:10px 20px;
    #                     color:#ffffff;
    #                     text-decoration:none;">
    #                     View Submission Details
    #                 </a>
    #             </td>
    #         </tr>
    #     </table>
    # """

    for email in recipients:
        recipient_user = User.query.filter_by(email=email).first()
        recipient_name = recipient_user.name if recipient_user else "User"
        commenter_display_name = get_display_name(recipient_user, user)

        html_body = f"""
        <html>
            <body style="margin:0;padding:0;background-color:#f8f9fa;font-family:Arial,sans-serif;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                    style="background-color:#1a1f36;">
                    <tr>
                        <td align="center" style="padding:24px;">
                            <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" alt="Hustloop Logo"
                                style="max-width:160px;height:auto;display:block;margin:0 auto 12px auto;">
                            <h2 style="margin:0;font-size:22px;font-weight:600;color:#ffffff;">
                                New Comment on Solution Submission
                            </h2>
                        </td>
                    </tr>
                </table>

                <table role="presentation" align="center" width="100%" cellspacing="0" cellpadding="0" border="0"
                    style="max-width:640px;background-color:#ffffff;margin:32px auto;border-radius:8px;
                        box-shadow:0 2px 8px rgba(0,0,0,0.05);padding:32px;">
                    <tr>
                        <td style="font-size:16px;color:#333333;">
                            <p>Hi {recipient_name},</p>

                            <p>A new comment was posted on the solution for:</p>

                            <p>
                                <b>{solution.challenge.title}</b><br>
                            </p>

                            <p><b>Comment Author:</b> {commenter_display_name}</p>

                            <p style="margin-top:10px;padding:12px;border-left:3px solid #ccc;background-color:#f9f9f9;">
                                <b>Comment:</b><br>
                                {text if text else "Attachment Only"}
                            </p>

                            {file_section}

                            <p style="margin-top:32px;clear:both;display:block;">
                                Best regards,<br>The Hustloop Team
                            </p>
                        </td>
                    </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                    style="background-color:#f1f3f5;">
                    <tr>
                        <td align="center" style="padding:20px;font-size:14px;color:#666;font-family:Arial,sans-serif;">
                            <div style="margin-bottom:8px;">
                                © {datetime.now().year} Hustloop. All rights reserved.
                            </div>
                            <div style="margin-top:10px;">
                                <a href="https://x.com/hustloop" target="_blank" style="text-decoration:none;margin:0 8px;">
                                    <img src="{os.getenv('X_ICON')}" alt="X"
                                        style="width:24px;height:24px;vertical-align:middle;">
                                </a>
                                <a href="https://linkedin.com/company/hustloop" target="_blank" style="text-decoration:none;margin:0 8px;">
                                    <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn"
                                        style="width:24px;height:24px;vertical-align:middle;">
                                </a>
                            </div>
                        </td>
                    </tr>
                </table>
            </body>
        </html>
        """

        send_email(
            recipients=[email],
            subject=f"New Comment on {solution.challenge.title}",
            html_body=html_body,
            sender=("Hustloop", current_app.config["MAIL_USERNAME"])
        )
    return jsonify({
        "message": "Comment added successfully",
        "comment": comment_data
    }), 201


@api_bp.route("/comments/<string:comment_id>", methods=["PUT"])
@token_required
@role_required(["founder", 'organisation', "admin"])
def update_comment(comment_id):
    user = get_current_user()
    
    if not user:
        return error_response("User not found", 404)
    
    if not founder_msme(user):
        return jsonify({
            "error": "Only founders with role 'Solve Organisation's challenge' are Update Comments"
        }), 403
        
    data = request.get_json()
    new_text = data.get("text")

    if not new_text:
        return error_response("Text is required", 400)

    comment = Comment.query.get(comment_id)
    if not comment:
        return error_response("Comment not found", 404)

    if user.role != "admin":
        if comment.author_id != user.uid:
            return error_response("Unauthorized to edit this comment", 403)

        time_limit = timedelta(minutes=5)
        now_ist = datetime.now(IST)

        comment_time = comment.timestamp
        if comment_time.tzinfo is None:
            comment_time = IST.localize(comment_time)

        if now_ist - comment_time > time_limit:
            return error_response("Edit window expired (5 minutes limit)", 403)

    comment.text = new_text
    comment.isUpdated = True
    comment.timestamp = datetime.now(IST)
    db.session.commit()

    comment_data = comment.to_dict()

    socketio.emit("update_comment", comment_data, room=f"solution_{comment.solution_id}")

    return jsonify({"message": "Comment updated", "comment": comment_data}), 200


@api_bp.route("/comments/<string:comment_id>", methods=["DELETE"])
@token_required
@role_required(["founder", 'organisation', "admin"])
def delete_comment(comment_id):
    user = get_current_user()
    comment = Comment.query.get(comment_id)

    if not user:
        return error_response("User not found", 404)
    
    if not founder_msme(user):
        return jsonify({
            "error": "Only founders with role 'Solve Organisation's challenge' are Get Comments"
        }), 403
    
    if not comment:
        return error_response("Comment not found", 404)

    if user.role != "admin":
        if comment.author_id != user.uid:
            return error_response("Unauthorized to delete this comment", 403)

        time_limit = timedelta(minutes=30)
        now_ist = datetime.now(IST)

        comment_time = comment.timestamp
        if comment_time.tzinfo is None:
            comment_time = IST.localize(comment_time)

        if now_ist - comment_time > time_limit:
            return error_response("Delete window expired (30 minutes limit)", 403)

    solution_id = comment.solution_id
    db.session.delete(comment)
    db.session.commit()

    socketio.emit("delete_comment", {"id": comment_id}, room=f"solution_{solution_id}")

    return jsonify({"message": "Comment deleted"}), 200

# @api_bp.route('/connex-registrations', methods=['POST'])
# @limiter.limit("2 per minute")
# def connext_registrations():
#     if not request.is_json:
#         return jsonify({"error": "Request body must be JSON"}), 400

#     data = request.get_json()

#     full_name = data.get('full_name')
#     email_address = data.get('email_address')
#     phone_number = data.get('phone_number')
#     who_you_are = data.get('who_you_are')

#     if not all([full_name, email_address, phone_number]):
#         return jsonify({"error": "All fields are required"}), 400

#     if ConnextRegistration.query.filter_by(email_address=email_address).first():
#         return jsonify({"error": "Email address already registered"}), 409

#     new_registration = ConnextRegistration(
#         full_name=full_name,
#         email_address=email_address,
#         phone_number=phone_number,
#         event="connex",
#         who_you_are=who_you_are
#     )

#     db.session.add(new_registration)
#     db.session.commit()
    
#     safe_log(f"Registration for Connext successful:{email_address}")

#     return jsonify({"message": "Registration successful", "email": email_address}), 201

    
@api_bp.route('/get-connex', methods=['GET'])
@token_required
@role_required(["admin"])
def get_connex():
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    fetch_all = request.args.get('all', 'false').lower() == 'true'

    if fetch_all:
        registrations = ConnextRegistration.query.order_by(ConnextRegistration.created_at.desc()).all()
        output = [
            {
                'id': reg.id,
                'full_name': reg.full_name,
                'email_address': reg.email_address,
                'phone_number': reg.phone_number,
                'event': reg.event,
                'who_you_are': reg.who_you_are,
                'created_at': reg.created_at.isoformat()
            }
            for reg in registrations
        ]
        return jsonify({
            'items': output,
            'total': len(output),
            'page': 1,
            'per_page': len(output),
            'pages': 1,
            'has_next': False,
            'has_prev': False
        })
    
    paginated_registrations = ConnextRegistration.query.order_by(ConnextRegistration.created_at.desc()).paginate(
        page=page,
        per_page=per_page,
        error_out=False
    )

    registrations = paginated_registrations.items
    output = [
        {
            'id': reg.id,
            'full_name': reg.full_name,
            'email_address': reg.email_address,
            'phone_number': reg.phone_number,
            'event': reg.event,
            'who_you_are': reg.who_you_are,
            'created_at': format_datetime(reg.created_at)
        }
        for reg in registrations
    ]

    return jsonify({
        'items': output,
        'total': paginated_registrations.total,
        'page': paginated_registrations.page,
        'per_page': paginated_registrations.per_page,
        'pages': paginated_registrations.pages,
        'has_next': paginated_registrations.has_next,
        'has_prev': paginated_registrations.has_prev
    })
    
def get_challenge_owner_emails(collaboration_id):
    collab = Collaboration.query.filter_by(id=collaboration_id).first()

    if not collab:
        return None, None

    msme_user = User.query.filter_by(uid=collab.user_id).first()
    return msme_user.email if msme_user else None


def get_admin_emails():
    admins = User.query.filter_by(role="admin").all()
    return [a.email for a in admins if a.email]
    # admin_users = User.query.filter_by(email="ksravishankar4@gmail.com").first()
    # return [admin_users.email] if admin_users and admin_users.email else []

def get_display_name(recipient_user, author_user):
    if recipient_user and recipient_user.uid == author_user.uid:
        return "You"

    return author_user.name or author_user.role.capitalize() or "User"

def get_parent_author_email(item):
    if not item.parent_id:
        return None
    
    parent = QAItem.query.filter_by(id=item.parent_id).first()
    if not parent:
        return None

    parent_user = User.query.filter_by(uid=parent.user_id).first()
    return parent_user.email if parent_user else None



def _send_qa_notification_email(author_user, item, collaboration_id, is_reply=False):
    try:
        msme_email = get_challenge_owner_emails(collaboration_id)
        admin_emails = get_admin_emails()
        recipients = []

        # -----------------------------
        # 1. NEW QUESTION
        # -----------------------------
        if not is_reply:
            if author_user.role == "organisation":
                recipients.extend(admin_emails)
            elif author_user.role not in ["admin"]:
                if msme_email:
                    recipients.append(msme_email)
                recipients.extend(admin_emails)

        # -----------------------------
        # 2. REPLY LOGIC
        # -----------------------------
        if is_reply:
            if msme_email:
                recipients.append(msme_email)
            recipients.extend(admin_emails)

            collab = Collaboration.query.filter_by(id=collaboration_id).first()

            # Challenge Owner
            if collab and collab.user_id:
                owner = User.query.filter_by(uid=collab.user_id).first()
                if owner and owner.email:
                    recipients.append(owner.email)

            # -----------------------------
            # Find Root Parent
            # -----------------------------
            current = item
            while current.parent_id:
                current = QAItem.query.filter_by(id=current.parent_id).first()
            root = current

            # Root Question Author
            root_user = User.query.filter_by(uid=root.user_id).first()
            if root_user and root_user.email:
                recipients.append(root_user.email)

            # -----------------------------
            # Collect ALL thread participants (recursive)
            # -----------------------------
            all_items = QAItem.query.filter_by(collaboration_id=collaboration_id).all()

            # Build mapping: parent_id -> children
            tree = {}
            for i in all_items:
                tree.setdefault(i.parent_id, []).append(i)

            # DFS to get full thread
            def collect_thread(node):
                result = [node]
                for child in tree.get(node.id, []):
                    result.extend(collect_thread(child))
                return result

            thread_items = collect_thread(root)

            # Extract user ids
            thread_user_ids = {i.user_id for i in thread_items}

            thread_users = User.query.filter(User.uid.in_(thread_user_ids)).all()
            participant_emails = [u.email for u in thread_users if u.email]

            recipients.extend(participant_emails)

        # -----------------------------
        # Final cleanup
        # -----------------------------
        recipients = list(set([r for r in recipients if r and r != author_user.email]))

        if not recipients:
            safe_log("qa_no_recipients")
            return success_response("no recipients")

        # -----------------------------
        # Build Email
        # -----------------------------
        collab = Collaboration.query.filter_by(id=collaboration_id).first()
        challenge_title = collab.title if collab else "Challenge"

        email_title = "New Reply Posted" if is_reply else "New Question Posted"
        action_text = "A new reply was posted:" if is_reply else "A new question was posted:"

        # Build root + reply blocks (email-safe)
        root_section = ""
        if is_reply:
            root_section = f"""
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
                    <tr>
                        <td style="font-size:16px;color:#333333;font-weight:bold;padding-bottom:6px;">
                            Original Question:
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#f9f9f9;border-left:3px solid #ccc;padding:14px 12px;font-size:15px;line-height:22px;color:#333;word-wrap:break-word;word-break:break-word;overflow-wrap:break-word;">
                            {root.text}
                        </td>
                    </tr>
                </table>
            """

        message_block = f"""
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
                <tr>
                    <td style="font-size:16px;color:#333333;font-weight:bold;padding-bottom:6px;">
                        {'Reply:' if is_reply else 'Message:'}
                    </td>
                </tr>
                <tr>
                    <td style="background-color:#eef2ff;border-left:3px solid #ccc;padding:14px 12px;font-size:15px;line-height:22px;color:#333;word-wrap:break-word;word-break:break-word;overflow-wrap:break-word;">
                        {item.text if item.text else "Attachment Only"}
                    </td>
                </tr>
            </table>
        """

        file_section = ""
        if item.attachment_url:
            file_section = f"""
                <p><b>Attachment:</b><br>
                    <a href="{item.attachment_url}" target="_blank">{item.attachment_name}</a>
                </p>
            """

        for email in recipients:
            recipient_user = User.query.filter_by(email=email).first()
            recipient_name = recipient_user.name if recipient_user else "User"
            display_author = author_user.name or author_user.role.capitalize() or "User"

            html_body = f"""
            <html>
                <body style="margin:0;padding:0;background-color:#f8f9fa;font-family:Arial,sans-serif;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                        style="background-color:#1a1f36;">
                        <tr>
                            <td align="center" style="padding:24px;">
                                <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" alt="Hustloop Logo"
                                    style="max-width:160px;height:auto;display:block;margin:0 auto 12px auto;">
                                <h2 style="margin:0;font-size:22px;font-weight:600;color:#ffffff;">
                                    {email_title}
                                </h2>
                            </td>
                        </tr>
                    </table>

                    <table role="presentation" align="center" width="100%" cellspacing="0" cellpadding="0" border="0"
                        style="max-width:640px;background-color:#ffffff;margin:32px auto;border-radius:8px;
                            box-shadow:0 2px 8px rgba(0,0,0,0.05);padding:32px;">
                        <tr>
                            <td style="font-size:16px;color:#333333;">
                                <p>Hi {recipient_name},</p>
                                <p>{action_text}</p>
                                <h2>{challenge_title}</h2>
                                <p><b>Posted By:</b> {display_author}</p>

                                {root_section}
                                {message_block}
                                {file_section}

                                <p style="margin-top:32px;">
                                    Best regards,<br>The Hustloop Team
                                </p>
                            </td>
                        </tr>
                    </table>
                </body>
            </html>
            """

            send_email(
                recipients=[email],
                subject=f"{email_title} for {challenge_title}",
                html_body=html_body,
                sender=("Hustloop", current_app.config["MAIL_USERNAME"])
            )

        safe_log("qa_mail_sent")
        return success_response("sent")

    except Exception as e:
        safe_log("qa_mail_error")
        return error_response(str(e))




@api_bp.route('/qa', methods=['POST'])
@role_required(['organisation',"admin","founder","incubator","mentor"])
@token_required
def create_qa_item():
    try:
        user = get_current_user()
        if not user:
            safe_log("user_not_found")
            return error_response("User not found", 404)

        user_id = user.uid
        if not user_id:
            safe_log("uid_missing")
            return error_response("User ID is required", 400)

        text = request.form.get('text')
        collaboration_id = request.form.get('collaboration_id')
        if not collaboration_id or collaboration_id.strip() == "":
            safe_log("collab_empty")
            return error_response("Challenge id cannot be empty", 400)

        collab = Collaboration.query.filter_by(id=collaboration_id).first()
        if not collab:
            safe_log("collab_not_found")
            return error_response("Challenge not found", 404)

        if collab.status == CollaborationStatus.stopped:
            safe_log("collab_stopped")
            return error_response("Challenge is stopped. You cannot post questions.", 403)

        application_ended = collab.end_date
        extended_end_date = collab.extended_end_date
        if extended_end_date:
            review_started = extended_end_date
        else:
            review_started = application_ended
        review_ended = review_started + relativedelta(months=1)
        if len(collab.solutions) > 20:
            review_ended = review_ended + timedelta(days=15)
        screening_started = review_ended
        screening_ended = screening_started + relativedelta(months=1)

        now = datetime.now(IST)
        screening_ended = screening_ended.replace(tzinfo=IST)

        if now > screening_ended:
            safe_log("timeline_closed")
            return error_response("Challenge timeline ended. You cannot post questions.", 403)

        parent_id = request.form.get('parent_id')
        is_reply = parent_id is not None

        attachment_name = None
        attachment_url = None
        attachment_type = None

        if 'attachment' in request.files:
            file_obj = request.files['attachment']
            file_name = file_obj.filename
            file_key = f"qa_files/{file_name}"

            s3_client.upload_fileobj(
                file_obj,
                S3_BUCKET_NAME,
                file_key,
                ExtraArgs={
                    "ContentType": file_obj.content_type,
                    "ContentDisposition": f'attachment; filename="{file_obj.filename}"'
                }
            )

            attachment_name = file_obj.filename
            attachment_url = f"https://{S3_BUCKET_NAME}.s3.{os.getenv('AWS_DEFAULT_REGION')}.amazonaws.com/{file_key}"
            content_type = file_obj.content_type.lower()
            if content_type.startswith("image/"):
                attachment_type = "image"
            elif content_type == "application/pdf":
                attachment_type = "pdf"
            else:
                attachment_type = "doc"

        item = QAItem(
            user_id=user_id,
            collaboration_id=collaboration_id,
            parent_id=parent_id,
            text=text,
            attachment_name=attachment_name,
            attachment_url=attachment_url,
            attachment_type=attachment_type
        )

        db.session.add(item)
        db.session.commit()

        _send_qa_notification_email(user, item, collaboration_id, is_reply)

        response_data = item.to_dict()
        response_data["role"] = user.role
        response_data["isOrganizer"] = (user.uid == collab.user_id)
        response_data["replies"] = []

        return jsonify(response_data), 201

    except Exception as e:
        safe_log("qa_error")
        return error_response(str(e), 500)


@api_bp.route('/qa/<collaboration_id>', methods=['GET'])
@role_required(['organisation',"admin","founder","incubator","mentor"])
@token_required
def get_qa_items(collaboration_id):
    user = get_current_user()
    if not user:
        return jsonify("User not found"), 404

    collab = Collaboration.query.filter_by(id=collaboration_id).first()
    if not collab:
        return jsonify("Collaboration not found"), 404

    items = QAItem.query.filter_by(
        collaboration_id=collaboration_id,
        parent_id=None
    ).order_by(QAItem.timestamp.desc()).all()

    data = []

    for item in items:
        d = item.to_dict()

        user_obj = User.query.filter_by(uid=item.user_id).first()
        d["role"] = user_obj.role if user_obj else None

        d["isOrganizer"] = (item.user_id == collab.user_id)

        def sort_and_mark_and_add_roles(replies):
            replies.sort(key=lambda x: x["timestamp"], reverse=True)

            for r in replies:
                r_user = User.query.filter_by(uid=r["user_id"]).first()
                r["role"] = r_user.role if r_user else None

                r["isOrganizer"] = (r["user_id"] == collab.user_id)

                if "replies" in r and isinstance(r["replies"], list):
                    sort_and_mark_and_add_roles(r["replies"])

        if "replies" in d and isinstance(d["replies"], list):
            sort_and_mark_and_add_roles(d["replies"])

        data.append(d)

    return jsonify(data), 200




def minutes_since(timestamp):
    if timestamp.tzinfo is None:
        timestamp_ist = IST.localize(timestamp)
    else:
        timestamp_ist = timestamp.astimezone(IST)
    now_ist = datetime.now(pytz.utc).astimezone(IST)

    diff = now_ist - timestamp_ist
    return diff.total_seconds() / 60

@api_bp.route('/qa/<id>', methods=['DELETE'])
@role_required(['organisation',"admin","founder","incubator","mentor"])
@token_required
def delete_qa_item(id):
    user = get_current_user()
    if not user:
        return jsonify("User not found"),404

    item = QAItem.query.filter_by(id=id).first()
    if not item:
        return jsonify({"error": "Item not found"}), 404
    
    if user.role != "admin":
        if str(item.user_id) != str(user.uid):
            return jsonify({"error": "Not authorized"}), 403
        
        if minutes_since(item.timestamp) > 30:
            return jsonify({"error": "Delete time window expired (30 minutes)."}), 403

    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Deleted successfully"}), 200


@api_bp.route('/qa/<id>', methods=['PUT'])
@role_required(['organisation',"admin","founder","incubator","mentor"])
@token_required
def update_qa_item(id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    item = QAItem.query.filter_by(id=id).first()
    if not item:
        return jsonify({"error": "Item not found"}), 404
    
    if user.role != "admin":
        if str(item.user_id) != str(user.uid):
            return jsonify({"error": "Not authorized"}), 403

        if minutes_since(item.timestamp) > 5:
            return jsonify({"error": "Edit time window expired (5 minutes)."}), 403

    text = request.form.get('text', item.text)
    collaboration_id = request.form.get('collaboration_id', item.collaboration_id)
    parent_id = request.form.get('parent_id', item.parent_id)

    attachment_name = item.attachment_name
    attachment_url = item.attachment_url
    attachment_type = item.attachment_type

    if 'attachment' in request.files:
        file_obj = request.files['attachment']

        file_extension = os.path.splitext(file_obj.filename)[1]
        file_name = file_obj.filename
        file_key = f"qa_files/{file_name}"

        s3_client.upload_fileobj(
            file_obj,
            S3_BUCKET_NAME,
            file_key,
            ExtraArgs={
                "ContentType": file_obj.content_type,
                "ContentDisposition": f'attachment; filename="{file_obj.filename}"'
            }
        )

        attachment_name = file_obj.filename
        attachment_url = (
            f"https://{S3_BUCKET_NAME}.s3.{os.getenv('AWS_DEFAULT_REGION')}.amazonaws.com/{file_key}"
        )

        content_type = file_obj.content_type.lower()
        if content_type.startswith("image/"):
            attachment_type = "image"
        elif content_type == "application/pdf":
            attachment_type = "pdf"
        else:
            attachment_type = "doc"

    item.text = text
    item.collaboration_id = collaboration_id
    item.parent_id = parent_id
    item.attachment_name = attachment_name
    item.attachment_url = attachment_url
    item.attachment_type = attachment_type

    db.session.commit()

    return jsonify(item.to_dict()), 200


@api_bp.route("/hall-of-fame/<string:collab_id>", methods=["GET"])
@token_required
@role_required(['organisation',"admin","founder","incubator","mentor"])
def hall_of_fame(collab_id):  
    user = get_current_user()
    if not user:
        return error_response("User not found", 404)

    query = Solution.query.filter(
        Solution.challenge_id == collab_id
    ).order_by(Solution.points.desc())

    results = []
    for solution in query.all():
        results.append({
            "contactName": solution.contact_name,
            "points": solution.points,
            "state": solution.state,
            "status": solution.status if solution.status == "winner" else None,
            "rewards":solution.reward_amount if solution.reward_amount else None
        })

    return jsonify({"hallOfFame": results}), 200



@api_bp.route("/collaborations/<string:collab_id>/timeline", methods=["GET"])
@token_required
@role_required(["founder", 'organisation', "admin", "incubator", "mentor"])
def get_collaboration_timeline(collab_id):
    try:
        user = get_current_user()
        if not user:
            safe_log("user_not_found")
            return error_response("User not found", 404)

        collab = Collaboration.query.get(collab_id)
        if not collab:
            safe_log("collab_not_found")
            return error_response("Collaboration not found", 404)

        import pytz
        IST = pytz.timezone("Asia/Kolkata")

        def to_ist(dt):
            if not dt:
                return None
            if dt.tzinfo is None:
                return IST.localize(dt)
            return dt.astimezone(IST)

        # --------------------------------------------
        # TIMELINE CALCULATION (NEXT DAY START)
        # --------------------------------------------

        application_started = collab.start_date
        application_ended = collab.end_date

        extended_end_date = collab.extended_end_date

        # review starts next day of whichever ends last
        if extended_end_date:
            review_started = extended_end_date + timedelta(days=1)
        else:
            review_started = application_ended + timedelta(days=1)

        review_ended = review_started + relativedelta(months=1)

        if len(collab.solutions) > 20:
            review_ended = review_ended + timedelta(days=15)

        screening_started = review_ended + timedelta(days=1)
        screening_ended = screening_started + relativedelta(months=1)

        pitching_started = screening_ended + timedelta(days=1)
        pitching_ended = pitching_started + relativedelta(months=1)

        now = datetime.now(IST)

        # Convert to IST
        application_started = to_ist(application_started)
        application_ended = to_ist(application_ended)
        review_started = to_ist(review_started)
        review_ended = to_ist(review_ended)
        screening_started = to_ist(screening_started)
        screening_ended = to_ist(screening_ended)
        pitching_started = to_ist(pitching_started)
        pitching_ended = to_ist(pitching_ended)

        if extended_end_date:
            extended_end_date = to_ist(extended_end_date)

        is_closed = collab.status in [CollaborationStatus.stopped] or now > pitching_ended

        # --------------------------------------------
        # RESPONSE
        # --------------------------------------------
        return success_response({
            "title": collab.title,
            "solutionCount": len(collab.solutions),
            "status": collab.status.value if hasattr(collab.status, "value") else collab.status,
            "timeline": {
                "application_started": application_started.isoformat(),
                "application_ended": application_ended.isoformat(),
                "extended_end_date": extended_end_date.isoformat() if extended_end_date else None,
                "review_started": review_started.isoformat(),
                "review_ended": review_ended.isoformat(),
                "screening_started": screening_started.isoformat(),
                "screening_ended": screening_ended.isoformat(),
                "pitching_started": pitching_started.isoformat(),
                "pitching_ended": pitching_ended.isoformat(),
                "challengeClose": is_closed
            }
        })

    except Exception as e:
        safe_log("timeline_error")
        return error_response(str(e), 500)



@api_bp.route("/announcements/<string:collab_id>", methods=["POST"])
@token_required
@role_required(['organisation',"admin"])
@limiter.limit("2 per minute")
def create_announcement(collab_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    collab = Collaboration.query.get(collab_id)
    
    if collab.user_id != user.uid and user.role != "admin":
        return jsonify({"error": "Unauthorized"}), 401

    isOwner = collab.user_id == user.uid
    isAdmin = user.role == "admin"
    
    if not collab:
        return jsonify({"error": "Collaboration not found"}), 404

    title = request.form.get("title")
    message = request.form.get("message")
    announcement_type = request.form.get("type")

    if announcement_type not in ["general", "update", "alert", "deadline", "result"]:
        return jsonify({"error": "Invalid announcement type"}), 400

    if not title or not message:
        return jsonify({"error": "Missing required fields"}), 400

    S3_FOLDER = "announcements"
    files = request.files.getlist("attachments")

    if not title or not message:
        return jsonify({"error": "Missing required fields"}), 400

    if len(title) > 300:
        return jsonify({"error": "Title must not exceed 300 characters"}), 400

    if len(message) > 300:
        return jsonify({"error": "Message must not exceed 300 characters"}), 400

    if len(files) > 1:
        return jsonify({"error": "Maximum 1 attachments allowed"}), 400

    file_urls = []

    for file in files:
        ext = file.filename.split(".")[-1]
        safe_name = secure_filename(file.filename)
        unique_name = f"{uuid.uuid4()}_{safe_name}"
        s3_key = f"{S3_FOLDER}/{unique_name}"

        try:
            s3_client.upload_fileobj(
                file,
                S3_BUCKET_NAME,
                s3_key,
                ExtraArgs={
                    "ContentType": file.content_type,
                    "ContentDisposition": f'attachment; filename="{file.filename}"'
                }
            )
        except Exception as e:
            safe_log("S3 upload failed", e)
            return jsonify({
                "error": "File upload failed. Please try again later."
            }), 500

        file_url = (
            f"https://{S3_BUCKET_NAME}.s3."
            f"{os.getenv('AWS_DEFAULT_REGION')}.amazonaws.com/{s3_key}"
        )
        file_urls.append(file_url)

    if isOwner:
        companyName = MSMEProfile.query.filter_by(user_id=user.uid).first().company_name
        created_by = companyName + " " + "Staff"
    else:
        created_by = "Admin"

    announcement = Announcement(
        collaboration_id=collab_id,
        title=title,
        message=message,
        type=announcement_type,
        created_by=created_by,
        attachments=json.dumps(file_urls),
        user_id=user.uid
    )

    db.session.add(announcement)
    db.session.commit()
    try:
        submitters = User.query.join(Solution, Solution.user_id == User.uid)\
                    .filter(Solution.challenge_id == collab_id).all()
        safe_log("submitters_fetched")
        current_year = datetime.utcnow().year
        attachment_button = ""
        if file_urls:
            url = file_urls[0]
            attachment_button = f"""
                <div style='margin-bottom:14px;'>
                    <div style="font-size:16px;font-weight:600;color:#222;margin-bottom:4px;">Attachment</div>
                    <a href="{url}" 
                    style="display:inline-block;padding:10px 16px;background:#4a90e2;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;">
                    View Attachment
                    </a>
                </div>
            """
        # Send email to submitters
        for user in submitters:
            html_body = f"""
            <div style='font-family:Arial,sans-serif;padding:20px;background:#f9f9f9;'>
                <div style='text-align:center;margin-bottom:20px;'>
                    <img src={os.getenv('EMAIL_HEADER_IMAGE')} alt='Hustloop Logo' style='width:150px;'>
                </div>
                <div style='background:#ffffff;padding:20px;border-radius:8px;'>
                    <h2 style='color:#333;'>Hello {user.name},</h2>
                    <p style='font-size:15px;color:#555;'>Title: {title}</p>
                    <p style='font-size:15px;color:#555;'>Message: {message}</p>
                    <p style='font-size:15px;color:#555;'>
                            This message is from the Challenge:
                    </p>
                    <p style='font-size:18px;color:#4a90e2;font-weight:700;margin-top:-8px;margin-bottom:14px;'>
                            {collab.title}
                    </p>
                    {attachment_button}
                    <p style='font-size:15px;color:#555;'>Thank you for using Hustloop.</p>
                </div>
                <p style='text-align:center;color:#888;font-size:12px;margin-top:10px;'>© {current_year} Hustloop.All rights reserved.</p>
                <div style='text-align:center;margin-top:25px;'>
                    <a href='https://x.com/hustloop' style='margin:0 10px;text-decoration:none;'>
                        <img src="{os.getenv('X_ICON')}" alt="X"
                                    style="width:24px; height:24px; vertical-align:middle; display:inline-block;">
                    </a>
                    <a href="https://www.linkedin.com/company/hustloop" style='margin:0 10px;text-decoration:none;'>
                            <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" 
                                alt="LinkedIn" width="24" height="24" style="vertical-align:middle; margin-right:6px;" />
                    </a>
                </div>
            </div>
            """
            send_email(
                subject="New Announcement",
                recipients=[user.email],
                html_body=html_body,
                sender=("Hustloop", current_app.config['MAIL_USERNAME'])
            )
        
        if isAdmin:
            collab_owner = User.query.get(collab.user_id)
            if collab_owner and collab_owner.email:
                owner_html_body = f"""
                <div style='font-family:Arial,sans-serif;padding:20px;background:#f9f9f9;'>
                    <div style='text-align:center;margin-bottom:20px;'>
                        <img src={os.getenv('EMAIL_HEADER_IMAGE')} alt='Hustloop Logo' style='width:150px;'>
                    </div>
                    <div style='background:#ffffff;padding:20px;border-radius:8px;'>
                        <h2 style='color:#333;'>Hello {collab_owner.name},</h2>
                        <p style='font-size:15px;color:#555;'>
                            An admin has posted a new announcement on your challenge:
                        </p>
                        <p style='font-size:18px;color:#4a90e2;font-weight:700;margin-top:-8px;margin-bottom:14px;'>
                            {collab.title}
                        </p>
                        <div style='background:#f8f9fa;padding:15px;border-radius:6px;margin-bottom:14px;'>
                            <p style='font-size:16px;color:#222;font-weight:600;margin:0 0 8px 0;'>Title: {title}</p>
                            <p style='font-size:15px;color:#555;margin:0;'>Message: {message}</p>
                        </div>
                        {attachment_button}
                        <p style='font-size:15px;color:#555;'>This announcement has been sent to all submitters of your challenge.</p>
                        <p style='font-size:15px;color:#555;'>Thank you for using Hustloop.</p>
                    </div>
                    <p style='text-align:center;color:#888;font-size:12px;margin-top:10px;'>© {current_year} Hustloop.All rights reserved.</p>
                    <div style='text-align:center;margin-top:25px;'>
                        <a href='https://x.com/hustloop' style='margin:0 10px;text-decoration:none;'>
                            <img src="{os.getenv('X_ICON')}" alt="X"
                                        style="width:24px; height:24px; vertical-align:middle; display:inline-block;">
                        </a>
                        <a href="https://www.linkedin.com/company/hustloop" style='margin:0 10px;text-decoration:none;'>
                                <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" 
                                    alt="LinkedIn" width="24" height="24" style="vertical-align:middle; margin-right:6px;" />
                        </a>
                    </div>
                </div>
                """
                send_email(
                    subject=f"Admin Announcement on Your Challenge: {collab.title}",
                    recipients=[collab_owner.email],
                    html_body=owner_html_body,
                    sender=("Hustloop", current_app.config['MAIL_USERNAME'])
                )
                safe_log(f"collab_owner_announcement_notification_sent owner={collab_owner.email}")

        admin_users = User.query.filter_by(role="admin").all()
        admin_emails = [admin.email for admin in admin_users if admin.email]
        
        if admin_emails:
            msme_user = User.query.get(collab.user_id)
            msme_name = msme_user.name if msme_user else "Unknown"
            
            admin_html_body = f"""
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f9f9f9; padding:20px 0;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border-radius:6px; overflow:hidden;">
                            <tr>
                                <td align="center" style="background-color:#1a1f36; padding:24px;">
                                    <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" alt="Hustloop Logo"
                                        style="max-width:160px; margin-bottom:12px; display:block;">
                                    <h2 style="margin:0; font-size:22px; font-weight:600; color:#ffffff;">
                                        New Announcement Posted
                                    </h2>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:24px; font-family:Arial, sans-serif; color:#333333; font-size:16px; line-height:1.6;">
                                    <p style="margin-top:0;">An announcement has been posted for the challenge:</p>
                                    <p style="font-size:18px; color:#4a90e2; font-weight:700; margin:8px 0 16px 0;">
                                        <span style="font-weight:700;">Challenge Title : </span>{collab.title}
                                    </p>
                                    
                                    <table width="100%" cellpadding="15" cellspacing="0" border="0" style="background:#f8f9fa; border-radius:6px; margin-bottom:16px;">
                                        <tr>
                                            <td>
                                                <p style="font-size:15px; color:#555; margin:0 0 8px 0;"><strong>Posted by:</strong> {msme_name}</p>
                                                <p style="font-size:15px; color:#555; margin:0 0 8px 0;"><strong>Title:</strong> {title}</p>
                                                <p style="font-size:15px; color:#555; margin:0 0 8px 0;"><strong>Type:</strong> {announcement_type.capitalize()}</p>
                                                <p style="font-size:15px; color:#555; margin:0;"><strong>Message:</strong> {message}</p>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    {attachment_button}
                                    
                                    <p style="font-size:15px; color:#555;">This announcement has been sent to all submitters of this challenge.</p>
                                </td>
                            </tr>
                            <tr>
                                <td align="center" style="background-color:#f1f3f5; padding:20px; font-size:14px; color:#666; font-family:Arial, sans-serif;">
                                    <div style="margin-bottom:10px;">
                                        © {current_year} Hustloop. All rights reserved.
                                    </div>
                                    
                                    <table cellpadding="0" cellspacing="0" border="0" align="center">
                                        <tr>
                                            <td style="padding:0 8px;">
                                                <a href="https://x.com/hustloop" target="_blank" style="text-decoration:none;">
                                                    <img src="{os.getenv('X_ICON')}" alt="X"
                                                        style="width:24px; height:24px; display:block;">
                                                </a>
                                            </td>
                                            <td style="padding:0 8px;">
                                                <a href="https://linkedin.com/company/hustloop" target="_blank" style="text-decoration:none;">
                                                    <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn"
                                                        style="width:24px; height:24px; display:block;">
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
            """
            send_email(
                subject=f"New Announcement: {collab.title}",
                recipients=admin_emails,
                html_body=admin_html_body,
                sender=("Hustloop", current_app.config['MAIL_USERNAME'])
            )
            safe_log(f"admin_announcement_notification_sent admins={admin_emails}")
            
    except Exception as e:
        safe_log(f"email_error:{e}")

    return jsonify({
        "success": True,
        "announcement": announcement.to_dict()
    }), 201
    
@api_bp.route("/announcements/<string:collab_id>", methods=["GET"])
@token_required
@role_required(['organisation',"admin","founder","incubator","mentor"])
def get_announcements(collab_id):

    collab = Collaboration.query.get(collab_id)
    if not collab:
        return jsonify({"error": "Collaboration not found"}), 404

    announcements = Announcement.query.filter_by(
        collaboration_id=collab_id
    ).order_by(Announcement.created_at.desc()).all()

    return jsonify({
        "announcements": [a.to_dict() for a in announcements]
    }), 200


@api_bp.route("/announcements/<string:id>", methods=["DELETE"])
@token_required
@role_required(['organisation', "admin"])
def delete_announcement(id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    announcement = Announcement.query.get(id)
    collab = Collaboration.query.get(announcement.collaboration_id)

    if not announcement:
        return jsonify({"error": "Announcement not found"}), 404

    if user.role == "organisation" and announcement.user_id != user.uid:
        return jsonify({"error": "You are not authorized to delete this announcement"}), 403
    
    db.session.delete(announcement)
    db.session.commit()

    return jsonify({"message": "Announcement deleted successfully"}), 200


@api_bp.route("/announcements/<string:id>", methods=["PUT"])
@token_required
@role_required(['organisation', "admin"])
def update_announcement(id):
    """Update announcement text fields (title, message, type) only"""
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    announcement = Announcement.query.get(id)
    collab = Collaboration.query.get(announcement.collaboration_id)
    if not announcement:
        return jsonify({"error": "Announcement not found"}), 404

    if user.role == "organisation" and announcement.user_id != user.uid:
        return jsonify({"error": "You are not authorized to update this announcement"}), 403

    # Get text fields from request
    title = request.form.get("title")
    message = request.form.get("message")
    announcement_type = request.form.get("type")

    # Validate required fields
    if not title or not message:
        return jsonify({"error": "Title and message are required"}), 400

    # Validate announcement type
    if announcement_type and announcement_type not in ["general", "update", "alert", "deadline", "result"]:
        return jsonify({"error": "Invalid announcement type"}), 400

    # Validate character limits
    if len(title) > 300:
        return jsonify({"error": "Title must not exceed 300 characters"}), 400

    if len(message) > 300:
        return jsonify({"error": "Message must not exceed 300 characters"}), 400

    if user.role == "organisation" and announcement.user_id != user.uid:
        return jsonify({"error": "You are not authorized to update this announcement"}), 403

    # Update fields
    announcement.title = title
    announcement.message = message
    if announcement_type:
        announcement.type = announcement_type

    db.session.commit()

    return jsonify({
        "success": True,
        "announcement": announcement.to_dict()
    }), 200

# --- PITCHING FORM ROUTES ---

@api_bp.route('/pitching/submit', methods=['POST'])
def submit_pitching_form():
    try:
        data = request.get_json()
        token = data.get('token')
        pitch_date = data.get('pitch_date')
        pitch_time = data.get('pitch_time')
        requirements = data.get('requirements')

        if not token or not pitch_date or not pitch_time:
            return error_response("Missing required fields", 400)

        pitch_token = PitchingToken.query.filter_by(token=token).first()

        if not pitch_token:
            return error_response("Invalid token", 401)

        if datetime.utcnow() > pitch_token.expires_at:
            return error_response("Token expired", 401)

        user_id = pitch_token.user_id
        solution_id = pitch_token.solution_id

        solution = Solution.query.filter_by(id=solution_id).first()

        if not solution:
            return error_response("Solution not found", 404)

        if solution.user_id != user_id:
            return error_response("Unauthorized", 401)

        existing_pitch = PitchingDetails.query.filter_by(solution_id=solution_id).first()
        profile = MSMEProfile.query.filter_by(user_id=solution.challenge.user_id).first()
        if existing_pitch and existing_pitch.submitted:
            return error_response("Pitching form already submitted", 400)

        if existing_pitch:
            existing_pitch.pitch_date = pitch_date
            existing_pitch.pitch_time = pitch_time
            existing_pitch.requirements = requirements
            existing_pitch.submitted = True
        else:
            new_pitch = PitchingDetails(
                user_id=user_id,
                solution_id=solution_id,
                pitch_date=pitch_date,
                pitch_time=pitch_time,
                requirements=requirements,
                submitted=True
            )
            db.session.add(new_pitch)

        pitch_token.used = True

        db.session.commit()

        user = User.query.filter_by(uid=user_id).first()
        admin_users = User.query.filter_by(role="admin").all()
        admin_emails = [a.email for a in admin_users if a.email]
        formatted_date = datetime.strptime(pitch_date, "%Y-%m-%d").strftime("%B %d, %Y")
        formatted_time = datetime.strptime(pitch_time, "%H:%M").strftime("%I:%M %p")
        if user:
            html_body = f"""
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f9fa; padding:20px 0;">
                    <tr>
                        <td align="center">

                            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border-radius:6px; overflow:hidden;">
                                <tr>
                                    <td align="center" style="background-color:#1a1f36; padding:24px;">
                                        <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" alt="Hustloop Logo"
                                            style="max-width:160px; margin-bottom:12px; display:block;">
                                        <h2 style="margin:0; font-size:22px; font-weight:600; color:#ffffff;">
                                            Pitching Form Submitted
                                        </h2>
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:24px; font-family:Arial, sans-serif; color:#333333; font-size:16px; line-height:1.6;">
                                        <p style="margin-top:0;">Dear {user.name},</p>

                                        <p>We have received your pitching preferences.</p>

                                        <p><strong>Date:</strong> {formatted_date}</p>
                                        <p><strong>Time:</strong> {formatted_time}</p>

                                        <p>We will contact you shortly to confirm the slot.</p>

                                        <p>Regards,<br><strong>Hustloop Team</strong></p>
                                    </td>
                                </tr>

                                <tr>
                                    <td align="center" style="background-color:#f1f3f5; padding:20px; font-size:14px; color:#666; font-family:Arial, sans-serif;">
                                        <div style="margin-bottom:10px;">
                                            © {datetime.now().year} Hustloop. All rights reserved.
                                        </div>

                                        <table cellpadding="0" cellspacing="0" border="0" align="center">
                                            <tr>
                                                <td style="padding:0 8px;">
                                                    <a href="https://x.com/hustloop" target="_blank" style="text-decoration:none;">
                                                        <img src="{os.getenv('X_ICON')}" alt="X"
                                                            style="width:24px; height:24px; display:block;">
                                                    </a>
                                                </td>

                                                <td style="padding:0 8px;">
                                                    <a href="https://linkedin.com/company/hustloop" target="_blank" style="text-decoration:none;">
                                                        <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn"
                                                            style="width:24px; height:24px; display:block;">
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
                """

            send_email(
                subject="Pitching Form Received",
                recipients=[user.email],
                html_body=html_body,
                sender=("Hustloop", current_app.config['MAIL_USERNAME'])
            )
            if admin_emails:
                admin_html = f"""
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f9fa; padding:20px 0;">
                        <tr>
                            <td align="center">
                                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border-radius:6px; overflow:hidden;">
                                    <tr>
                                        <td align="center" style="background-color:#1a1f36; padding:24px;">
                                            <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" alt="Hustloop Logo"
                                                style="max-width:160px; margin-bottom:12px; display:block;">
                                            <h2 style="margin:0; font-size:22px; font-weight:600; color:#ffffff;">
                                                New Pitching Form Submitted
                                            </h2>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:24px; font-family:Arial, sans-serif; color:#333333; font-size:16px; line-height:1.6;">
                                            <p style="margin-top:0;"><strong>Submitter:</strong> {user.name} &lt;{user.email}&gt;</p>
                                            <p><strong>Date:</strong> {formatted_date}</p>
                                            <p><strong>Time:</strong> {formatted_time}</p>
                                            <p>Solution Title : <strong> {solution.challenge.title if solution else 'N/A'} By {profile.company_name}</strong></p>
                                            <p>Please review and confirm the slot.</p>
                                            <p>Regards,<br><strong>Hustloop System</strong></p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="background-color:#f1f3f5; padding:20px; font-size:14px; color:#666; font-family:Arial, sans-serif;">
                                            <div style="margin-bottom:10px;">
                                                © {datetime.now().year} Hustloop. All rights reserved.
                                            </div>
                                            <table cellpadding="0" cellspacing="0" border="0" align="center">
                                                <tr>
                                                    <td style="padding:0 8px;">
                                                        <a href="https://x.com/hustloop" target="_blank" style="text-decoration:none;">
                                                            <img src="{os.getenv('X_ICON')}" alt="X"
                                                                style="width:24px; height:24px; display:block;">
                                                        </a>
                                                    </td>
                                                    <td style="padding:0 8px;">
                                                        <a href="https://linkedin.com/company/hustloop" target="_blank" style="text-decoration:none;">
                                                            <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn"
                                                                style="width:24px; height:24px; display:block;">
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                    """
        send_email(
            subject=f"Pitching Form Submitted - {user.name} for {solution.challenge.title} By {profile.company_name}",
            recipients=admin_emails,
            html_body=admin_html,
            sender=("Hustloop", current_app.config['MAIL_USERNAME'])
        )
        safe_log(f"pitching_form_notification_sent user={user.email} admins={admin_emails}")
        return success_response("Pitching details submitted successfully")
    except Exception as e:
        safe_log(f"pitching_submit_error: {e}")
        return error_response("Failed to submit pitching details", 500)

@api_bp.route("/pitching/validate", methods=["GET"])
@token_required
@role_required(["founder"])
def validate_pitch_token():
    token = request.args.get("token")

    if not token:
        return error_response("Token missing", 400)

    pitch_token = PitchingToken.query.filter_by(token=token).first()

    # Token must be flagged as used regardless of error or success
    def finish_with(response):
        try:
            if pitch_token:
                pitch_token.used = True
                db.session.commit()
        except:
            db.session.rollback()
        return response

    if not pitch_token:
        return finish_with(error_response("Invalid token", 400))

    if pitch_token.expires_at < datetime.utcnow():
        return finish_with(jsonify({"error": "Token expired", "solution_id": pitch_token.solution_id})), 400

    if pitch_token.used:
        return finish_with(jsonify({"error": "Token already used", "solution_id": pitch_token.solution_id})), 400

    user = get_current_user()

    if not user:
        return finish_with(error_response("User not found", 404))

    if not founder_msme(user):
        return finish_with(jsonify({
            "error": "Only founders with role 'Solve Organisation's challenge' are Get Solution"
        }), 403)

    solution = Solution.query.filter_by(id=pitch_token.solution_id).first()

    if not solution:
        return finish_with(error_response("Solution not found", 404))

    if user.uid != solution.user_id:
        return finish_with(error_response("Unauthorized", 401))

    challenge = solution.challenge

    if not challenge:
        return finish_with(error_response("Challenge not found", 404))

    if challenge.status == "stopped":
        return finish_with(error_response("Challenge is stopped", 400))

    profile = MSMEProfile.query.filter_by(user_id=challenge.user_id).first()
    if not profile:
        return finish_with(error_response("Profile not found", 404))

    return finish_with(success_response({
        "solution_id": pitch_token.solution_id,
        "user_id": pitch_token.user_id,
        "solution_title": challenge.title,
        "company_name": profile.company_name
    }))



@api_bp.route('/pitching/resend/<string:solution_id>', methods=['POST'])
@token_required
def resend_pitching_link(solution_id):
    try:
        user = get_current_user()
        if not user:
            return error_response("User not found", 404)

        solution = Solution.query.get(solution_id)
        if not solution:
            return error_response("Solution not found", 404)

        if solution.user_id != user.uid:
            return error_response("Unauthorized", 403)

        existing_pitch = PitchingDetails.query.filter_by(solution_id=solution_id).first()
        if existing_pitch and existing_pitch.submitted:
            return error_response("Pitching form already submitted", 400)

        # ❗ NEW TOKEN (no JWT)
        token = uuid.uuid4().hex
        expires_at = datetime.utcnow() + timedelta(hours=24)

        # ❗ Invalidate old tokens
        PitchingToken.query.filter_by(solution_id=solution_id).delete()

        new_token = PitchingToken(
            id=str(uuid.uuid4()),
            solution_id=solution.id,
            user_id=user.uid,
            token=token,
            expires_at=expires_at
        )

        db.session.add(new_token)
        db.session.commit()

        pitch_form_link = f"{current_app.config['FRONTEND_URL']}/pitching-form?token={token}"

        html_body = f"""
        <html>
        <body style="margin:0; padding:0; background-color:#f8f9fa; font-family: Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f8f9fa">
            <tr>
                <td align="center">

                    <table width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="#1a1f36" style="border-radius:4px 4px 0 0;">
                        <tr>
                            <td align="center" style="padding:24px;">
                                <img src="{os.getenv('EMAIL_HEADER_IMAGE')}" alt="Hustloop Logo"
                                    style="max-width:160px; margin-bottom:12px;">
                                <h2 style="margin:0; font-size:22px; font-weight:600; color:#ffffff;">
                                    Pitching Form Link
                                </h2>
                            </td>
                        </tr>
                    </table>

                    <table width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff">
                        <tr>
                            <td style="padding:24px; font-size:16px; color:#333;">
                                <p>Dear {user.name},</p>
                                <p>Here is your new link to submit the pitching form for <strong>{solution.challenge.title}</strong>.</p>
                                <p>This link is valid for 24 hours.</p>

                                <table align="center" cellspacing="0" cellpadding="0" border="0" style="margin:30px auto;">
                                    <tr>
                                        <td bgcolor="#1a1f36" style="border-radius:6px;">
                                            <a href="{pitch_form_link}" target="_blank"
                                            style="display:inline-block; padding:12px 22px; color:#ffffff;
                                            text-decoration:none; font-weight:600; font-size:16px; border-radius:6px;">
                                            Fill Pitching Form
                                            </a>
                                        </td>
                                    </tr>
                                </table>

                                <p>Regards,<br><strong>Hustloop</strong></p>
                            </td>
                        </tr>
                    </table>

                    <table width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="#f1f3f5" style="border-radius:0 0 4px 4px; margin-top:10px;">
                        <tr>
                            <td align="center" style="padding:20px; font-size:14px; color:#666;">
                                © {datetime.now().year} Hustloop. All rights reserved.
                            </td>
                        </tr>
                        <tr>
                            <td align="center" style="padding-bottom:20px;">
                                <a href="https://x.com/hustloop" target="_blank" style="margin:0 8px;">
                                    <img src="{os.getenv('X_ICON')}" alt="X" style="width:24px; height:24px;">
                                </a>
                                <a href="https://linkedin.com/company/hustloop" target="_blank" style="margin:0 8px;">
                                    <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png"
                                        alt="LinkedIn" style="width:24px; height:24px;">
                                </a>
                            </td>
                        </tr>
                    </table>

                </td>
            </tr>
        </table>
        </body>
        </html>
        """

        send_email(
            subject="Pitching Form Link",
            recipients=[user.email],
            html_body=html_body,
            sender=("Hustloop", current_app.config['MAIL_USERNAME'])
        )

        return success_response("New pitching link sent to your email")

    except Exception as e:
        safe_log(f"pitching_resend_error: {e}")
        return error_response("Failed to resend pitching link", 500)


@api_bp.route('/pitching/details', methods=['GET'])
@token_required
@role_required(['admin'])
def get_all_pitching_details():
    try:
        user = get_current_user()
        if not user:
            return error_response("User not found", 404)

        pitches = PitchingDetails.query.order_by(PitchingDetails.created_at.desc()).all()

        results = []
        for p in pitches:
            solution = Solution.query.filter_by(id=p.solution_id).first()
            challenge = solution.challenge if solution else None
            profile = MSMEProfile.query.filter_by(user_id=challenge.user_id).first() if challenge else None
            founder = solution.user if solution else None
            
            # Format: 29th December 2025, 1:20 PM
            created_at_str = ""
            if p.created_at:
                # Add suffix to day
                day = p.created_at.day
                if 4 <= day <= 20 or 24 <= day <= 30:
                    suffix = "th"
                else:
                    suffix = ["st", "nd", "rd"][day % 10 - 1]
                
                date_part = p.created_at.strftime(f"%d{suffix} %B %Y")
                time_part = p.created_at.strftime("%I:%M %p")
                created_at_str = f"{date_part}, {time_part}"

            results.append({
                "id": p.id,
                "user_id": p.user_id,
                "solution_id": p.solution_id,
                "solution_title": challenge.title if challenge else "N/A",
                "company_name": profile.company_name if profile else "N/A",
                "pitch_date": p.pitch_date,
                "pitch_time": p.pitch_time,
                "requirements": p.requirements,
                "submitted": p.submitted,
                "founder_name": founder.name if founder else "N/A",
                "created_at": created_at_str
            })

        return success_response(results)
    except Exception as e:
        safe_log(f"get_all_pitching_details_error: {e}")
        return error_response("Failed to fetch pitching details", 500)


@api_bp.route('/pitching/delete/<string:pitch_id>', methods=['DELETE'])
@token_required
@role_required(['admin'])
def delete_pitching_detail(pitch_id):
    try:
        pitch = PitchingDetails.query.get(pitch_id)
        if not pitch:
            return error_response("Pitching detail not found", 404)
        
        db.session.delete(pitch)
        db.session.commit()
        
        return success_response("Pitching detail deleted successfully")
    except Exception as e:
        db.session.rollback()
        safe_log(f"delete_pitching_detail_error: {e}")
        return error_response("Failed to delete pitching detail", 500)


# Admin: Get detailed user information
@api_bp.route('/admin/user/<string:user_id>', methods=['GET'])
@token_required
@role_required(['admin'])
def get_user_details(user_id):
    """
    Admin-only endpoint to fetch detailed information about a specific user.
    Returns comprehensive user data including account details, payment info, and activity stats.
    """
    try:
        # Fetch the user
        user = User.query.filter_by(uid=user_id).first()
        
        if not user:
            return error_response("User not found", 404)
        
        # Get submission counts
        submission_count = Collaboration.query.filter_by(user_id=user.uid).count()
        solution_count = Solution.query.filter_by(user_id=user.uid).count()
        
        # Get MSME profile if exists
        msme_profile = None
        if user.role == 'organisation':
            from app.models import MSMEProfile
            profile = MSMEProfile.query.filter_by(user_id=user.uid).first()
            if profile:
                msme_profile = {
                    'company_name': profile.company_name,
                    'affiliated_by': profile.affiliated_by,
                    'description': profile.description,
                    'website_url': profile.website_url,
                    'linkedin_url': profile.linkedin_url,
                    'x_url': profile.x_url,
                    'instagram_url': profile.instagram_url,
                    'phone_number': profile.phone_number,
                    'logo_url': profile.logo_url,
                    'is_submitted': profile.is_submitted,
                    'is_editable': profile.is_editable,
                    'created_at': profile.created_at.isoformat() if profile.created_at else None,
                }

        # Get all payment methods for the user
        payment_methods = UserPaymentMethod.query.filter_by(user_id=user.uid).all()
        payment_info = [pm.to_dict() for pm in payment_methods] if payment_methods else []

        user_details = {
            'uid': user.uid,
            'name': user.name,
            'email': user.email,
            'role': user.role,
            'status': user.status,
            'auth_provider': user.auth_provider,
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'founder_role': user.founder_role,
            'payment_methods': payment_info,  
            'msme_profile': msme_profile,
            'activity': {
                'submission_count': submission_count,
                'solution_count': solution_count,
            }
        }
        
        return success_response("User details fetched successfully", user_details=user_details)
        
    except Exception as e:
        safe_log(f"get_user_details_error: {e}")
        return error_response("Failed to fetch user details", 500)

@api_bp.route('/admin/msme-profile/<string:user_id>/toggle-editable', methods=['PUT'])
@token_required
@role_required(['admin'])
def toggle_msme_editable(user_id):
    """
    Admin-only endpoint to toggle is_editable for organisation profile.
    Only works for users with role = 'organisation'.
    """
    try:
        safe_log(f"toggle_msme_editable called for user_id: {user_id}")
        
        # Fetch the user
        user = User.query.filter_by(uid=user_id).first()

        if not user:
            safe_log(f"User not found: {user_id}")
            return error_response("User not found", 404)
        
        safe_log(f"User found: {user.email}, role: {user.role}")
        
        # Validate user role is MSME
        if user.role != 'organisation':
            safe_log(f"User is not organisation, role is: {user.role}")
            return error_response("User is not an organisation user. Only organisation users can have editable profiles.", 400)
        
        # Get the new value from request
        data = request.get_json()
        safe_log(f"Request data: {data}")
        is_editable = data.get('is_editable')
        
        if is_editable is None:
            safe_log("is_editable field is missing from request")
            return error_response("is_editable field is required", 400)
        
        if not isinstance(is_editable, bool):
            safe_log(f"is_editable is not boolean, type: {type(is_editable)}")
            return error_response("is_editable must be a boolean value", 400)
        
        # Fetch MSME profile
        msme_profile = MSMEProfile.query.filter_by(user_id=user_id).first()
        
        if not msme_profile:
            return error_response("organisation profile not found for this user", 404)
        
        # Update is_editable
        msme_profile.is_editable = is_editable
        db.session.commit()
        
        safe_log(f"Admin toggled is_editable to {is_editable} for organisation user: {user.email}")
        
        return success_response(
            f"Profile editing {'enabled' if is_editable else 'disabled'} successfully",
            is_editable=is_editable
        )
        
    except Exception as e:
        db.session.rollback()
        safe_log(f"toggle_msme_editable_error: {str(e)}")
        safe_log(f"Error type: {type(e).__name__}")
        safe_log(f"Error details: {repr(e)}")
        return error_response(f"Failed to update profile edit access: {str(e)}", 500)


# Admin: Get dashboard statistics for pie charts
@api_bp.route('/admin/dashboard-stats', methods=['GET'])
@token_required
@role_required(['admin'])
def get_dashboard_stats():
    """
    Admin-only endpoint to fetch aggregated statistics for dashboard pie charts.
    Returns counts grouped by status for Tech Transfer IPs, Collaborations, and Solutions.
    Also returns user counts by role.
    """
    try:
        # Tech Transfer IPs by approval status
        tech_transfer_stats = db.session.query(
            TechTransferIP.approvalStatus,
            func.count(TechTransferIP.id)
        ).group_by(TechTransferIP.approvalStatus).all()
        
        tech_transfer_by_status = {}
        for status, count in tech_transfer_stats:
            # Convert enum to string
            status_str = status.value if hasattr(status, 'value') else str(status)
            tech_transfer_by_status[status_str] = count
        
        # Add commercialized IPs count from restore table
        commercialized_count = TechTransferIPRestore.query.count()
        if commercialized_count > 0:
            tech_transfer_by_status['monitized'] = commercialized_count
        
        tech_transfer_total = sum(tech_transfer_by_status.values())
        
        # Collaborations by status
        collaboration_stats = db.session.query(
            Collaboration.status,
            func.count(Collaboration.id)
        ).group_by(Collaboration.status).all()
        
        collaboration_by_status = {}
        for status, count in collaboration_stats:
            # Convert enum to string
            status_str = status.value if hasattr(status, 'value') else str(status)
            collaboration_by_status[status_str] = count
        
        collaboration_total = sum(collaboration_by_status.values())
        
        # Solutions by status
        solution_stats = db.session.query(
            Solution.status,
            func.count(Solution.id)
        ).group_by(Solution.status).all()
        
        solution_by_status = {}
        for status, count in solution_stats:
            # Convert enum to string
            status_str = status.value if hasattr(status, 'value') else str(status)
            solution_by_status[status_str] = count
        
        solution_total = sum(solution_by_status.values())
        
        # Users by role
        user_stats = db.session.query(
            User.role,
            func.count(User.uid)
        ).group_by(User.role).all()
        
        user_by_role = {}
        for role, count in user_stats:
            # Convert enum to string
            role_str = role.value if hasattr(role, 'value') else str(role)
            user_by_role[role_str] = count
        
        user_total = sum(user_by_role.values())
        
        # Newsletter subscribers count
        newsletter_total = NewsletterSubscriber.query.count()
        
        # Aignite registrations (exclude config records) grouped by who_you_are
        aignite_registrations = AigniteRegistration.query.filter_by(is_config_record=False).all()
        aignite_total = len(aignite_registrations)
        
        aignite_by_type = {}
        for reg in aignite_registrations:
            reg_type = reg.who_you_are or 'Other'
            aignite_by_type[reg_type] = aignite_by_type.get(reg_type, 0) + 1
        
        return success_response(
            "Dashboard statistics fetched successfully",
            tech_transfer={
                "total": tech_transfer_total,
                "by_status": tech_transfer_by_status
            },
            collaborations={
                "total": collaboration_total,
                "by_status": collaboration_by_status
            },
            solutions={
                "total": solution_total,
                "by_status": solution_by_status
            },
            users={
                "total": user_total,
                "by_role": user_by_role
            },
            newsletter={
                "total": newsletter_total
            }
        )
        
    except Exception as e:
        safe_log(f"get_dashboard_stats_error: {str(e)}")
        return error_response(f"Failed to fetch dashboard statistics: {str(e)}", 500)
