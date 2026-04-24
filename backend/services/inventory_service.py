from database.db import db
from models.inventory import Inventory, InventoryTransaction, Supplier
from datetime import datetime


def get_all_inventory():
    return [i.to_dict() for i in Inventory.query.all()]


def update_inventory(inventory_id: int, quantity: float):
    """UC9 – Manager nhap them kho. Trigger SQL tu dong bat lai isAvailable."""
    inv = Inventory.query.get(inventory_id)
    if not inv:
        return None, 'Inventory item not found'
    inv.quantity  = quantity
    inv.updatedAt = datetime.utcnow()
    db.session.add(
        InventoryTransaction(
            inventoryID=inv.inventoryID,
            type='ADJUST',
            quantity=quantity,
            note='Dieu chinh ton kho truc tiep',
        )
    )
    try:
        db.session.commit()
        return inv.to_dict(), None
    except Exception as e:
        db.session.rollback()
        return None, str(e)


def create_inventory(ingredient_name, quantity, unit, min_quantity):
    inv = Inventory(
        nameInventory = ingredient_name,
        quantity      = quantity,
        unit          = unit,
        minQuantity   = min_quantity,
    )
    db.session.add(inv)
    try:
        db.session.commit()
        db.session.add(
            InventoryTransaction(
                inventoryID=inv.inventoryID,
                type='IN',
                quantity=quantity,
                note='Nhap ton dau ky',
            )
        )
        db.session.commit()
        return inv.to_dict(), None
    except Exception as e:
        db.session.rollback()
        return None, str(e)


def get_low_stock_alerts():
    items = Inventory.query.all()
    return [i.to_dict() for i in items if float(i.quantity) <= float(i.minQuantity)]


def get_inventory_transactions(limit: int = 100):
    q = InventoryTransaction.query.order_by(InventoryTransaction.createdAt.desc())
    rows = q.limit(max(1, min(limit, 500))).all()
    return [r.to_dict() for r in rows]


def create_supplier(supplier_name, phone='', email='', address=''):
    name = (supplier_name or '').strip()
    if not name:
        return None, 'supplier_name is required'
    sup = Supplier(
        supplierName=name,
        phone=(phone or '').strip() or None,
        email=(email or '').strip() or None,
        address=(address or '').strip() or None,
        status='Active',
    )
    db.session.add(sup)
    try:
        db.session.commit()
        return sup.to_dict(), None
    except Exception as e:
        db.session.rollback()
        return None, str(e)


def get_suppliers(active_only: bool = False):
    q = Supplier.query
    if active_only:
        q = q.filter_by(status='Active')
    return [s.to_dict() for s in q.order_by(Supplier.createdAt.desc()).all()]


def update_supplier(supplier_id: int, data: dict):
    sup = Supplier.query.get(supplier_id)
    if not sup:
        return None, 'Supplier not found'
    if 'supplier_name' in data and str(data.get('supplier_name') or '').strip():
        sup.supplierName = str(data['supplier_name']).strip()
    if 'phone' in data:
        sup.phone = (data.get('phone') or '').strip() or None
    if 'email' in data:
        sup.email = (data.get('email') or '').strip() or None
    if 'address' in data:
        sup.address = (data.get('address') or '').strip() or None
    if 'status' in data and data['status'] in ('Active', 'Inactive'):
        sup.status = data['status']
    try:
        db.session.commit()
        return sup.to_dict(), None
    except Exception as e:
        db.session.rollback()
        return None, str(e)


def delete_supplier(supplier_id: int):
    sup = Supplier.query.get(supplier_id)
    if not sup:
        return None, 'Supplier not found'
    sup.status = 'Inactive'
    try:
        db.session.commit()
        return sup.to_dict(), None
    except Exception as e:
        db.session.rollback()
        return None, str(e)


def get_supplier_transactions(supplier_id: int, limit: int = 100):
    sup = Supplier.query.get(supplier_id)
    if not sup:
        return None, 'Supplier not found'
    q = (
        InventoryTransaction.query
        .filter_by(supplierID=supplier_id)
        .order_by(InventoryTransaction.createdAt.desc())
    )
    rows = q.limit(max(1, min(limit, 500))).all()
    return [r.to_dict() for r in rows], None


def create_supplier_transaction(supplier_id: int, inventory_id: int, quantity: float, note: str = ''):
    sup = Supplier.query.get(supplier_id)
    if not sup:
        return None, 'Supplier not found'
    if sup.status != 'Active':
        return None, 'Supplier is inactive'

    inv = Inventory.query.get(inventory_id)
    if not inv:
        return None, 'Inventory item not found'

    qty = float(quantity)
    if qty <= 0:
        return None, 'quantity must be > 0'

    inv.quantity = float(inv.quantity) + qty
    inv.updatedAt = datetime.utcnow()

    tx = InventoryTransaction(
        inventoryID=inv.inventoryID,
        type='IN',
        quantity=qty,
        supplierID=supplier_id,
        note=(note or '').strip() or 'Nhap kho tu nha cung cap',
    )
    db.session.add(tx)
    try:
        db.session.commit()
        return tx.to_dict(), None
    except Exception as e:
        db.session.rollback()
        return None, str(e)
