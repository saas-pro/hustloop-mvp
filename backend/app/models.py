# models.py

from enum import Enum
from .extensions import db
from datetime import datetime, timedelta, timezone
import uuid
from sqlalchemy.orm import relationship
from sqlalchemy import Index
from sqlalchemy.dialects.postgresql import JSON
from flask import current_app
import json
import pytz

IST = pytz.timezone('Asia/Kolkata')
now_ist = IST.localize(datetime.now())

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

class SolutionStatus(str,Enum):
    new = "new"
    under_review = "under_review"
    duplicate = "duplicate"
    rejected = "rejected"
    solution_accepted_points = "solution_accepted_points"
    triaged = "triaged"
    need_info = "need_info"
    winner = "winner"

class CollaborationStatus(str, Enum):
    active = "active"
    expired = "expired"
    stopped = "stopped"

class PaymentMethod(str, Enum):
    paypal = "paypal"
    bank = "bank"
    upi = "upi"

class PaymentCategory(str, Enum):
    primary = "primary"
    secondary = "secondary"
    others = "others"
    
def safe_iso(dt):
    if dt is None:
        return None
    try:
        return dt.isoformat()
    except AttributeError:
        return str(dt)

class User(db.Model):
    __tablename__ = 'users'

    uid = db.Column(db.String(128), primary_key=True)
    name = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    role = db.Column(db.String(20), nullable=True, index=True)  
    founder_role = db.Column(db.String(50), nullable=True, index=True)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.role != "founder":
            self.founder_role = None  # enforce clean data

    def validate(self):
        """Custom validation logic"""
        if self.role == "founder" and self.founder_role not in [
            "Solve Organisation's challenge",
            "List a technology for licensing",
            "Submit an innovative idea"
        ]:
            raise ValueError("Founder must select a valid founder role.")
    auth_provider = db.Column(db.String(50), nullable=True)  # e.g., 'local', 'google', 'linkedin'
    password_hash = db.Column(db.String(128), nullable=True)  # Hashed password, only for admin user

    is_confirmed = db.Column(db.Boolean, nullable=False, default=False)
    is_banned = db.Column(db.Boolean, nullable=False, default=False)
    has_subscription = db.Column(db.Boolean, nullable=False, default=False)
    status = db.Column(db.String(20), nullable=False, default='inactive', index=True)  # e.g., active, banned
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    title = db.Column(db.String(100), nullable=True)
    avatar = db.Column(db.String(255), nullable=True)
    hint = db.Column(db.String(255), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    hourly_rate = db.Column(db.Float, nullable=True)
    expertise = db.Column(db.Text, nullable=True)  # you can switch to JSONB if using PostgreSQL
    x_url = db.Column(db.String(255), nullable=True)
    linkedin_url = db.Column(db.String(255), nullable=True)

    # --- Security fields for login attempt tracking and password history ---
    failed_login_attempts = db.Column(db.Integer, nullable=False, default=0)
    last_failed_login = db.Column(db.DateTime, nullable=True)
    account_locked_until = db.Column(db.DateTime, nullable=True)
    password_history = db.Column(db.Text, nullable=True)  # JSON string of previous password hashes
    last_login = db.Column(db.DateTime, nullable=True)  # Track last login for first-time login logic
    reset_token = db.Column(db.String(512), nullable=True)  # For password reset flow, length matches JWT
    refresh_token_jti = db.Column(db.String(64), nullable=True)  # For refresh token revocation (optional)
    must_reset_password = db.Column(db.Boolean, default=False)
    
    
    # Relationships
    msme_profile = db.relationship('MSMEProfile', backref='user', uselist=False)
    collaborations = db.relationship("Collaboration", back_populates="creator")
    qa_items = db.relationship('QAItem', back_populates='author', cascade='all, delete-orphan')
    team_solutions = db.relationship(
        "TeamSolutionMembers",
        back_populates="user",
        lazy=True,
        overlaps="user,team_members"
    )

    def to_dict(self):
        return {
            'uid': self.uid,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'founder_role':self.founder_role,
            'auth_provider': self.auth_provider,
            'is_confirmed': self.is_confirmed,
            'is_banned': self.is_banned,
            'has_subscription': self.has_subscription,
            'status': self.status,
            'created_at': safe_iso(self.created_at),
            'title': self.title,
            'avatar': self.avatar,
            'hint': self.hint,
            'bio': self.bio,
            'hourly_rate': self.hourly_rate,
            'expertise': self.expertise.split(',') if self.expertise else [],
            'x_url': self.x_url,
            'linkedin_url': self.linkedin_url,
            'must_reset_password': self.must_reset_password,
        }

    def add_password_to_history(self, new_hash, max_history=5):
        """Add a password hash to the user's password history, keeping only the last N."""
        try:
            history = json.loads(self.password_history) if self.password_history else []
        except Exception:
            history = []
        history.append(new_hash)
        if len(history) > max_history:
            history = history[-max_history:]
        self.password_history = json.dumps(history)

    def check_password_reuse(self, new_hash):
        """Check if the new password hash is in the user's password history."""
        try:
            history = json.loads(self.password_history) if self.password_history else []
        except Exception:
            history = []
        return new_hash in history

# Add indexes for performance on frequently queried fields
Index('ix_users_email', User.email)
Index('ix_users_role', User.role)
Index('ix_users_status', User.status)

class UserPaymentMethod(db.Model):
    __tablename__ = 'user_payment'
    
    id = db.Column(db.String(128), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(128), db.ForeignKey('users.uid', ondelete='CASCADE'), nullable=False)
    
    # Payment details
    payment_method = db.Column(db.Enum(PaymentMethod), nullable=False)
    payment_category = db.Column(db.Enum(PaymentCategory), nullable=False, unique=True)  # Unique per user
    
    # Method-specific fields
    paypal_email = db.Column(db.String(120), nullable=True)
    account_holder = db.Column(db.String(100), nullable=True)
    account_number = db.Column(db.String(50), nullable=True)
    ifsc_code = db.Column(db.String(20), nullable=True)
    upi_id = db.Column(db.String(100), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = db.relationship('User', backref=db.backref('payment_methods', lazy=True, cascade='all, delete-orphan'))
    
    # Unique constraint: one category per user
    __table_args__ = (
        db.UniqueConstraint('user_id', 'payment_category', name='unique_user_category'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'payment_method': self.payment_method.value,
            'payment_category': self.payment_category.value,
            'paypal_email': self.paypal_email,
            'account_holder': self.account_holder,
            'account_number': self.account_number,
            'ifsc_code': self.ifsc_code,
            'upi_id': self.upi_id,
            'created_at': safe_iso(self.created_at),
            'updated_at': safe_iso(self.updated_at)
        }


class NewsletterSubscriber(db.Model):
    __tablename__ = 'newsletter_subscribers'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    subscribed_at = db.Column(db.DateTime, default=datetime.utcnow)
    unsubscribe_token = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'subscribed_at': safe_iso(self.subscribed_at),
            'unsubscribe_token': self.unsubscribe_token
        }

class BlogPost(db.Model):
    __tablename__ = 'blog_posts'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(300), nullable=False)
    slug = db.Column(db.String(350), unique=True, nullable=False, index=True)
    excerpt = db.Column(db.String(500), nullable=True)
    content = db.Column(db.Text, nullable=False)
    featured_image_url = db.Column(db.String(500), nullable=True)
    youtube_embed_url = db.Column(db.String(500), nullable=True)
    website_url = db.Column(db.String(500), nullable=True)
    instagram_url = db.Column(db.String(500), nullable=True)
    linkedin_url = db.Column(db.String(500), nullable=True)
    x_url = db.Column(db.String(500), nullable=True)
    youtube_url = db.Column(db.String(500), nullable=True)
    meta_title = db.Column(db.String(60), nullable=True)
    meta_description = db.Column(db.String(160), nullable=True)
    tags = db.Column(db.String(200), nullable=True)
    status = db.Column(db.String(20), default='draft', nullable=False, index=True)
    delete_request_status = db.Column(db.String(20), nullable=True, index=True)
    rejection_reason = db.Column(db.Text, nullable=True)
    author_id = db.Column(db.String(128), db.ForeignKey('users.uid', ondelete='CASCADE'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = db.Column(db.DateTime, nullable=True, index=True)

    # Relationship to User
    author = db.relationship('User', backref=db.backref('blog_posts', lazy='dynamic'))

    def generate_slug(self):
        """Generate a unique slug from the title."""
        import re
        # Convert to lowercase and replace spaces with hyphens
        base_slug = re.sub(r'[^\w\s-]', '', self.title.lower())
        base_slug = re.sub(r'[-\s]+', '-', base_slug).strip('-')
        
        # Ensure uniqueness
        slug = base_slug
        counter = 1
        while True:
            existing = BlogPost.query.filter(
                BlogPost.slug == slug,
                BlogPost.id != self.id if self.id else True
            ).first()
            if not existing:
                break
            counter += 1
            slug = f"{base_slug}-{counter}"
        
        return slug

    def publish(self):
        """Set status to published."""
        self.status = 'published'

    def unpublish(self):
        """Set status to pending_review."""
        self.status = 'pending_review'

    def submit(self):
        """Set status to pending_review."""
        self.status = 'pending_review'

    def reject(self):
        """Set status to rejected."""
        self.status = 'rejected'

    def soft_delete(self):
        """Soft delete the blog post."""
        self.deleted_at = datetime.utcnow()

    def restore(self):
        """Restore a soft-deleted blog post."""
        self.deleted_at = None

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'slug': self.slug,
            'excerpt': self.excerpt,
            'content': self.content,
            'featured_image_url': self.featured_image_url,
            'youtube_embed_url': self.youtube_embed_url,
            'meta_title': self.meta_title,
            'meta_description': self.meta_description,
            'tags': self.tags.split(',') if self.tags else [],
            'status': self.status,
            'delete_request_status': self.delete_request_status,
            'rejection_reason': self.rejection_reason,
            'author_id': self.author_id,
            'website_url': self.website_url,
            'instagram_url': self.instagram_url,
            'linkedin_url': self.linkedin_url,
            'x_url': self.x_url,
            'youtube_url': self.youtube_url,
            'author': {
                'uid': self.author.uid,
                'name': self.author.name,
                'email': self.author.email
            } if self.author else None,
            'created_at': safe_iso(self.created_at),
            'updated_at': safe_iso(self.updated_at),
            'deleted_at': safe_iso(self.deleted_at) if self.deleted_at else None,
        }


# --- Education Program Models ---


class EducationProgram(db.Model):
    __tablename__ = 'education_programs'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    duration = db.Column(db.String(100), nullable=True)
    level = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'duration': self.duration,
            'level': self.level,
            'created_at': safe_iso(self.created_at)
        }

class Plan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    price = db.Column(db.Integer, nullable=False)  # Keeping for compatibility
    price_in_paise = db.Column(db.Integer, nullable=False)
    billing_cycle = db.Column(db.String(20), nullable=False)  # monthly, yearly
    duration_days = db.Column(db.Integer, default=30)  # Default to 30 days
    features = db.Column(JSON, nullable=True)  # Store as JSON list
    description = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    tax_percentage = db.Column(db.Integer, default=18)
    tag = db.Column(db.String(50), nullable=True)  # Promotional tag (e.g., "Popular")
    originally = db.Column(db.String(50), nullable=True)  # Original price for strikethrough
    offer = db.Column(db.String(50), nullable=True)  # Offer label (e.g., "25% OFF")
    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())

    def as_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'price': self.price,
            'price_in_paise': self.price_in_paise,
            'billing_cycle': self.billing_cycle,
            'duration_days': self.duration_days,
            'tax_percentage': self.tax_percentage,
            'features': self.features if isinstance(self.features, list) else [],
            'description': self.description,
            'is_active': self.is_active,
            'tag': self.tag,
            'originally': self.originally,
            'offer': self.offer,
            'created_at': safe_iso(self.created_at),
            'updated_at': safe_iso(self.updated_at)
        }

