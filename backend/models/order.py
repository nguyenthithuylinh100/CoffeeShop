from database.db import db
from datetime import datetime

class Order(db.Model):
    __tablename__ = 'cafe_order'        # khop SQL v3

    orderID     = db.Column('orderID',     db.Integer,    primary_key=True, autoincrement=True)
    billID      = db.Column('billID',      db.Integer,    db.ForeignKey('Bill.billID'), nullable=False)
    employeeID  = db.Column('employeeID',  db.Integer,    db.ForeignKey('Employee.employeeID'), nullable=True)
    # Use local server time so cashier/barista screens show expected local timestamps.
    orderDate   = db.Column('orderDate',   db.DateTime,   default=datetime.now)
    status      = db.Column('status',      db.String(10), nullable=False, default='Preparing')

    bill     = db.relationship('Bill',     back_populates='orders')
    employee = db.relationship('Employee', back_populates='orders')
    items    = db.relationship('OrderItem', back_populates='order', cascade='all, delete-orphan')

    def to_dict(self, include_items=False):
        d = {
            'order_id':     self.orderID,
            'bill_id':      self.billID,
            'employee_id':  self.employeeID,
            'status':       self.status,
            'created_at':   self.orderDate.isoformat(),
            'table_number': self.bill.table.tableNumber if self.bill and self.bill.table else None,
        }
        if include_items:
            d['items'] = [i.to_dict() for i in self.items]
        return d
