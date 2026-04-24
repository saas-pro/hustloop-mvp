import sys
import os
sys.path.append(os.path.abspath('/root/startup'))

from app import create_app
from app.extensions import db

app = create_app()

with app.app_context():
    # Loop through all tables bound to db.Model.metadata
    for table_name, table_obj in db.Model.metadata.tables.items():
        print(f"Table: {table_name}")