class Coupon(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    type = db.Column(db.String(10), nullable=False) 
    plan_id = db.Column(db.Integer, db.ForeignKey('plan.id'), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())

    def as_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'amount': self.amount,
            'type': self.type,
            'plan_id': self.plan_id,
            'is_active': self.is_active,
            'created_at': safe_iso(self.created_at),
            'updated_at': safe_iso(self.updated_at)
        }

class PricingHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.Integer, db.ForeignKey('plan.id'), nullable=False)
    old_price = db.Column(db.Integer, nullable=False)
    new_price = db.Column(db.Integer, nullable=False)
    changed_by = db.Column(db.String(100), nullable=False)
    changed_at = db.Column(db.DateTime, default=db.func.now())

    def as_dict(self):
        return {
            'id': self.id,
            'plan_id': self.plan_id,
            'old_price': self.old_price,
            'new_price': self.new_price,
            'changed_by': self.changed_by,
            'changed_at': safe_iso(self.changed_at)
        }

class Payment(db.Model):
    __tablename__ = 'payments'
    id = db.Column(db.String(128), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(128), db.ForeignKey('users.uid', ondelete='CASCADE'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('plan.id'), nullable=False)
    amount = db.Column(db.Integer, nullable=False)  # Total in paise
    base_amount = db.Column(db.Integer, nullable=True)  # in paise
    tax_amount = db.Column(db.Integer, nullable=True)  # in paise
    razorpay_order_id = db.Column(db.String(128), unique=True, nullable=False)
    razorpay_payment_id = db.Column(db.String(128), unique=True, nullable=True)
    razorpay_signature = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), default='pending')  # pending, verified, success, failed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('payments', lazy=True))
    plan = db.relationship('Plan')

    def as_dict(self):
        return {
            'id': self.id,
            'amount': self.amount,
            'base_amount': self.base_amount,
            'tax_amount': self.tax_amount,
            'status': self.status,
            'razorpay_order_id': self.razorpay_order_id,
            'created_at': safe_iso(self.created_at)
        }

