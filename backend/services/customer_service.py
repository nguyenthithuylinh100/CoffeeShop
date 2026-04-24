from database.db import db
from models.customer import Customer
from models.bill import Bill
from datetime import datetime


# Cột 'status' chưa tồn tại trong DB SQL Server thực tế (chỉ có trong model).
# Mọi filter status phải làm ở Python-side sau khi query, KHÔNG filter ở SQL.

def _is_active(c: Customer) -> bool:
    try:
        return (c.status or 'Active') == 'Active'
    except Exception:
        return True   # nếu cột chưa có thì coi như Active hết


def search(search_query: str = None, level: str = None, status: str = 'Active'):
    q = Customer.query
    if level:
        q = q.filter_by(memberLevel=level)
    if search_query:
        q = q.filter(
            db.or_(
                Customer.name.ilike(f'%{search_query}%'),
                Customer.phone.ilike(f'%{search_query}%'),
            )
        )
    customers = q.order_by(Customer.createdAt.desc()).all()

    # Filter status Python-side
    if status and status != 'all':
        customers = [c for c in customers if _is_active(c) == (status == 'Active')]

    return [c.to_dict() for c in customers]


def get_by_id(customer_id: int):
    c = Customer.query.get(customer_id)
    if not c:
        return None, 'Không tìm thấy khách hàng'
    return c.to_dict(include_bills=True), None


def get_by_phone(phone: str):
    # Chỉ filter theo phone, KHÔNG filter status ở SQL
    c = Customer.query.filter_by(phone=phone.strip()).first()
    if not c:
        return None, 'Chưa có hội viên với số điện thoại này'
    return c.to_dict(), None


def create(name: str, phone: str, email: str = None):
    phone = (phone or '').strip()
    name  = (name  or '').strip()
    if not phone:
        return None, 'Số điện thoại không được trống'
    if not name:
        return None, 'Tên không được trống'
    if Customer.query.filter_by(phone=phone).first():
        return None, f'Số điện thoại {phone} đã được đăng ký'
    c = Customer(name=name, phone=phone, email=email or None)
    db.session.add(c)
    try:
        db.session.commit()
        return c.to_dict(), None
    except Exception as e:
        db.session.rollback()
        return None, str(e)


def update(customer_id: int, data: dict):
    c = Customer.query.get(customer_id)
    if not c:
        return None, 'Không tìm thấy khách hàng'
    if 'name'  in data and data['name']:  c.name  = data['name'].strip()
    if 'email' in data:                   c.email = data['email'] or None
    try:
        c.updatedAt = datetime.now()
    except Exception:
        pass
    try:
        db.session.commit()
        return c.to_dict(), None
    except Exception as e:
        db.session.rollback()
        return None, str(e)


def deactivate(customer_id: int):
    c = Customer.query.get(customer_id)
    if not c:
        return None, 'Không tìm thấy khách hàng'
    try:
        c.status    = 'Inactive'
        c.updatedAt = datetime.now()
    except Exception:
        pass
    try:
        db.session.commit()
        return {'message': f'Đã vô hiệu hóa hồ sơ khách {c.name}'}, None
    except Exception as e:
        db.session.rollback()
        return None, str(e)


def get_stats():
    """Tổng quan hội viên cho ManagerPage dashboard."""
    try:
        all_customers = Customer.query.all()

        total  = len(all_customers)
        gold   = sum(1 for c in all_customers if c.memberLevel == 'Gold')
        silver = sum(1 for c in all_customers if c.memberLevel == 'Silver')
        normal = sum(1 for c in all_customers if c.memberLevel == 'Normal')

        top = sorted(all_customers, key=lambda c: c.points, reverse=True)[:5]

        return {
            'total':  total,
            'gold':   gold,
            'silver': silver,
            'normal': normal,
            'top_members': [c.to_dict() for c in top],
        }, None
    except Exception as e:
        return None, str(e)


def add_points_from_bill(customer_id: int, bill_id: int):
    """Tích điểm thủ công khi liên kết bill với khách."""
    c = Customer.query.get(customer_id)
    if not c:
        return None, 'Không tìm thấy hội viên'
    bill = Bill.query.get(bill_id)
    if not bill:
        return None, 'Không tìm thấy bill'
    if bill.status != 'Paid':
        return None, 'Bill chưa được thanh toán'

    bill.customerID = customer_id
    old_level = c.memberLevel
    earned    = c.add_points(float(bill.amount))
    try:
        db.session.commit()
        return {
            'points_earned': earned,
            'total_points':  c.points,
            'new_level':     c.memberLevel,
            'level_up':      c.memberLevel != old_level,
        }, None
    except Exception as e:
        db.session.rollback()
        return None, str(e)