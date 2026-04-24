import sys
import os
sys.path.append(os.path.abspath('/root/startup'))

from app import create_app
from app.extensions import db
from app.models import NewsletterSubscriber

app = create_app()

with app.app_context():
    subscribers = NewsletterSubscriber.query.limit(10).all()
    for sub in subscribers:
        print(vars(sub))  # print all fields and values as dict
        print('---')