class UserSubscription(db.Model):
    __tablename__ = 'user_subscriptions'
    id = db.Column(db.String(128), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(128), db.ForeignKey('users.uid', ondelete='CASCADE'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('plan.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, active, canceled, expired
    start_date = db.Column(db.DateTime, nullable=True)
    end_date = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('subscriptions', lazy=True))
    plan = db.relationship('Plan')

    def as_dict(self):
        return {
            'id': self.id,
            'status': self.status,
            'plan_id': self.plan_id,
            'plan_name': self.plan.name if self.plan else None,
            'start_date': safe_iso(self.start_date),
            'end_date': safe_iso(self.end_date)
        }
    
    def is_expired(self):
        """Check if subscription has expired"""
        if self.status != 'active':
            return False
        if not self.end_date:
            return False
        return datetime.utcnow() > self.end_date
    
    def expire_if_needed(self):
        """Expire subscription if past end_date"""
        if self.is_expired():
            self.status = 'expired'
            db.session.commit()
            return True
        return False

class ApprovalStatus(str,Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    needinfo = "needInfo"
    draft = "draft"


class TechTransferIP(db.Model):
    __tablename__ = "techtransfer_ips"

    id = db.Column(db.String(128), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String, db.ForeignKey('users.uid'), nullable=False)
    user = db.relationship("User", backref="techtransfer_ips")
    ipTitle = db.Column(db.String(100), nullable=False)
    firstName = db.Column(db.String(100), nullable=False)
    lastName = db.Column(db.String(100), nullable=False)
    describetheTech = db.Column(db.String(5000), nullable=True)
    summary = db.Column(db.String(1000), nullable=True)
    inventorName = db.Column(db.String(100), nullable=True)
    organization = db.Column(db.String(100), nullable=False)
    contactEmail = db.Column(db.String(100), nullable=False)
    supportingFile = db.Column(JSON, default=list)
    approvalStatus = db.Column(db.Enum(ApprovalStatus), default=ApprovalStatus.pending)
    timestamp = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(IST))
    needinfo_comments = db.relationship("NeedInfoComment", back_populates='techtransfer_ips', cascade="all, delete-orphan")

    def as_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "ipTitle": self.ipTitle,
            "firstName": self.firstName,
            "lastName": self.lastName,
            "describetheTech": self.describetheTech,
            "summary": self.summary,
            "inventorName": self.inventorName,
            "organization": self.organization,
            "contactEmail": self.contactEmail,
            "supportingFile": self.supportingFile,
            "approvalStatus": self.approvalStatus.value,
            "timestamp": self.timestamp
        }

        
class DraftTechTransferIP(db.Model):
    __tablename__ = "ip_drafts"

    id = db.Column(db.String(128), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String, db.ForeignKey('users.uid'), nullable=False)
    user = db.relationship("User", backref="ip_drafts")

    ipTitle = db.Column(db.String(100), nullable=True)
    firstName = db.Column(db.String(100), nullable=True)
    lastName = db.Column(db.String(100), nullable=True)
    describetheTech = db.Column(db.String(5000), nullable=True)
    summary = db.Column(db.String(1000), nullable=True) 
    inventorName = db.Column(db.String(100), nullable=True)
    organization = db.Column(db.String(100), nullable=True)
    contactEmail = db.Column(db.String(100), nullable=True)
    approvalStatus = db.Column(db.Enum(ApprovalStatus), default=ApprovalStatus.draft)
    supportingFile = db.Column(db.String(255), nullable=True)

    is_submitted = db.Column(db.Boolean, default=False)
    last_updated = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(IST),
        onupdate=lambda: datetime.now(IST)
    )

    def as_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "ipTitle": self.ipTitle,
            "firstName": self.firstName,
            "lastName": self.lastName,
            "describetheTech": self.describetheTech,
            "summary":self.summary,
            "inventorName": self.inventorName,
            "organization": self.organization,
            "contactEmail": self.contactEmail,
            "supportingFile": self.supportingFile,
            "is_submitted": self.is_submitted,
            "last_updated": self.last_updated
        }
        
