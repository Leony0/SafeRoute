from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "mysql+pymysql://user:password@mysqldb:3306/mydb"
#SQLALCHEMY_DATABASE_URL = "mysql+pymysql://user:password@mysql-db/mydb"
#QLALCHEMY_DATABASE_URL = "mysql+pymysql://[ユーザー]:[パスワード]@[ホスト名]/[データベース名]"
engine = create_engine(SQLALCHEMY_DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()