
from functools import wraps
from flask import request, jsonify
from app.models import User

def token_required(fn):
    """Decorator to ensure a valid APP-SPECIFIC token is present and pass user_id."""
    from .utils import decode_token
    @wraps(fn)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid token'}), 401
        try:
            token = auth_header.split(" ")[1]
            payload = decode_token(token)
            request.user_id = payload['user_id']
            
            # Fetch role reliably
            role = payload.get('role')
            if not role:
                user = User.query.get(request.user_id)
                if user:
                    role = user.role
            request.user_role = role

        except Exception as e:
            return jsonify({'error': 'Invalid token', 'details': str(e)}), 401
        return fn(*args, **kwargs)
    return decorated

def get_current_user_id():
    """Helper function to safely retrieve the user_id from the request object."""
    return getattr(request, 'user_id', None)

def role_required(roles):
    """Decorator to ensure user has one of the required roles from the APP-SPECIFIC token."""
    from .utils import decode_token
    def wrapper(fn):
        @wraps(fn)
        def decorated(*args, **kwargs):
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({'error': 'Missing or invalid token'}), 401
            try:
                token = auth_header.split(" ")[1]
                payload = decode_token(token)
                request.user_id = payload['user_id']
                
                # Fetch role reliably
                role = payload.get('role')
                if not role:
                    from .models import User
                    user = User.query.get(request.user_id)
                    if user:
                        role = user.role
                request.user_role = role
                
                if role not in roles:
                    return jsonify({'error': 'Access denied: insufficient permissions'}), 403
            except Exception as e:
                return jsonify({'error': 'Invalid token', 'details': str(e)}), 401
            return fn(*args, **kwargs)
        return decorated
    return wrapper


def optional_token_required(fn):
    """Decorator to optionally retrieve user_id/role if a token is present."""
    from .utils import decode_token
    from .models import User
    @wraps(fn)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            try:
                token = auth_header.split(" ")[1]
                payload = decode_token(token)
                request.user_id = payload['user_id']
                user = User.query.get(request.user_id)
                if user:
                    request.user_role = user.role
            except Exception:
                pass
        return fn(*args, **kwargs)
    return decorated