class TechTransferIPRestore(db.Model):
    __tablename__ = "techtransfer_ip_restore"

    restore_id = db.Column(db.String(128), primary_key=True, default=lambda: str(uuid.uuid4()))
    original_ip_id = db.Column(db.String(128), index=True, nullable=False)
    action_timestamp = db.Column(db.DateTime, default=datetime.now, nullable=False)
    action_type = db.Column(db.String(50), nullable=True)
    action_by_user_id = db.Column(db.String, db.ForeignKey('users.uid'), nullable=True)
    user_id = db.Column(db.String, nullable=False)

    ipTitle = db.Column(db.String(100), nullable=False)
    firstName = db.Column(db.String(100), nullable=False)
    lastName = db.Column(db.String(100), nullable=False)

    describetheTech = db.Column(db.String(5000), nullable=False)
    summary = db.Column(db.String(1000), nullable=True) 

    inventorName = db.Column(db.String(100), nullable=True)
    organization = db.Column(db.String(100), nullable=False)
    contactEmail = db.Column(db.String(100), nullable=False)
    supportingFile = db.Column(JSON, default=list)

    approvalStatus = db.Column(db.String(50), nullable=True)
    
    def __init__(self, ip_instance=None, action='DELETED', action_user_id=None, **kwargs):
        super().__init__(**kwargs)  
        if ip_instance:
            self.original_ip_id = ip_instance.id
            self.user_id = ip_instance.user_id
            self.ipTitle = ip_instance.ipTitle
            self.firstName = ip_instance.firstName
            self.lastName = ip_instance.lastName
            self.describetheTech = ip_instance.describetheTech
            self.summary = ip_instance.summary
            self.inventorName = ip_instance.inventorName
            self.organization = ip_instance.organization
            self.contactEmail = ip_instance.contactEmail
            self.supportingFile = ip_instance.supportingFile
            self.approvalStatus = (
                ip_instance.approvalStatus.value
                if hasattr(ip_instance.approvalStatus, "value")
                else str(ip_instance.approvalStatus)
            )
            self.action_timestamp = ip_instance.timestamp
            self.action_type = action
            self.action_by_user_id = action_user_id

    def as_dict(self):
        return {
        "id": self.restore_id,
        "ip_id": self.original_ip_id,
        "ipTitle":self.ipTitle,
        "summary":self.summary,
        "inventorName":self.firstName +" "+ self.lastName,
        "organization":self.organization,
        "action_type": self.action_type,
        "action_user_id": self.action_by_user_id,
        "action_timestamp": self.action_timestamp.isoformat() if self.action_timestamp else None,
        }
        
class NeedInfoComment(db.Model):
    __tablename__ = 'needinfo_comments'
    id = db.Column(db.String(128), primary_key=True, default=lambda: str(uuid.uuid4()))
    tech_transfer_ip_id = db.Column(db.String(128), db.ForeignKey('techtransfer_ips.id'), nullable=False)
    techtransfer_ips = db.relationship("TechTransferIP", back_populates="needinfo_comments")
    comment = db.Column(db.Text, nullable=False)
    comment_user_id = db.Column(db.String, db.ForeignKey('users.uid'), nullable=False)
    parent_id = db.Column(db.String(128), db.ForeignKey('needinfo_comments.id'), nullable=True)
    isUpdated = db.Column(db.Boolean,nullable=False,default=False)
    parent = db.relationship('NeedInfoComment', remote_side=[id], backref='replies')
    supportingFile = db.Column(db.String(255), nullable=True)  
    isdraft = db.Column(db.Boolean, nullable=False, default=False)
    
    timestamp = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(IST)
    )
    
    def as_dict(self):
        return {
            'id': self.id,
            'tech_transfer_ip_id': self.tech_transfer_ip_id,
            'comment': self.comment,
            'parent_id': self.parent_id,
            'comment_user_id': self.comment_user_id,
            'isdraft': self.isdraft,
            'isUpdated':self.isUpdated,
            'supportingFile': self.supportingFile,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }
    
    
class AigniteRegistration(db.Model):
    __tablename__ = "aignite_registrations"
    
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    email_address = db.Column(db.String(120), unique=True, nullable=False)
    phone_number = db.Column(db.String(20), nullable=False)
    event = db.Column(db.String(50), nullable=False)
    who_you_are = db.Column(db.String(50), nullable=False)
    registered_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(IST)
    )
    # Event toggle - stores whether event registration is enabled
    # Using a special record with id=0 or email='__CONFIG__' to store this
    is_config_record = db.Column(db.Boolean, default=True, nullable=False)
    is_event_enabled = db.Column(db.Boolean, default=True, nullable=True)

    def as_dict(self):
        return {
            "full_name": self.full_name,
            "is_event_enabled": self.is_event_enabled
        }
    
    @classmethod
    def get_event_config(cls):
        """Get the event configuration record"""
        config = cls.query.filter_by(is_config_record=True).first()
        if not config:
            # Create default config if doesn't exist
            config = cls(
                full_name="__EVENT_CONFIG__",
                email_address="__config__@hustloop.internal",
                phone_number="0000000000",
                event="aignite",
                who_you_are="config",
                is_config_record=True,
                is_event_enabled=True
            )
            db.session.add(config)
            db.session.commit()
        return config
    
    @classmethod
    def is_enabled(cls):
        """Check if event registration is enabled"""
        config = cls.get_event_config()
        return config.is_event_enabled if config else False


class MSMEProfile(db.Model):
    __tablename__ = 'msme_profiles'
    
    id = db.Column(db.String(128), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_name = db.Column(db.String(255), nullable=False)
    affiliated_by = db.Column(db.String(255),nullable=True)
    sector = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text,nullable=False)
    website_url = db.Column(db.String(255))
    linkedin_url = db.Column(db.String(255))
    x_url = db.Column(db.String(255))
    instagram_url = db.Column(db.String(255))
    phone_number = db.Column(db.String(10))
    logo_url = db.Column(db.String(255))
    user_id = db.Column(db.String, db.ForeignKey('users.uid'), nullable=False)
    is_submitted = db.Column(db.Boolean, default=False, nullable=False)
    is_editable = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def as_dict(self):
        return {
            "company_name": self.company_name,
            "affiliated_by": self.affiliated_by,
            "description": self.description,
            "website_url": self.website_url,
            "linkedin_url": self.linkedin_url,
            "x_url":self.x_url,
            "instagram_url": self.instagram_url,
            "phone_number": self.phone_number,
            "logo_url": self.logo_url,
            "is_submitted": self.is_submitted,
            "is_editable": self.is_editable
        }

        
class Sector(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False)
    technology_areas = db.relationship("TechnologyArea", backref="sector", lazy=True)

