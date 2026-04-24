import os
import boto3
from botocore.exceptions import NoCredentialsError, ClientError
from flask import current_app
from werkzeug.utils import secure_filename
import uuid

def get_s3_client():
    """Initializes and returns a boto3 S3 client using environment variables."""
    return boto3.client(
        's3',
        aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
        region_name=os.environ.get('AWS_REGION') or os.environ.get('AWS_DEFAULT_REGION', 'us-east-1')
    )

def upload_to_s3(file_obj, folder="blog_images"):
    """
    Uploads a file object to AWS S3.
    
    Args:
        file_obj: FileStorage object from request.files
        folder: Folder prefix in the S3 bucket
        
    Returns:
        String URL of the uploaded file if successful, None otherwise.
    """
    if not file_obj or not file_obj.filename:
        return None

    bucket_name = os.environ.get('AWS_S3_BUCKET') or os.environ.get('S3_BUCKET_NAME')
    if not bucket_name:
        current_app.logger.error("AWS_S3_BUCKET not configured.")
        return None

    s3_client = get_s3_client()
    
    # Generate a unique filename
    original_filename = secure_filename(file_obj.filename)
    extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else 'bin'
    unique_filename = f"{uuid.uuid4().hex}.{extension}"
    
    s3_key = f"{folder}/{unique_filename}" if folder else unique_filename
    
    try:
        s3_client.upload_fileobj(
            file_obj,
            bucket_name,
            s3_key,
            ExtraArgs={
                "ContentType": file_obj.content_type
            }
        )
        
        region = os.environ.get('AWS_REGION') or os.environ.get('AWS_DEFAULT_REGION', 'us-east-1')
        url = f"https://{bucket_name}.s3.{region}.amazonaws.com/{s3_key}"
        return url
        
    except NoCredentialsError:
        current_app.logger.error("AWS credentials not available.")
        return None
    except ClientError as e:
        current_app.logger.error(f"S3 Upload Error: {e}")
        return None
    except Exception as e:
        current_app.logger.error(f"Unexpected error uploading to S3: {e}")
        return None

def delete_from_s3(image_url):
    """
    Deletes a file from AWS S3 based on its URL.
    
    Args:
        image_url: Full S3 URL of the image to delete
        
    Returns:
        Boolean indicating success or failure.
    """
    if not image_url:
        return False
        
    bucket_name = os.environ.get('AWS_S3_BUCKET') or os.environ.get('S3_BUCKET_NAME')
    if not bucket_name:
        current_app.logger.error("AWS_S3_BUCKET not configured.")
        return False
    try:
        parts = image_url.split('.amazonaws.com/')
        if len(parts) != 2:
            return False
            
        s3_key = parts[1]
        
        s3_client = get_s3_client()
        s3_client.delete_object(Bucket=bucket_name, Key=s3_key)
        return True
        
    except ClientError as e:
        current_app.logger.error(f"S3 Delete Error: {e}")
        return False
    except Exception as e:
        current_app.logger.error(f"Unexpected error deleting from S3: {e}")
        return False
