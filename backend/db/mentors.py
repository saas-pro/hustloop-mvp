import sys
import os
sys.path.append(os.path.abspath('/root/startup'))

from app import create_app
from app.extensions import db
from app.models import User

app = create_app()

with app.app_context():
    # Query users with non-empty mentor profile fields
    mentors = User.query.filter(
        (User.title.isnot(None)) |
        (User.avatar.isnot(None)) |
        (User.hint.isnot(None)) |
        (User.bio.isnot(None)) |
        (User.hourly_rate.isnot(None)) |
        (User.expertise.isnot(None)) |
        (User.x_url.isnot(None)) |
        (User.linkedin_url.isnot(None))
    ).all()

    for mentor in mentors:
        print(f"UID: {mentor.uid}")
        print(f"Title: {mentor.title}")
        print(f"Bio: {mentor.bio}")
        print(f"Hourly Rate: {mentor.hourly_rate}")
        print(f"Expertise: {mentor.expertise}")
        print("---")