class TechnologyArea(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    sector_id = db.Column(db.Integer, db.ForeignKey("sector.id"), nullable=False)



class Collaboration(db.Model):
    __tablename__ = 'collaborations'

    id = db.Column(db.String(128), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    reward_amount = db.Column(db.Float)
    reward_min = db.Column(db.Float)
    reward_max = db.Column(db.Float)
    challenge_type = db.Column(db.String(50), nullable=False)
    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime)
    stop_date = db.Column(db.DateTime)
    extended_end_date = db.Column(db.DateTime)
    review_start_date = db.Column(db.DateTime)
    screening_start_date = db.Column(db.DateTime)
    pitching_start_date = db.Column(db.DateTime)
    sector = db.Column(db.String(255))
    technology_area = db.Column(db.String(255))
    contact_name = db.Column(db.String(100), nullable=False)
    contact_role = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(IST))
    status = db.Column(db.Enum(CollaborationStatus), default=CollaborationStatus.active, nullable=False)
    allow_status_updates = db.Column(db.Boolean, default=False, nullable=False)
    user_id = db.Column(db.String, db.ForeignKey("users.uid", ondelete='CASCADE'), nullable=False)
    attachments = db.Column(db.Text, default="[]")
    creator = db.relationship("User", back_populates="collaborations")
    solutions = db.relationship(
        "Solution",
        backref=db.backref("challenge", lazy=True),
        cascade="all, delete-orphan",
        lazy=True
    )
    comments = db.relationship(
        "Comment",
        backref="collaboration",
        cascade="all, delete-orphan",
        lazy=True
    )
    qa_items = db.relationship(
        'QAItem',
        back_populates='collaboration',
        cascade='all, delete'
    )
    announcements = relationship(
        "Announcement",
        back_populates="collaboration",
        cascade="all, delete"
    )
    
    def check_and_update_status(self):
        if self.status == CollaborationStatus.stopped:
                return
        now = datetime.now(IST)
        final_deadline = self.extended_end_date or self.end_date
        if final_deadline:
            if final_deadline.tzinfo is None:
                final_deadline = IST.localize(final_deadline)
            if final_deadline < now and self.status == CollaborationStatus.active:
                self.status = CollaborationStatus.expired

    def extend_end_date(self, new_end_date):
        
        if new_end_date.tzinfo is None:
            new_end_date = IST.localize(new_end_date)
        else:
            new_end_date = new_end_date.astimezone(IST)

        end_date = self.end_date
        if end_date:
            if end_date.tzinfo is None:
                end_date = IST.localize(end_date)
            else:
                end_date = end_date.astimezone(IST)

        extended = self.extended_end_date
        if extended:
            if extended.tzinfo is None:
                extended = IST.localize(extended)
            else:
                extended = extended.astimezone(IST)
        if end_date and new_end_date <= end_date:
            raise ValueError("Extended end date must be greater than original end date")

        self.extended_end_date = new_end_date

    def pause(self, pause_date=None):
        try:
            if self.status == CollaborationStatus.stopped:
                raise ValueError("Cannot pause a stopped collaboration")
            pd = pause_date or datetime.now(IST)
            if pd.tzinfo is None:
                pd = IST.localize(pd)
            else:
                pd = pd.astimezone(IST)
            self.pause_date = pd
            self.status = CollaborationStatus.paused
            return safe_log({"pause_date": self.pause_date.isoformat(), "status": self.status.value if hasattr(self.status, "value") else self.status})
        except Exception as e:
            safe_log(str(e))
            return safe_log(str(e))

    def stop(self, stop_date=None):
        try:
            if self.status == CollaborationStatus.stopped:
                raise ValueError("Collaboration already stopped")
            sd = stop_date or datetime.now(IST)
            if sd.tzinfo is None:
                sd = IST.localize(sd)
            else:
                sd = sd.astimezone(IST)
            self.stop_date = sd
            self.status = CollaborationStatus.stopped
            return safe_log({"stop_date": self.stop_date.isoformat(), "status": self.status.value if hasattr(self.status, "value") else self.status})
        except Exception as e:
            safe_log(str(e))
            return safe_log(str(e))


    def to_dict(self):
        self.check_and_update_status()
        db.session.commit()
        profile = self.creator.msme_profile if self.creator and self.creator.msme_profile else None
        
        # Determine if company name should be visible
        display_name = None
        show_full = False
        first_letter = None
        if profile and profile.company_name:
            from flask import request
            try:
                user_id = getattr(request, "user_id", None)
                user_role = getattr(request, "user_role", None)

                # Robust admin check
                is_admin = False
                if user_role:
                    is_admin = "admin" in str(user_role).lower()
                elif user_id:
                    # Fallback check if user_role isn't on request but user_id is
                    from .models import User
                    u = User.query.get(user_id)
                    if u and u.role == "admin":
                        is_admin = True
                
                if is_admin:
                    show_full = True
            except Exception:
                pass
            
            if show_full:
                display_name = profile.company_name
                first_letter = profile.company_name[0] if profile.company_name else None
            else:
                original = profile.company_name
                display_name = original[:2] + "X" * (len(original) - 2)
                first_letter = original[0]
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "reward_amount": self.reward_amount,
            "reward_min": self.reward_min,
            "reward_max": self.reward_max,
            "challenge_type": self.challenge_type,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "extended_end_date": self.extended_end_date.isoformat() if self.extended_end_date else None,
            "stop_date": self.stop_date.isoformat() if self.stop_date else None,
            "sector": self.sector,
            "technology_area": self.technology_area,
            "attachments":self.attachments if self.attachments else None,
            "contact_name": self.contact_name,
            "contact_role": self.contact_role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "status": self.status.value if hasattr(self.status, "value") else self.status,
            "allow_status_updates": self.allow_status_updates,
            "company_name": display_name,
            "affiliated_by": profile.affiliated_by if profile else None,
            "company_sector": profile.sector if profile else None,
            "company_description": profile.description if profile else None,
            "company_avatar": first_letter,
            "logo_url": (profile.logo_url if profile else None) if show_full else None,
        }


