from database.db import db
from datetime import datetime


class Customer(db.Model):
    __tablename__ = 'Customer'
    __table_args__ = {'extend_existing': True, 'implicit_returning': False}

    customerID  = db.Column('customerID',  db.Integer,     primary_key=True, autoincrement=True)
    name        = db.Column('name',        db.String(100), nullable=False)
    phone       = db.Column('phone',       db.String(20),  nullable=False, unique=True)
    email       = db.Column('email',       db.String(100), nullable=True)
    points      = db.Column('points',      db.Integer,     nullable=False, default=0)
    memberLevel = db.Column('memberLevel', db.String(10),  nullable=False, default='Normal')

    # Các cột này có thể chưa tồn tại trong DB cũ — dùng nullable=True để SQLAlchemy
    # không yêu cầu chúng khi INSERT, và dùng getattr() khi đọc.
    status      = db.Column('status',      db.String(10),  nullable=True,  default='Active')
    createdAt   = db.Column('createdAt',   db.DateTime,    nullable=True,  default=datetime.now)
    updatedAt   = db.Column('updatedAt',   db.DateTime,    nullable=True,  default=datetime.now, onupdate=datetime.now)

    bills = db.relationship('Bill', back_populates='customer', lazy='dynamic')

    # Quy tắc: 1 điểm / 10.000₫  |  Silver ≥ 50đ  |  Gold ≥ 200đ
    LEVEL_THRESHOLDS = {'Silver': 50, 'Gold': 200}
    POINT_VALUE = 1_000

    def add_points(self, bill_amount: float) -> int:
        """Cộng điểm sau khi thanh toán, tự nâng hạng. Trả về số điểm vừa kiếm."""
        earned = int(float(bill_amount) // 10_000)
        self.points += earned
        self._update_level()
        try:
            self.updatedAt = datetime.now()
        except Exception:
            pass
        return earned

    def redeem_points(self, points_to_redeem: int) -> float:
        """Đổi điểm lấy giảm giá. Trả về số tiền được giảm (VNĐ)."""
        if points_to_redeem > self.points:
            raise ValueError('Số điểm không đủ')
        self.points -= points_to_redeem
        self._update_level()
        try:
            self.updatedAt = datetime.now()
        except Exception:
            pass
        return points_to_redeem * self.POINT_VALUE

    def _update_level(self):
        if self.points >= self.LEVEL_THRESHOLDS['Gold']:
            self.memberLevel = 'Gold'
        elif self.points >= self.LEVEL_THRESHOLDS['Silver']:
            self.memberLevel = 'Silver'
        else:
            self.memberLevel = 'Normal'

    def to_dict(self, include_bills=False):
        created = getattr(self, 'createdAt', None)
        d = {
            'customer_id':  self.customerID,
            'name':         self.name,
            'phone':        self.phone,
            'email':        self.email,
            'points':       self.points or 0,
            'member_level': self.memberLevel or 'Normal',
            'status':       getattr(self, 'status', None) or 'Active',
            'created_at':   created.isoformat() if created else None,
        }
        if include_bills:
            try:
                bills_list = []
                for b in self.bills.order_by(db.text('paymentDate DESC')).limit(10).all():
                    bills_list.append({
                        'bill_id':      b.billID,
                        'amount':       float(b.amount),
                        'payment_date': b.paymentDate.isoformat() if b.paymentDate else None,
                        'items_count':  sum(len(o.items) for o in b.orders),
                    })
                d['bills'] = bills_list
            except Exception:
                d['bills'] = []
        return d