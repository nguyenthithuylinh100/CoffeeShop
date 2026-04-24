from datetime import datetime
from database.db import db


class MemberNotification(db.Model):
    __tablename__ = 'MemberNotification'
    __table_args__ = {'implicit_returning': False}

    notificationID = db.Column('notificationID', db.Integer, primary_key=True, autoincrement=True)
    customerID = db.Column('customerID', db.Integer, db.ForeignKey('Customer.customerID'), nullable=False)
    channel = db.Column('channel', db.String(10), nullable=False, default='InApp')  # InApp | Email | Both
    title = db.Column('title', db.String(150), nullable=False)
    message = db.Column('message', db.String(500), nullable=False)
    status = db.Column('status', db.String(12), nullable=False, default='Sent')      # Sent | Failed | Skipped
    error = db.Column('error', db.String(300), nullable=True)
    createdAt = db.Column('createdAt', db.DateTime, nullable=False, default=datetime.now)

    customer = db.relationship('Customer', backref=db.backref('member_notifications', lazy='dynamic'))

    def to_dict(self):
        return {
            'notification_id': self.notificationID,
            'customer_id': self.customerID,
            'channel': self.channel,
            'title': self.title,
            'message': self.message,
            'status': self.status,
            'error': self.error,
            'created_at': self.createdAt.isoformat() if self.createdAt else None,
        }