class Solution(db.Model):
    __tablename__ = "solutions"

    id = db.Column(db.String(128), primary_key=True, default=lambda: str(uuid.uuid4()))
    challenge_id = db.Column(db.String(128), db.ForeignKey("collaborations.id", ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.String, db.ForeignKey("users.uid", ondelete='CASCADE'), nullable=False)
    description = db.Column(db.Text, nullable=False)
    points = db.Column(db.Integer, default=0)
    contact_name = db.Column(db.String(100), nullable=False)
    reward_amount = db.Column(db.Float, default=0)
    mobile_number = db.Column(db.String(20), nullable=False)
    place_of_residence = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now(IST))
    updated_at = db.Column(db.DateTime, default=datetime.now(IST), onupdate=datetime.now(IST))

    status = db.Column(
    db.Enum(SolutionStatus),
    default=SolutionStatus.new,
    nullable=False
    )

    application_end_email_sent = db.Column(db.Boolean, default=False)
    extended_email_sent = db.Column(db.Boolean, default=False)
    review_start_email_sent = db.Column(db.Boolean, default=False)
    review_end_email_sent = db.Column(db.Boolean, default=False)
    screening_start_email_sent = db.Column(db.Boolean, default=False)
    screening_end_email_sent = db.Column(db.Boolean, default=False)
    pitching_start_email_sent = db.Column(db.Boolean, default=False)
    pitching_end_email_sent = db.Column(db.Boolean, default=False)

    files = db.relationship("File", backref="solution", cascade="all, delete-orphan", lazy=True)
    comments = db.relationship("Comment", backref="solution", cascade="all, delete-orphan", lazy=True)
    user = db.relationship("User", backref="solutions", lazy=True)
    team_members = db.relationship(
        "TeamSolutionMembers",
        back_populates="solution",
        cascade="all, delete-orphan",
        lazy=True,
        overlaps="team_solutions,user"
    )
    pitching_tokens = db.relationship(
        "PitchingToken",
        back_populates="solution",
        cascade="all, delete-orphan",
        lazy=True
    )
    pitching_details = db.relationship(
        "PitchingDetails",
        back_populates="solution",
        cascade="all, delete-orphan",
        lazy=True
    )

    def to_dict(self):
        challenge = self.challenge if hasattr(self, "challenge") else None
        challenge_creator_profile = (
            challenge.creator.msme_profile if challenge and challenge.creator and challenge.creator.msme_profile else None
        )
        
        # company_name masking logic for the challenge poster
        display_company_name = None
        show_full = False
        if challenge_creator_profile and challenge_creator_profile.company_name:
            from flask import request
            try:
                user_id = getattr(request, "user_id", None)
                user_role = getattr(request, "user_role", None)
                
                # Logic: Show full if user is the challenge owner OR user is an admin
                is_owner = challenge and user_id and user_id == challenge.user_id
                
                # Robust admin check
                is_admin = False
                if user_role:
                    is_admin = "admin" in str(user_role).lower()
                elif user_id:
                    from .models import User
                    u = User.query.get(user_id)
                    if u and u.role == "admin":
                        is_admin = True
                
                if is_owner or is_admin:
                    show_full = True
            except Exception:
                pass
            
            if show_full:
                display_company_name = challenge_creator_profile.company_name
                first_letter = challenge_creator_profile.company_name[0] if challenge_creator_profile.company_name else None
            else:
                original = challenge_creator_profile.company_name
                display_company_name = original[:2] + "X" * (len(original) - 2)
                first_letter = original[0]

        return {
            "id": self.id,
            "challengeId": self.challenge_id,
            "userId": self.user_id,
            "description": self.description,
            "points": self.points or 0,
            "contactName": self.contact_name,
            "mobileNumber": self.mobile_number,
            "placeOfResidence": self.place_of_residence,
            "state": self.state,
            "createdAt": self.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "updatedAt": self.updated_at.strftime("%Y-%m-%d %H:%M:%S"),
            "status": self.status,
            "files": [f.to_dict() for f in self.files] if self.files else [],
            "comments": [c.to_dict() for c in self.comments] if self.comments else [],
            "challenge": {
                "id": challenge.id if challenge else None,
                "title": challenge.title if challenge else None,
                "challenge_user_id": challenge.user_id if challenge else None,
                "challenge_type": challenge.challenge_type if challenge else None,
                "postedBy": {
                    "companyName": display_company_name,
                    "companyAvatar": first_letter,
                    "sector": (challenge_creator_profile.sector if challenge_creator_profile else None) if show_full else None,
                    "logoUrl": (challenge_creator_profile.logo_url if challenge_creator_profile else None) if show_full else None,
                } if challenge_creator_profile else None
        } if challenge else None
    }

class File(db.Model):
    __tablename__ = "solution_files"

    id = db.Column(db.String(128), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    size = db.Column(db.Integer, nullable=False)
    solution_id = db.Column(db.String(128), db.ForeignKey("solutions.id", ondelete='CASCADE'), nullable=False)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "path": self.url, "size": self.size}


