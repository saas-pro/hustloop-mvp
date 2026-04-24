"""
Blog Service Layer
Handles all blog business logic to keep controllers thin.
"""

from datetime import datetime
from sqlalchemy.orm import joinedload
from sqlalchemy import or_, and_
from app.extensions import db
from app.models import BlogPost, User
from bleach import clean
import re
import threading
from flask import current_app
from app.utils import send_email,blog_email
from app.s3_utils import upload_to_s3, delete_from_s3
import os


# Allowed HTML tags for blog content
ALLOWED_TAGS = [
    'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre',
    'table', 'thead', 'tbody', 'tr', 'th', 'td'
]

ALLOWED_ATTRIBUTES = {
    'a': ['href', 'title', 'target', 'rel'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'code': ['class'],
    'pre': ['class']
}


def sanitize_html(content):
    """Sanitize HTML content to prevent XSS attacks."""
    return clean(
        content,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        strip=True
    )


def generate_unique_slug(title, blog_id=None):
    """
    Generate a unique slug from the title.
    
    Args:
        title: Blog post title
        blog_id: Current blog ID (for updates, to exclude self from uniqueness check)
    
    Returns:
        Unique slug string
    """
    # Convert to lowercase and replace spaces with hyphens
    base_slug = re.sub(r'[^\w\s-]', '', title.lower())
    base_slug = re.sub(r'[-\s]+', '-', base_slug).strip('-')
    
    # Ensure uniqueness
    slug = base_slug
    counter = 1
    while True:
        query = BlogPost.query.filter(BlogPost.slug == slug)
        if blog_id:
            query = query.filter(BlogPost.id != blog_id)
        
        existing = query.first()
        if not existing:
            break
        counter += 1
        slug = f"{base_slug}-{counter}"
    
    return slug


def create_blog(data, author_id, featured_image_file=None):
    """
    Create a new blog post.
    
    Args:
        data: Dictionary containing blog data
        author_id: UID of the author
        featured_image_file: Optional FileStorage object for the image
    
    Returns:
        Created BlogPost object
    """
    # Sanitize content
    sanitized_content = data.get('content', '')
    if sanitized_content:
        sanitized_content = sanitize_html(sanitized_content)
    
    # Generate unique slug
    slug = generate_unique_slug(data['title'])
    
    # Handle Image Upload
    featured_image_url = data.get('featured_image_url')
    if featured_image_file:
        s3_url = upload_to_s3(featured_image_file, folder="blog_images")
        if s3_url:
            featured_image_url = s3_url
    
    # Create blog post
    blog = BlogPost(
        title=data['title'],
        slug=slug,
        excerpt=data.get('excerpt'),
        content=sanitized_content,
        featured_image_url=featured_image_url,
        youtube_embed_url=data.get('youtube_embed_url'),
        website_url=data.get('website_url') or None,
        instagram_url=data.get('instagram_url') or None,
        linkedin_url=data.get('linkedin_url') or None,
        x_url=data.get('x_url') or None,
        youtube_url=data.get('youtube_url') or None,
        meta_title=data.get('meta_title'),
        meta_description=data.get('meta_description'),
        tags=data.get('tags'),
        status='draft',
        author_id=author_id
    )
    
    db.session.add(blog)
    db.session.commit()
    
    return blog


def notify_admins_of_new_blog(app, blog_id, author_name):
    """Asynchronously notify all admins about a new blog post from a blogger."""
    with app.app_context():
        try:
            admins = User.query.filter_by(role='admin').all()
            admin_emails = [admin.email for admin in admins if admin.email]
            
            if not admin_emails:
                return

            blog = BlogPost.query.get(blog_id)
            if not blog:
                return

            frontend_url = os.getenv('FRONTEND_URL', 'https://hustloop.com')
            blog_review_url = f"{frontend_url}/blog/{blog.slug}?login=1"

            subject = f"New Blog Post for Review: {blog.title}"
            content = f"""
                <p>Hello Admin,</p>
                <p>A new blog post has been submitted by blogger <strong>{author_name}</strong> and is ready for your review.</p>
                <p><strong>Title:</strong> {blog.title}</p>
                <p>Click the button below to view the blog and take action (publish or reject) directly from the page:</p>
                <p style="text-align: center; margin: 24px 0;">
                    <a href="{blog_review_url}"
                       style="background-color: #6366f1; color: #ffffff; padding: 12px 28px; border-radius: 8px;
                              text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
                        Review Blog Post
                    </a>
                </p>
                <p>You can also manage all blog posts from the <a href="{frontend_url}/blogger">Blogger Dashboard</a>.</p>
                <p>Best regards,<br>Hustloop System</p>
            """
            
            html_body = blog_email(content)
            sender = ("Hustloop", os.getenv('MAIL_USERNAME'))
            
            send_email(subject, admin_emails, html_body, sender)
            app.logger.info(f"Admin notification sent for blog {blog_id}")
            
        except Exception as e:
            app.logger.error(f"Failed to notify admins of new blog {blog_id}: {str(e)})")


def get_admin_blog_by_slug(slug):
    """
    Fetch a blog post by slug for admin — returns ANY status (draft, pending, rejected, published).
    Raises ValueError if not found.
    """
    blog = (
        BlogPost.query
        .options(joinedload(BlogPost.author))
        .filter(BlogPost.slug == slug, BlogPost.deleted_at == None)
        .first()
    )
    if not blog:
        raise ValueError(f"Blog post not found: {slug}")
    return blog


def update_blog(blog_id, data, author_id, featured_image_file=None):
    """
    Update an existing blog post.
    """
    blog = BlogPost.query.filter_by(id=blog_id, deleted_at=None).first()
    if not blog:
        raise ValueError("Blog post not found")
    
    # Verify author owns the blog (or is admin - handled at route level)
    if blog.author_id != author_id:
        # Check if user is admin
        user = User.query.filter_by(uid=author_id).first()
        if not user or user.role != 'admin':
            raise ValueError("You don't have permission to edit this blog")
    
    # Handle Image Upload
    if featured_image_file:
        s3_url = upload_to_s3(featured_image_file, folder="blog_images")
        if s3_url:
            # Delete old image from S3 if it exists
            if blog.featured_image_url and "amazonaws.com" in blog.featured_image_url:
                delete_from_s3(blog.featured_image_url)
            blog.featured_image_url = s3_url
    elif 'featured_image_url' in data:
        blog.featured_image_url = data['featured_image_url']
    
    # Update fields if provided
    if 'title' in data:
        blog.title = data['title']
        # Regenerate slug if title changed
        blog.slug = generate_unique_slug(data['title'], blog_id)
    
    if 'excerpt' in data:
        blog.excerpt = data['excerpt']
    
    if 'content' in data:
        blog.content = sanitize_html(data['content'])
    
    if 'youtube_embed_url' in data:
        blog.youtube_embed_url = data['youtube_embed_url']

    # Social / website link fields (stored per blog post)
    for field in ['website_url', 'instagram_url', 'linkedin_url', 'x_url', 'youtube_url']:
        if field in data:
            setattr(blog, field, data[field] or None)

    if 'meta_title' in data:
        blog.meta_title = data['meta_title']

    if 'meta_description' in data:
        blog.meta_description = data['meta_description']

    if 'tags' in data:
        blog.tags = data['tags']

    
    blog.updated_at = datetime.utcnow()
    db.session.commit()
    
    return blog


def delete_blog(blog_id, author_id):
    """
    Soft delete a blog post.
    
    Args:
        blog_id: ID of the blog to delete
        author_id: UID of the user making the deletion
    
    Returns:
        True if successful
    
    Raises:
        ValueError: If blog not found or user doesn't have permission
    """
    blog = BlogPost.query.filter_by(id=blog_id, deleted_at=None).first()
    if not blog:
        raise ValueError("Blog post not found")
    
    # Verify permissions
    if blog.author_id != author_id:
        user = User.query.filter_by(uid=author_id).first()
        if not user or user.role != 'admin':
            raise ValueError("You don't have permission to delete this blog")
    
    if blog.featured_image_url:
        delete_from_s3(blog.featured_image_url)
        
    db.session.delete(blog)
    db.session.commit()
    
    return True


def publish_blog(blog_id, author_id):
    """
    Publish a blog post (set status to 'published').
    """
    blog = BlogPost.query.filter_by(id=blog_id, deleted_at=None).first()
    if not blog:
        raise ValueError("Blog post not found")
    
    blog.publish()
    db.session.commit()

    # Notify author
    app = current_app._get_current_object()
    threading.Thread(target=notify_author_of_approval, args=(app, blog.id)).start()
    
    return blog


def unpublish_blog(blog_id, author_id):
    """
    Unpublish a blog post (set status to 'pending_review').
    
    Args:
        blog_id: ID of the blog to unpublish
        author_id: UID of the user making the change
    
    Returns:
        Updated BlogPost object
    """
    blog = BlogPost.query.filter_by(id=blog_id, deleted_at=None).first()
    if not blog:
        raise ValueError("Blog post not found")
    
    blog.unpublish()
    db.session.commit()
    
    return blog


def submit_for_review(blog_id, author_id):
    """
    Submit a blog post for review (set status to 'pending_review').
    """
    blog = BlogPost.query.filter_by(id=blog_id, deleted_at=None).first()
    if not blog:
        raise ValueError("Blog post not found")
        
    if not blog.featured_image_url:
        raise ValueError("A featured image is required before submitting for review.")
    
    # Ownership check
    if blog.author_id != author_id:
        user = User.query.filter_by(uid=author_id).first()
        if not user or user.role != 'admin':
            raise ValueError("You don't have permission to submit this blog")
            
    blog.submit()
    blog.updated_at = datetime.utcnow()
    db.session.commit()

    # Async notification to admins
    app = current_app._get_current_object()
    user = User.query.filter_by(uid=author_id).first()
    threading.Thread(target=notify_admins_of_new_blog, args=(app, blog.id, user.name if user else "A Blogger")).start()
    
    return blog


def reject_blog(blog_id, author_id, reason=None):
    """
    Reject a blog post (set status to 'rejected').
    Only admins should call this.
    """
    blog = BlogPost.query.filter_by(id=blog_id, deleted_at=None).first()
    if not blog:
        raise ValueError("Blog post not found")
        
    blog.reject()
    blog.rejection_reason = reason
    blog.updated_at = datetime.utcnow()
    db.session.commit()

    # Notify author
    app = current_app._get_current_object()
    threading.Thread(target=notify_author_of_rejection, args=(app, blog.id, reason)).start()
    
    return blog

def request_delete_blog(blog_id, author_id):
    """Blogger requests deletion of a blog post."""
    blog = BlogPost.query.filter_by(id=blog_id, deleted_at=None).first()
    if not blog:
        raise ValueError("Blog post not found")
    
    if blog.author_id != author_id:
        user = User.query.filter_by(uid=author_id).first()
        if not user or user.role != 'admin':
            raise ValueError("You don't have permission to request deletion")
            
    blog.delete_request_status = 'pending'
    db.session.commit()
    
    # Notify admins
    app = current_app._get_current_object()
    user = User.query.filter_by(uid=author_id).first()
    threading.Thread(target=notify_admins_of_delete_request, args=(app, blog.id, user.name if user else "A Blogger")).start()
    
    return blog

def process_delete_request(blog_id, admin_id, approve=True):
    """Admin approves or rejects a blog deletion request."""
    blog = BlogPost.query.filter_by(id=blog_id, deleted_at=None).first()
    if not blog:
        raise ValueError("Blog post not found")
        
    if approve:
        if blog.featured_image_url and "amazonaws.com" in blog.featured_image_url:
            delete_from_s3(blog.featured_image_url)
        blog.soft_delete()
        blog.delete_request_status = 'approved'
    else:
        blog.delete_request_status = 'rejected'
        
    db.session.commit()
    return blog


def get_public_blogs(page=1, per_page=10, search=None, tags=None):
    """
    Get published blogs for public viewing.
    
    Args:
        page: Page number (1-indexed)
        per_page: Number of blogs per page
        search: Search query (searches title, excerpt, content)
        tags: Comma-separated tags to filter by
    
    Returns:
        Dictionary with blogs, total count, page, and per_page
    """
    # Base query: only published, non-deleted blogs
    query = BlogPost.query.filter(
        BlogPost.status == 'published',
        BlogPost.deleted_at == None
    ).options(joinedload(BlogPost.author))
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                BlogPost.title.ilike(search_term),
                BlogPost.excerpt.ilike(search_term),
                BlogPost.content.ilike(search_term)
            )
        )
    
    # Apply tag filter
    if tags:
        tag_list = [tag.strip() for tag in tags.split(',')]
        tag_filters = [BlogPost.tags.ilike(f"%{tag}%") for tag in tag_list]
        query = query.filter(or_(*tag_filters))
    
    # Order by newest first
    query = query.order_by(BlogPost.created_at.desc())
    
    # Paginate
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    def _strip_author(d):
        d.pop('author', None)
        d.pop('author_id', None)
        return d

    return {
        'blogs': [_strip_author(blog.to_dict()) for blog in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    }


def get_blog_by_slug(slug):
    """
    Get a single published blog by slug.
    
    Args:
        slug: Blog slug
    
    Returns:
        BlogPost object
    
    Raises:
        ValueError: If blog not found or not published
    """
    blog = BlogPost.query.filter(
        BlogPost.slug == slug,
        BlogPost.status == 'published',
        BlogPost.deleted_at == None
    ).options(joinedload(BlogPost.author)).first()
    
    if not blog:
        raise ValueError("Blog post not found")
    
    return blog


def get_admin_blogs(author_id=None, page=1, per_page=10, status_filter=None, include_deleted=False, search=None, tags=None):
    """
    Get all blogs for admin dashboard (including drafts).
    
    Args:
        author_id: UID of the requesting user. If None or user is admin, returns ALL blogs.
        page: Page number (1-indexed)
        per_page: Number of blogs per page
        status_filter: Filter by status ('draft', 'published', etc.)
        include_deleted: Whether to include soft-deleted blogs
        search: Optional search query (title/excerpt/content)
        tags: Optional comma-separated tags filter
    
    Returns:
        Dictionary with blogs, total count, page, and per_page
    """
    # Base query
    query = BlogPost.query.options(joinedload(BlogPost.author))
    
    # If author_id given and user is NOT admin → restrict to their own blogs
    if author_id is not None:
        user = User.query.filter_by(uid=author_id).first()
        if user and user.role != 'admin':
            query = query.filter(BlogPost.author_id == author_id)
        else:
            # Admin can see all non-drafts and their OWN drafts
            query = query.filter(
                or_(
                    BlogPost.status != 'draft',
                    BlogPost.author_id == author_id
                )
            )
    else:
        # If no author_id context provided, strictly hide ALL drafts
        query = query.filter(BlogPost.status != 'draft')
    
    # Filter by deleted status
    if not include_deleted:
        query = query.filter(BlogPost.deleted_at.is_(None))
    
    # Filter by status
    if status_filter:
        query = query.filter(BlogPost.status == status_filter)
    
    # Search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                BlogPost.title.ilike(search_term),
                BlogPost.excerpt.ilike(search_term),
                BlogPost.content.ilike(search_term)
            )
        )
    
    # Tag filter
    if tags:
        tag_list = [tag.strip() for tag in tags.split(',')]
        tag_filters = [BlogPost.tags.ilike(f"%{tag}%") for tag in tag_list]
        query = query.filter(or_(*tag_filters))
    
    # Order by newest first
    query = query.order_by(BlogPost.created_at.desc())
    
    # Paginate
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return {
        'blogs': [blog.to_dict() for blog in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    }


def get_admin_blog(blog_id):
    """
    Get a single blog for admin (including drafts).
    
    Args:
        blog_id: ID of the blog
    
    Returns:
        BlogPost object
    
    Raises:
        ValueError: If blog not found
    """
    blog = BlogPost.query.filter_by(id=blog_id).options(joinedload(BlogPost.author)).first()
    
    if not blog:
        raise ValueError("Blog post not found")
    
    return blog

def notify_author_of_approval(app, blog_id):
    with app.app_context():
        try:
            blog = BlogPost.query.get(blog_id)
            if not blog or not blog.author or not blog.author.email: return
            subject = f"Your Blog Post has been Approved: {blog.title}"
            content = f"<p>Hello {blog.author.name},</p><p>Great news! Your blog post <strong>{blog.title}</strong> has been approved and published.</p>"
            html_body = blog_email(content)
            send_email(subject, [blog.author.email], html_body, ("Hustloop", os.getenv('MAIL_USERNAME')))
        except Exception as e:
            app.logger.error(f"Failed to notify author of approval {blog_id}: {str(e)}")

def notify_author_of_rejection(app, blog_id, reason):
    with app.app_context():
        try:
            blog = BlogPost.query.get(blog_id)
            if not blog or not blog.author or not blog.author.email: return
            subject = f"Update on Your Blog Post: {blog.title}"
            content = f"<p>Hello {blog.author.name},</p><p>Your blog post <strong>{blog.title}</strong> requires some changes before it can be published.</p><p><strong>Reason:</strong> {reason}</p>"
            html_body = blog_email(content)
            send_email(subject, [blog.author.email], html_body, ("Hustloop", os.getenv('MAIL_USERNAME')))
        except Exception as e:
            app.logger.error(f"Failed to notify author of rejection {blog_id}: {str(e)}")

def get_next_blogs(current_slug, limit=3):
    """
    Get random published blog posts that isn't the current one.
    
    Args:
        current_slug: The slug of the current blog post to exclude
        limit: Number of blogs to return
        
    Returns:
        List of BlogPost objects
    """
    current_blog = BlogPost.query.filter_by(slug=current_slug, deleted_at=None).first()
    if not current_blog:
        return []
        
    next_blogs = BlogPost.query.filter(
        BlogPost.status == 'published',
        BlogPost.deleted_at == None,
        BlogPost.id != current_blog.id
    ).order_by(db.func.random()).limit(limit).all()
    
    return next_blogs


def notify_admins_of_delete_request(app, blog_id, author_name):
    with app.app_context():
        try:
            admins = User.query.filter_by(role='admin').all()
            admin_emails = [a.email for a in admins if a.email]
            if not admin_emails: return
            blog = BlogPost.query.get(blog_id)
            if not blog: return
            subject = f"Blog Deletion Request: {blog.title}"
            content = f"<p>Hello Admin,</p><p>Blogger <strong>{author_name}</strong> has requested to delete their blog post: <strong>{blog.title}</strong>.</p><p>Please review this request in the admin dashboard.</p>"
            html_body = blog_email(content)
            send_email(subject, admin_emails, html_body, ("Hustloop", os.getenv('MAIL_USERNAME')))
        except Exception as e:
            app.logger.error(f"Failed to notify admins of delete request {blog_id}: {str(e)}")
