import sqlite3

db_path = '/root/startup/mydatabase.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

for table_name, in tables:
    print(f"Table: {table_name}")
    cursor.execute(f"PRAGMA table_info({table_name});")
    columns = cursor.fetchall()
    for col in columns:
        # col = (cid, name, type, notnull, dflt_value, pk)
        print(f"  Column: {col[1]}, Type: {col[2]}")
    print()

conn.close()