class TeamSolutionMembers(db.Model):
    __tablename__ = "team_solution_members"

    id = db.Column(db.String(128), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    solution_id = db.Column(
        db.String(128),
        db.ForeignKey("solutions.id", ondelete="CASCADE"),
        nullable=False
    )

    user_id = db.Column(
        db.String(128),
        db.ForeignKey("users.uid", ondelete="CASCADE"),
        nullable=False
    )

    status = db.Column(
        db.String(32),
        default="pending",
        nullable=False
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", back_populates="team_solutions", overlaps="team_members")
    solution = db.relationship("Solution", back_populates="team_members")

    def to_dict(self):
        return {
            "id": self.id,
            "solutionId": self.solution_id,
            "userId": self.user_id,
            "status": self.status,
            "createdAt": self.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }

class TeamInvite(db.Model):
    id = db.Column(db.String(32), primary_key=True)
    email = db.Column(db.String(255), nullable=False)
    solution_id = db.Column(db.String(36), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(IST))


class TestimonialStatus(Enum):
    ACTIVE = 'ACTIVE'
    HIDDEN = 'HIDDEN'

class Testimonial(db.Model):
    __tablename__ = 'testimonials'
    
    id = db.Column(db.String(100), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    avatar = db.Column(db.String(255))
    rating = db.Column(db.Integer, nullable=False)
    status = db.Column(
        db.Enum(TestimonialStatus, name='testimonial_status'),
        default=TestimonialStatus.HIDDEN,
        nullable=False
    )
    created_at = db.Column(db.DateTime, default=datetime.now(IST))
    updated_at = db.Column(db.DateTime, default=datetime.now(IST), onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'role': self.role,
            'content': self.content,
            'avatar': self.avatar,
            'rating': self.rating,
            'status': self.status.value if self.status else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class TestimonialRequest(db.Model):
    __tablename__ = 'testimonial_requests'
    
    id = db.Column(db.String(128), primary_key=True, default=lambda: str(uuid.uuid4()))
    token = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(255), nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now(IST), nullable=False)
    sent_count = db.Column(db.Integer, default=0, nullable=False)
    last_sent_at = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(20), default='pending', nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'token': self.token,
            'email': self.email,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_used': self.is_used,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'sent_count': self.sent_count,
            'last_sent_at': self.last_sent_at.isoformat() if self.last_sent_at else None,
            'status': self.status
        }
        
    def is_expired(self):
        return datetime.now(IST) > self.expires_at
    
    def is_valid(self):
        return not self.is_expired() and not self.is_used


class Comment(db.Model):
    __tablename__ = 'comments'

    id = db.Column(db.String(128), primary_key=True, default=lambda: str(uuid.uuid4()))
    solution_id = db.Column(db.String(128), db.ForeignKey("solutions.id", ondelete='CASCADE'), nullable=False)
    collaboration_id = db.Column(db.String(128), db.ForeignKey("collaborations.id", ondelete='CASCADE'), nullable=True)

    author_id = db.Column(db.String(128), db.ForeignKey('users.uid', ondelete='CASCADE'), nullable=False)
    author = db.relationship("User", backref="comments", lazy=True)

    text = db.Column(db.Text, nullable=False)
    isUpdated = db.Column(db.Boolean, nullable=False, default=False)
    isDraft = db.Column(db.Boolean, nullable=False, default=False)

    supportingFile = db.Column(db.String(255), nullable=True)

    parent_id = db.Column(db.String(128), db.ForeignKey('comments.id', ondelete='CASCADE'), nullable=True)
    parent = db.relationship('Comment', remote_side=[id], backref='replies', lazy=True)

    comment_type = db.Column(db.String(50), nullable=False, default="comment")

    timestamp = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(IST)
    )

    def to_dict(self):
        return {
            "id": self.id,
            "solutionId": self.solution_id,
            "authorId": self.author_id,
            "authorName": getattr(self.author, "name", None),
            "authorRole": getattr(self.author, "role", None),
            "text": self.text,
            "isUpdated": self.isUpdated,
            "isDraft": self.isDraft,
            "supportingFile": self.supportingFile,
            "parentId": self.parent_id,
            "commentType": self.comment_type,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "replies": [reply.to_dict() for reply in self.replies] if hasattr(self, 'replies') else [],
        }


    
class ConnextRegistration(db.Model):
    __tablename__ = "connext_registrations"

    id = db.Column(db.String(128), primary_key=True, default=lambda: str(uuid.uuid4()))
    full_name = db.Column(db.String, nullable=False)
    email_address = db.Column(db.String, nullable=False, index=True)
    phone_number = db.Column(db.String, nullable=False, index=True)
    event = db.Column(db.String, nullable=False)
    who_you_are = db.Column(db.String, nullable=False)
    other_who_you_are = db.Column(db.String, nullable=True)
    created_at = db.Column(db.DateTime,
        nullable=False,
        default=lambda: datetime.now(IST))

    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email_address": self.email_address,
            "phone_number": self.phone_number,
            "event": self.event,
            "who_you_are": self.who_you_are,
            "other_who_you_are": self.other_who_you_are,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

# class Submission(db.Model):
#     __tablename__ = 'submissions'

#     id = db.Column(db.Integer, primary_key=True)
#     founder_id = db.Column(db.String(128), db.ForeignKey('users.uid'), nullable=False)
#     idea = db.Column(db.String(255), nullable=False)
#     description = db.Column(db.Text, nullable=False)
#     status = db.Column(db.String(50), default='New')
#     submitted_date = db.Column(
#         db.DateTime,
#         nullable=False,
#         default=lambda: datetime.now(IST)
#     )

#     comments = db.relationship('Comment', backref='submission', lazy=True, cascade="all, delete-orphan")

        
class QAItem(db.Model):
    __tablename__ = 'qa_items'

    id = db.Column(db.String(128), primary_key=True,default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(128), db.ForeignKey('users.uid'), nullable=False)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(IST))
    text = db.Column(db.Text, nullable=False)
    collaboration_id = db.Column(
        db.String(128),
        db.ForeignKey('collaborations.id', ondelete='CASCADE'),
        nullable=True
    )
    attachment_name = db.Column(db.String(255))
    attachment_url = db.Column(db.String(255))
    attachment_type = db.Column(db.String(10))  

    parent_id = db.Column(db.Integer, db.ForeignKey('qa_items.id'), nullable=True)
    replies = db.relationship(
        'QAItem',
        backref=db.backref('parent', remote_side=[id]),
        cascade="all, delete-orphan"
    )

    author = db.relationship('User', back_populates='qa_items')
    collaboration = db.relationship('Collaboration', back_populates='qa_items')

    def __repr__(self):
        return f"<QAItem id={self.id} user_id={self.user_id} text='{self.text[:20]}...'>"

    def to_dict(self, include_replies=True):
        data = {
            "id": self.id,
            "author": self.author.name if self.author else None,
            "author_id": self.author.uid if self.author else None,
            "user_id": self.user_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            "text": self.text,
            "collaboration": self.collaboration.to_dict() if self.collaboration else None,
            "attachment": (
                {
                    "name": self.attachment_name,
                    "url": self.attachment_url,
                    "type": self.attachment_type,
                }
                if self.attachment_url
                else None
            ),
        }
        if include_replies:
            data["replies"] = [reply.to_dict() for reply in self.replies]
        return data

class Announcement(db.Model):
    __tablename__ = "announcements"

    id = db.Column(db.String(128), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    collaboration_id = db.Column(db.String(128), db.ForeignKey("collaborations.id"), nullable=False)

    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), nullable=False, default="general")
    
    created_by = db.Column(db.String(50), nullable=False)

    user_id = db.Column(db.String(128), db.ForeignKey("users.uid"), nullable=False)

    attachments = db.Column(db.Text, default="[]")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(IST))

    collaboration = db.relationship("Collaboration", back_populates="announcements")

    def to_dict(self):
        return {
            "id": self.id,
            "collaborationId": self.collaboration_id,
            "title": self.title,
            "message": self.message,
            "type": self.type,
            "createdBy": self.created_by,
            "attachments": json.loads(self.attachments),
            "createdAt": self.created_at.isoformat(),
        }

