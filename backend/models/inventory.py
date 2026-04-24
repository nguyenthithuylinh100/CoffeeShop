from database.db import db
from datetime import datetime


class Inventory(db.Model):
    __tablename__ = 'Inventory'         # khop SQL v3

    inventoryID   = db.Column('inventoryID',   db.Integer,        primary_key=True, autoincrement=True)
    nameInventory = db.Column('nameInventory', db.String(100),    nullable=False)
    quantity      = db.Column('quantity',      db.Numeric(10, 2), nullable=False, default=0)
    unit          = db.Column('unit',          db.String(20),     nullable=True)
    minQuantity   = db.Column('minQuantity',   db.Numeric(10, 2), nullable=False, default=0)
    updatedAt     = db.Column('updatedAt',     db.DateTime,       default=datetime.utcnow)

    menu_item_links = db.relationship('MenuItemIngredient', back_populates='inventory')

    def to_dict(self):
        qty = float(self.quantity)
        min_qty = float(self.minQuantity)
        return {
            'inventory_id':    self.inventoryID,
            'ingredient_name': self.nameInventory,
            'quantity':        qty,
            'unit':            self.unit,
            'min_quantity':    min_qty,
            'is_low':          qty <= min_qty,
        }


class MenuItemIngredient(db.Model):
    __tablename__ = 'MenuItemIngredient'  # khop SQL v3

    menuItemID   = db.Column('menuItemID',   db.Integer,        db.ForeignKey('MenuItem.menuItemID'),  primary_key=True)
    inventoryID  = db.Column('inventoryID',  db.Integer,        db.ForeignKey('Inventory.inventoryID'), primary_key=True)
    quantityUsed = db.Column('quantityUsed', db.Numeric(10, 3), nullable=False)

    menu_item = db.relationship('MenuItem',   back_populates='ingredients')
    inventory = db.relationship('Inventory',  back_populates='menu_item_links')

    def to_dict(self):
        return {
            'inventory_id':    self.inventoryID,
            'ingredient_name': self.inventory.nameInventory if self.inventory else None,
            'quantity_used':   float(self.quantityUsed),
            'unit':            self.inventory.unit if self.inventory else None,
        }


class Supplier(db.Model):
    __tablename__ = 'Supplier'
    __table_args__ = {'implicit_returning': False}

    supplierID = db.Column('supplierID', db.Integer, primary_key=True, autoincrement=True)
    supplierName = db.Column('supplierName', db.String(120), nullable=False)
    phone = db.Column('phone', db.String(20), nullable=True)
    email = db.Column('email', db.String(100), nullable=True)
    address = db.Column('address', db.String(255), nullable=True)
    status = db.Column('status', db.String(10), nullable=False, default='Active')
    createdAt = db.Column('createdAt', db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            'supplier_id': self.supplierID,
            'supplier_name': self.supplierName,
            'phone': self.phone,
            'email': self.email,
            'address': self.address,
            'status': self.status,
            'created_at': self.createdAt.isoformat() if self.createdAt else None,
        }


class InventoryTransaction(db.Model):
    __tablename__ = 'InventoryTransaction'
    __table_args__ = {'implicit_returning': False}

    transactionID = db.Column('transactionID', db.Integer, primary_key=True, autoincrement=True)
    inventoryID = db.Column('inventoryID', db.Integer, db.ForeignKey('Inventory.inventoryID'), nullable=False)
    type = db.Column('type', db.String(10), nullable=False)  # IN | OUT | ADJUST
    quantity = db.Column('quantity', db.Numeric(10, 2), nullable=False, default=0)
    note = db.Column('note', db.String(255), nullable=True)
    supplierID = db.Column('supplierID', db.Integer, db.ForeignKey('Supplier.supplierID'), nullable=True)
    createdAt = db.Column('createdAt', db.DateTime, nullable=False, default=datetime.utcnow)

    inventory = db.relationship('Inventory')
    supplier = db.relationship('Supplier')

    def to_dict(self):
        return {
            'transaction_id': self.transactionID,
            'inventory_id': self.inventoryID,
            'ingredient_name': self.inventory.nameInventory if self.inventory else None,
            'type': self.type,
            'quantity': float(self.quantity),
            'unit': self.inventory.unit if self.inventory else None,
            'note': self.note,
            'supplier_id': self.supplierID,
            'supplier_name': self.supplier.supplierName if self.supplier else None,
            'created_at': self.createdAt.isoformat() if self.createdAt else None,
        }


