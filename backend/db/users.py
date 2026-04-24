import sys
import os
sys.path.append(os.path.abspath('/root/startup'))

from app import create_app
from app.extensions import db
from app.models import User

app = create_app()

with app.app_context():
    users = User.query.all()
    for user in users:
        print(f"UID: {user.uid}, Email: {user.email}, Role: {user.role}, Created At: {user.created_at}")
