import sys
import os
sys.path.append(os.path.abspath('/root/startup'))

from app import create_app
from app.extensions import db
from app.models import BlogPost  # Adjust if model name is different

app = create_app()

with app.app_context():
    posts = BlogPost.query.limit(10).all()
    for post in posts:
        print(vars(post))  # prints all fields and their values as dict
        if hasattr(post, 'content') and post.content:
            print(f"Content: {post.content[:100]}")
        print('---')
