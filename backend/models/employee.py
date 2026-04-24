from database.db import db
from datetime import datetime

class Employee(db.Model):
    __tablename__ = 'Employee'

    employeeID    = db.Column('employeeID',    db.Integer,     primary_key=True, autoincrement=True)
    name          = db.Column('name',          db.String(100), nullable=False)
    username      = db.Column('username',      db.String(50),  nullable=False, unique=True)
    password_hash = db.Column('password_hash', db.String(255), nullable=False)
    role          = db.Column('role',          db.String(10),  nullable=False)
    phone         = db.Column('phone',         db.String(20),  nullable=True)
    status        = db.Column('status',        db.String(10),  nullable=False, default='Active')
    createdAt     = db.Column('createdAt',     db.DateTime,    default=datetime.utcnow)

    orders  = db.relationship('Order',  back_populates='employee')
    reports = db.relationship('Report', back_populates='employee')

    def to_dict(self):
        return {
            'employee_id': self.employeeID,
            'name':        self.name,
            'username':    self.username,
            'role':        self.role,
            'phone':       self.phone,
            'status':      self.status,
        }
