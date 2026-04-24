from database.db import db

class OrderItem(db.Model):
    __tablename__ = 'order_item'        # khop SQL v3
    __table_args__ = {'implicit_returning': False}

    orderItemID = db.Column('orderItemID', db.Integer,        primary_key=True, autoincrement=True)
    orderID     = db.Column('orderID',     db.Integer,        db.ForeignKey('cafe_order.orderID'), nullable=False)
    menuItemID  = db.Column('menuItemID',  db.Integer,        db.ForeignKey('MenuItem.menuItemID'), nullable=False)
    quantity    = db.Column('quantity',    db.Integer,        nullable=False, default=1)
    price       = db.Column('price',       db.Numeric(10, 0), nullable=False)
    note        = db.Column('note',        db.String(255),    nullable=True)

    order     = db.relationship('Order',    back_populates='items')
    menu_item = db.relationship('MenuItem', back_populates='order_items')

    def to_dict(self):
        return {
            'order_item_id': self.orderItemID,
            'menu_item_id':  self.menuItemID,
            'name':          self.menu_item.nameMenuItem if self.menu_item else None,
            'quantity':      self.quantity,
            'unit_price':    float(self.price),
            'subtotal':      float(self.price) * self.quantity,
            'note':          self.note,
        }
