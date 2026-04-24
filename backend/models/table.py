from database.db import db

class Table(db.Model):
    __tablename__ = 'cafe_table'        # khop SQL v3

    tableID     = db.Column('tableID',     db.Integer,    primary_key=True, autoincrement=True)
    tableNumber = db.Column('tableNumber', db.Integer,    nullable=False, unique=True)
    status      = db.Column('status',      db.String(20), nullable=False, default='Available')

    bills = db.relationship('Bill', back_populates='table')

    def to_dict(self):
        return {
            'table_id':     self.tableID,
            'table_number': self.tableNumber,
            'status':       self.status,
        }
