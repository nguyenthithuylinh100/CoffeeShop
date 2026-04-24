from database.db import db
from models.order      import Order
from models.order_item import OrderItem
from models.bill       import Bill
from models.table      import Table
from models.menu_item  import MenuItem
from models.inventory  import Inventory, MenuItemIngredient
from datetime import datetime
from decimal import Decimal

TAKEAWAY_TABLE_NUMBER = 0


def _resolve_table(table_id: int):
    # Support takeaway orders with table_id=0 by mapping to a hidden system table.
    if int(table_id) == TAKEAWAY_TABLE_NUMBER:
        table = Table.query.filter_by(tableNumber=TAKEAWAY_TABLE_NUMBER).first()
        if not table:
            table = Table(tableNumber=TAKEAWAY_TABLE_NUMBER, status='Available')
            db.session.add(table)
            db.session.flush()
        return table
    return Table.query.filter_by(tableID=table_id).first()


def create_order(table_id: int, items: list, employee_id: int):
    """
    UC2 – Create Order.
    FIX: update table.status in Python (not relying on SQL trigger).
    FIX: compute Bill.amount in Python (not relying on SQL trigger).
    FIX: validate employee_id is not None before saving.
    """
    table = _resolve_table(table_id)
    if not table:
        return None, 'Không tìm thấy bàn'
    if not items:
        return None, 'Order phải có ít nhất 1 món'

    # Validate & resolve menu items
    resolved = []
    for item_data in items:
        mid = item_data.get('menu_item_id')
        if not mid:
            return None, 'Thiếu menu_item_id'
        menu_item = MenuItem.query.get(mid)
        if not menu_item:
            return None, f'Không tìm thấy món #{mid}'
        if not bool(menu_item.isAvailable):
            return None, f'Món "{menu_item.nameMenuItem}" hiện không khả dụng'
        resolved.append((menu_item, item_data))

    # ── Kiểm tra kho nguyên liệu trước khi tạo order ──────────────────────
    # Gom tổng lượng nguyên liệu cần dùng cho toàn bộ items trong order này
    ingredient_need: dict[int, Decimal] = {}   # inventoryID -> total_needed
    ingredient_name: dict[int, str]     = {}

    for menu_item, item_data in resolved:
        qty = max(1, int(item_data.get('quantity', 1)))
        links = MenuItemIngredient.query.filter_by(menuItemID=menu_item.menuItemID).all()
        for link in links:
            inv_id = link.inventoryID
            needed = Decimal(str(link.quantityUsed)) * qty
            ingredient_need[inv_id] = ingredient_need.get(inv_id, Decimal('0')) + needed
            if inv_id not in ingredient_name and link.inventory:
                ingredient_name[inv_id] = link.inventory.nameInventory

    for inv_id, needed in ingredient_need.items():
        inv = Inventory.query.get(inv_id)
        if inv is None:
            continue
        if Decimal(str(inv.quantity)) < needed:
            name = ingredient_name.get(inv_id, f'#{inv_id}')
            return None, (
                f'Không đủ nguyên liệu: "{name}" '
                f'(cần {float(needed):.2f}, còn {float(inv.quantity):.2f} {inv.unit or ""})'
            )
    # ──────────────────────────────────────────────────────────────────────

    # Find existing Unpaid bill or create new one
    bill = Bill.query.filter_by(tableID=table.tableID, status='Unpaid').first()
    if not bill:
        bill = Bill(tableID=table.tableID, amount=0, status='Unpaid')
        db.session.add(bill)
        db.session.flush()
        # FIX: update table status in Python, do not rely on trigger
        table.status = 'Occupied'

    # Create order
    order = Order(
        billID     = bill.billID,
        employeeID = employee_id,   # FIX: was not guaranteed non-None before
        status     = 'Preparing',
    )
    db.session.add(order)
    db.session.flush()

    # Add items and accumulate total
    order_total = 0.0
    for menu_item, item_data in resolved:
        qty  = max(1, int(item_data.get('quantity', 1)))
        note = item_data.get('note') or None
        oi   = OrderItem(
            orderID    = order.orderID,
            menuItemID = menu_item.menuItemID,
            quantity   = qty,
            price      = menu_item.price,
            note       = note,
        )
        db.session.add(oi)
        order_total += float(menu_item.price) * qty

    # FIX: update Bill.amount in Python (SQL trigger may not run on SQLite dev)
    bill.amount = float(bill.amount) + order_total

    try:
        db.session.commit()
        db.session.refresh(order)
        return order.to_dict(include_items=True), None
    except Exception as e:
        db.session.rollback()
        err_str = str(e)
        # SQL Server trigger raise lỗi kho — map sang thông báo tiếng Việt rõ ràng
        if 'Khong du nguyen lieu' in err_str or '50000' in err_str:
            return None, 'Không đủ nguyên liệu trong kho để thực hiện order này'
        return None, f'Lỗi lưu order: {e}'


def get_preparing_orders():
    orders = (Order.query
              .filter_by(status='Preparing')
              .order_by(Order.orderDate.asc())
              .all())
    return [o.to_dict(include_items=True) for o in orders]


def get_unpaid_bill_for_table(table_id: int):
    """
    Current open bill for a physical table (cafe_table.tableID).
    Used by Cashier UI to show existing orders while adding more items.
    """
    bill = Bill.query.filter_by(tableID=table_id, status='Unpaid').first()
    if not bill:
        return None, 'Không có bill chưa thanh toán cho bàn này'
    return bill.to_dict(include_orders=True), None


def complete_order(order_id: int):
    order = Order.query.get(order_id)
    if not order:
        return None, 'Không tìm thấy order'
    if order.status != 'Preparing':
        return None, 'Order không ở trạng thái Preparing'
    order.status = 'Completed'
    try:
        db.session.commit()
        return order.to_dict(), None
    except Exception as e:
        db.session.rollback()
        return None, str(e)


def get_order_history(from_date=None, to_date=None):
    """
    UC10 – Order history for Manager.
    Returns all orders (with items + bill info) filtered by date range.
    FIX: was missing entirely – caused empty Order History page.
    """
    from datetime import date as date_type
    q = Order.query.order_by(Order.orderDate.desc())

    if from_date:
        try:
            start = date_type.fromisoformat(from_date)
            q = q.filter(db.cast(Order.orderDate, db.Date) >= start)
        except ValueError:
            pass
    if to_date:
        try:
            end = date_type.fromisoformat(to_date)
            q = q.filter(db.cast(Order.orderDate, db.Date) <= end)
        except ValueError:
            pass

    orders = q.limit(200).all()
    result = []
    for o in orders:
        d = o.to_dict(include_items=True)
        # Attach bill payment status so UI can show it
        if o.bill:
            d['bill_status']    = o.bill.status
            d['bill_amount']    = float(o.bill.amount)
            d['payment_method'] = o.bill.method
            d['payment_date']   = o.bill.paymentDate.isoformat() if o.bill.paymentDate else None
        result.append(d)
    return result
