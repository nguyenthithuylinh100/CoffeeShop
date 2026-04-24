from database.db import db
from datetime import datetime

class Bill(db.Model):
    __tablename__ = 'Bill'              # khop SQL v3
    __table_args__ = {'implicit_returning': False}

    billID      = db.Column('billID',      db.Integer,        primary_key=True, autoincrement=True)
    tableID     = db.Column('tableID',     db.Integer,        db.ForeignKey('cafe_table.tableID'), nullable=False)
    amount      = db.Column('amount',      db.Numeric(12, 0), default=0)
    status      = db.Column('status',      db.String(10),     nullable=False, default='Unpaid')
    method      = db.Column('method',      db.String(10),     nullable=True)
    paymentDate = db.Column('paymentDate', db.DateTime,       nullable=True)
    # Use local server time for consistent UI display in cashier/manager.
    createdAt   = db.Column('createdAt',   db.DateTime,       default=datetime.now)
    customerID  = db.Column('customerID',  db.Integer,        db.ForeignKey('Customer.customerID'), nullable=True)

    table    = db.relationship('Table',    back_populates='bills')
    customer = db.relationship('Customer', back_populates='bills', foreign_keys='Bill.customerID')
    orders = db.relationship('Order', back_populates='bill', cascade='all, delete-orphan')

    def to_dict(self, include_orders=False):
        d = {
            'bill_id':      self.billID,
            'table_id':     self.tableID,
            'table_number': self.table.tableNumber if self.table else None,
            'amount':       float(self.amount),
            'status':       self.status,
            'method':       self.method,
            'payment_date': self.paymentDate.isoformat() if self.paymentDate else None,
            'created_at':   self.createdAt.isoformat(),
            'customer_id':  self.customerID,
        }
        if include_orders:
            d['orders'] = [o.to_dict(include_items=True) for o in self.orders]
        return d
