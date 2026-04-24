"""
Blog Validation Schemas
Marshmallow schemas for validating blog API requests.
"""

from marshmallow import Schema, fields, ValidationError


def validate_tags_format(value):
    """Validate tags format (comma-separated)."""
    if value:
        tags = [tag.strip() for tag in value.split(',')]
        if len(tags) > 10:
            raise ValidationError('Maximum 10 tags allowed')
        for tag in tags:
            if len(tag) > 30:
                raise ValidationError('Each tag must be 30 characters or less')


def validate_optional_url(value):
    """Validate URL but allow empty strings (treat as None)."""
    if not value or value.strip() == '':
        return True
    # Basic URL validation
    if not (value.startswith('http://') or value.startswith('https://')):
        raise ValidationError('URL must start with http:// or https://')
    return True


class CreateBlogSchema(Schema):
    """Schema for creating a new blog post."""
    title = fields.Str(
        required=True,
        validate=lambda x: 5 <= len(x) <= 300,
        error_messages={'required': 'Title is required'}
    )
    excerpt = fields.Str(
        required=False,
        allow_none=True,
        validate=lambda x: not x or (10 <= len(x) <= 500)
    )
    content = fields.Str(
        required=True,
        validate=lambda x: 50 <= len(x) <= 15000,
        error_messages={'required': 'Content is required'}
    )
    featured_image_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    youtube_embed_url = fields.Str(required=True, allow_none=False, validate=validate_optional_url)
    website_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    instagram_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    linkedin_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    x_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    youtube_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    meta_title = fields.Str(

        required=False,
        allow_none=True,
        validate=lambda x: not x or len(x) <= 60
    )
    meta_description = fields.Str(
        required=False,
        allow_none=True,
        validate=lambda x: not x or len(x) <= 160
    )
    tags = fields.Str(required=False, allow_none=True, validate=validate_tags_format)


class UpdateBlogSchema(Schema):

    """Schema for updating a blog post (all fields optional)."""
    title = fields.Str(
        required=False,
        validate=lambda x: 5 <= len(x) <= 300
    )
    excerpt = fields.Str(
        required=False,
        allow_none=True,
        validate=lambda x: not x or (10 <= len(x) <= 500)
    )
    content = fields.Str(
        required=False,
        validate=lambda x: 50 <= len(x) <= 15000
    )
    featured_image_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    youtube_embed_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    website_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    instagram_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    linkedin_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    x_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    youtube_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    meta_title = fields.Str(
        required=False,
        allow_none=True,
        validate=lambda x: not x or len(x) <= 60
    )
    meta_description = fields.Str(
        required=False,
        allow_none=True,
    )
    tags = fields.Str(required=False, allow_none=True, validate=validate_tags_format)


class DraftBlogSchema(Schema):
    """Schema for creating a blog post as a draft (highly relaxed validation)."""
    title = fields.Str(
        required=True,
        validate=lambda x: 1 <= len(x) <= 300,
        error_messages={'required': 'Title is required even for drafts'}
    )
    excerpt = fields.Str(required=False, allow_none=True)
    content = fields.Str(required=False, allow_none=True)
    featured_image_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    youtube_embed_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    website_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    instagram_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    linkedin_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    x_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    youtube_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    meta_title = fields.Str(required=False, allow_none=True)
    meta_description = fields.Str(required=False, allow_none=True)
    tags = fields.Str(required=False, allow_none=True)


class UpdateDraftBlogSchema(Schema):
    """Schema for updating a draft blog post (all fields highly relaxed)."""
    title = fields.Str(required=False, validate=lambda x: not x or len(x) <= 300)
    excerpt = fields.Str(required=False, allow_none=True)
    content = fields.Str(required=False, allow_none=True)
    featured_image_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    youtube_embed_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    website_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    instagram_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    linkedin_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    x_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    youtube_url = fields.Str(required=False, allow_none=True, validate=validate_optional_url)
    meta_title = fields.Str(required=False, allow_none=True)
    meta_description = fields.Str(required=False, allow_none=True)
    tags = fields.Str(required=False, allow_none=True)
