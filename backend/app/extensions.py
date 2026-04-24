
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_socketio import SocketIO

# Initialize extensions here to avoid circular imports
db = SQLAlchemy()
migrate = Migrate()
bcrypt = Bcrypt()
socketio = SocketIO(cors_allowed_origins=["https://hustloop.com", "https://www.hustloop.com"],async_mode="eventlet",path="/socket.io")
cors = CORS()
