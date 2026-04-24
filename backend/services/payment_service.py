from database.db import db
from models.bill  import Bill
from models.table import Table
from datetime import datetime

def _is_completed(status: str) -> bool:
    return str(status or '').strip().lower() == 'completed'

def _serialize_unpaid_bill(bill: Bill):
    data = bill.to_dict(include_orders=True)
    orders = data.get('orders') or []
    data['orders_status'] = [
        {'order_id': o.get('order_id'), 'status': o.get('status'), 'items': o.get('items') or []}
        for o in orders
    ]
    total = len(data['orders_status'])
    done  = sum(1 for o in data['orders_status'] if _is_completed(o.get('status')))
    data['is_ready'] = total > 0 and done == total
    return data


def get_unpaid_bills():
    bills = Bill.query.filter_by(status='Unpaid').order_by(Bill.createdAt.asc()).all()
    return [_serialize_unpaid_bill(b) for b in bills]


def get_bill_detail(bill_id: int):
    bill = Bill.query.get(bill_id)
    if not bill:
        return None, 'Không tìm thấy bill'
    return bill.to_dict(include_orders=True), None


def get_bill_history(from_date: str, to_date: str):
    try:
        from datetime import date
        start = date.fromisoformat(from_date)
        end   = date.fromisoformat(to_date)
    except ValueError:
        return None, 'Định dạng ngày không hợp lệ (YYYY-MM-DD)'
    bills = (
        Bill.query
        .filter(
            Bill.status == 'Paid',
            db.cast(Bill.paymentDate, db.Date) >= start,
            db.cast(Bill.paymentDate, db.Date) <= end,
        )
        .order_by(Bill.paymentDate.desc())
        .all()
    )
    return [b.to_dict(include_orders=True) for b in bills], None


def preview_redeem(customer_id: int, points_to_redeem: int, bill_amount: float):
    """
    Tính trước kết quả đổi điểm — KHÔNG thay đổi DB.
    Trả về { discount, final_amount, points_used, points_remaining }
    """
    from models.customer import Customer
    if not customer_id or points_to_redeem <= 0:
        return None, 'Dữ liệu không hợp lệ'
    customer = Customer.query.get(customer_id)
    if not customer:
        return None, 'Không tìm thấy hội viên'
    if customer.points < points_to_redeem:
        return None, f'Không đủ điểm (hiện có {customer.points})'

    # Giới hạn: không giảm quá tổng bill
    max_points = int(float(bill_amount) // customer.POINT_VALUE)
    points_used = min(points_to_redeem, max_points)
    discount    = points_used * customer.POINT_VALUE
    return {
        'points_used':       points_used,
        'discount':          discount,
        'final_amount':      max(0, float(bill_amount) - discount),
        'points_remaining':  customer.points - points_used,
    }, None


def process_payment(
    bill_id: int,
    payment_method: str,
    amount_received: float = None,
    customer_id: int = None,
    points_to_redeem: int = 0,       # ← mới: số điểm muốn đổi
):
    """UC5 – Thanh toán bill, hỗ trợ đổi điểm giảm giá."""
    bill = Bill.query.get(bill_id)
    if not bill:
        return None, 'Không tìm thấy bill'
    if bill.status == 'Paid':
        return None, 'Bill này đã được thanh toán'

    incomplete_orders = [o.orderID for o in bill.orders if o.status != 'Completed']
    if incomplete_orders:
        return None, (
            'Chưa thể thanh toán: còn order đang pha chế '
            f"(#{', #'.join(str(i) for i in incomplete_orders)})."
        )

    method_map = {'Cash': 'Cash', 'QR': 'E-wallet', 'Card': 'Card', 'E-wallet': 'E-wallet'}
    bill.method      = method_map.get(payment_method, payment_method)
    bill.paymentDate = datetime.now()

    # Giải phóng bàn
    table = Table.query.get(bill.tableID)
    if table:
        table.status = 'Available'

    original_amount = float(bill.amount)
    discount        = 0.0
    points_used     = 0
    points_earned   = 0
    new_level       = None
    customer        = None

    # ── Xử lý hội viên ──────────────────────────────────────────────
    if customer_id:
        try:
            from models.customer import Customer
            customer = Customer.query.get(customer_id)
            if customer:
                bill.customerID = customer_id

                # Đổi điểm giảm giá
                if points_to_redeem and points_to_redeem > 0:
                    max_pts  = int(original_amount // customer.POINT_VALUE)
                    points_used = min(points_to_redeem, customer.points, max_pts)
                    if points_used > 0:
                        discount = points_used * customer.POINT_VALUE
                        customer.points -= points_used
                        customer._update_level()

                # Tính số tiền thực sau giảm
                final_amount = max(0.0, original_amount - discount)
                bill.amount  = final_amount                  # cập nhật bill

                # Tích điểm trên số tiền thực tế đã thu
                old_level     = customer.memberLevel
                points_earned = customer.add_points(final_amount)
                new_level     = customer.memberLevel

        except Exception as e:
            import logging
            logging.getLogger(__name__).warning('Loyalty error: %s', e)

    final_amount = float(bill.amount)
    bill.status  = 'Paid'

    # Tiền thối (tiền mặt)
    change = 0.0
    if payment_method == 'Cash' and amount_received:
        change = round(float(amount_received) - final_amount, 0)

    try:
        db.session.commit()
        result = bill.to_dict()
        result['original_amount'] = original_amount
        result['discount']        = discount
        result['points_used']     = points_used
        result['change']          = change
        result['points_earned']   = points_earned
        result['new_level']       = new_level
        result['customer_name']   = customer.name if customer else None
        return result, None
    except Exception as e:
        db.session.rollback()
        return None, str(e)


def mark_payment_failed(bill_id: int):
    bill = Bill.query.get(bill_id)
    if not bill or bill.status == 'Paid':
        return None, 'Không hợp lệ'
    bill.status = 'Failed'
    try:
        db.session.commit()
        return bill.to_dict(), None
    except Exception as e:
        db.session.rollback()
        return None, str(e)