class PitchingDetails(db.Model):
    __tablename__ = 'pitching_details'

    id = db.Column(db.String(128), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(128), nullable=False)
    solution_id = db.Column(db.String(128), db.ForeignKey("solutions.id", ondelete='CASCADE'), nullable=False)
    pitch_date = db.Column(db.String(50), nullable=False)
    pitch_time = db.Column(db.String(50), nullable=False)
    requirements = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(IST))
    submitted = db.Column(db.Boolean, default=False)

    solution = db.relationship("Solution", back_populates="pitching_details")

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'solution_id': self.solution_id,
            'pitch_date': self.pitch_date,
            'pitch_time': self.pitch_time,
            'requirements': self.requirements,
            'created_at': safe_iso(self.created_at),
            'submitted': self.submitted
        }

class PitchingToken(db.Model):
    __tablename__ = "pitching_tokens"

    id = db.Column(db.String(128), primary_key=True, default=lambda: str(uuid.uuid4()))
    solution_id = db.Column(db.String(128), db.ForeignKey("solutions.id"), nullable=False)
    user_id = db.Column(db.String(128), db.ForeignKey("users.uid"), nullable=False)
    token = db.Column(db.String(64), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)

    solution = db.relationship("Solution", back_populates="pitching_tokens")
    user = db.relationship("User", backref="pitch_tokens")

class Incubator(db.Model):
    __tablename__ = 'incubators'

    id = db.Column(db.String(128), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False)
    image = db.Column(db.String(255), nullable=True)
    hint = db.Column(db.String(255), nullable=True)
    location = db.Column(db.String(255), nullable=True)
    type = db.Column(JSON, default=list)
    contactEmail = db.Column(db.String(120), nullable=True)
    contactPhone = db.Column(db.String(20), nullable=True)
    rating = db.Column(db.Float, default=0.0)
    reviews = db.Column(db.Integer, default=0)
    description = db.Column(db.Text, nullable=True)
    socialLinks = db.Column(JSON, default=dict)
    metrics = db.Column(JSON, default=dict)
    partners = db.Column(JSON, default=list)
    details = db.Column(JSON, default=dict)
    focus = db.Column(JSON, default=list)
    user_id = db.Column(db.String(128), db.ForeignKey('users.uid'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Enable cascading delete for related reviews
    incubator_reviews_rel = db.relationship('IncubatorReview', backref='incubator', cascade="all, delete-orphan", passive_deletes=True, lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'image': self.image,
            'hint': self.hint,
            'location': self.location,
            'type': self.type,
            'contactEmail': self.contactEmail,
            'contactPhone': self.contactPhone,
            'rating': self.rating,
            'reviews': self.reviews,
            'description': self.description,
            'socialLinks': self.socialLinks,
            'metrics': self.metrics,
            'partners': self.partners,
            'details': self.details,
            'focus': self.focus,
            'user_id': self.user_id,
            'created_at': safe_iso(self.created_at),
            'updated_at': safe_iso(self.updated_at)
        }

    def recalculate_rating(self):
        """Recalculate average rating and total review count."""
        raw_reviews = IncubatorReview.query.filter_by(incubator_id=self.id, parent_id=None).all()
        if not raw_reviews:
            self.rating = 0.0
            self.reviews = 0
        else:
            total_rating = sum(r.rating for r in raw_reviews if r.rating is not None)
            self.reviews = len(raw_reviews)
            self.rating = round(total_rating / self.reviews, 1)
        db.session.commit()

class IncubatorReview(db.Model):
    __tablename__ = 'incubator_reviews'

    id = db.Column(db.String(128), primary_key=True, default=lambda: str(uuid.uuid4()))
    incubator_id = db.Column(db.String(128), db.ForeignKey('incubators.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.String(128), db.ForeignKey('users.uid', ondelete='CASCADE'), nullable=False)
    rating = db.Column(db.Float, nullable=True) # None for replies
    comment = db.Column(db.Text, nullable=False)
    parent_id = db.Column(db.String(128), db.ForeignKey('incubator_reviews.id', ondelete='CASCADE'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('incubator_reviews', lazy=True))
    replies = db.relationship('IncubatorReview', backref=db.backref('parent', remote_side=[id]), cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'incubator_id': self.incubator_id,
            'user_id': self.user_id,
            'userName': (f"{self.user.name[0]}****{self.user.name[-2:]}" if self.user and len(self.user.name) >= 3 else (self.user.name if self.user else "Anonymous")),
            'rating': self.rating,
            'comment': self.comment,
            'parent_id': self.parent_id,
            'created_at': safe_iso(self.created_at),
            'replies': [r.to_dict() for r in self.replies]
        }

class Event(db.Model):
    __tablename__ = 'events'

    id = db.Column(db.String(128), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(255), nullable=True)
    visible = db.Column(db.Boolean, default=False)
    register_enabled = db.Column(db.Boolean, default=True)
    phone = db.Column(db.String(20), nullable=True)
    duration_info = db.Column(db.String(100), nullable=True)
    registration_route = db.Column(db.String(255), nullable=True, default='/sif-aignite')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'image_url': self.image_url,
            'visible': self.visible,
            'register_enabled': self.register_enabled,
            'phone': self.phone,
            'duration_info': self.duration_info,
            'registration_route': self.registration_route,
            'created_at': safe_iso(self.created_at),
            'updated_at': safe_iso(self.updated_at)
        }

class TechContact(db.Model):
    __tablename__ = 'tech_contacts'

    id = db.Column(db.Integer, primary_key=True)
    techtransfer_id = db.Column(db.Integer, nullable=False)
    techtransfer_name = db.Column(db.String(255), nullable=False)
    requester_name = db.Column(db.String(255), nullable=False)
    requester_email = db.Column(db.String(255), nullable=False)
    contact_number = db.Column(db.String(20), nullable=True)
    purpose = db.Column(db.Text, nullable=False)
    who = db.Column(db.String(50), nullable=False)
    who_other = db.Column(db.String(100), nullable=True)
    company_name = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'techtransfer_id': self.techtransfer_id,
            'techtransfer_name': self.techtransfer_name,
            'requester_name': self.requester_name,
            'requester_email': self.requester_email,
            'contact_number': self.contact_number,
            'purpose': self.purpose,
            'who': self.who,
            'who_other': self.who_other,
            'company_name': self.company_name,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

