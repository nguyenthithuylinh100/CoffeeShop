from database.db import db

class MenuItem(db.Model):
    __tablename__ = 'MenuItem'          # khop SQL v3

    menuItemID   = db.Column('menuItemID',   db.Integer,     primary_key=True, autoincrement=True)
    nameMenuItem = db.Column('nameMenuItem', db.String(100), nullable=False)
    price        = db.Column('price',        db.Numeric(10, 0), nullable=False)
    category     = db.Column('category',     db.String(50),  nullable=True)
    isAvailable  = db.Column('isAvailable',  db.Boolean,     nullable=False, default=True)

    order_items = db.relationship('OrderItem', back_populates='menu_item')
    ingredients = db.relationship('MenuItemIngredient', back_populates='menu_item', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'menu_item_id': self.menuItemID,
            'name':         self.nameMenuItem,
            'price':        float(self.price),
            'category':     self.category,
            'is_available': bool(self.isAvailable),
        }
