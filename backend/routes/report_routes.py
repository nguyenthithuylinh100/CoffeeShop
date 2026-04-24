from flask import Blueprint, request, jsonify, g
from database.db import db
from models.report     import Report
from models.bill       import Bill
from models.order      import Order
from models.order_item import OrderItem
from models.menu_item  import MenuItem
from middleware.auth_middleware import require_roles
from datetime import date, datetime, timedelta
from sqlalchemy import func, extract

report_bp = Blueprint('reports', __name__)


# ─── helper: date range from query params ────────────────────────────────────
def _parse_range():
    raw_from = request.args.get('from')
    raw_to   = request.args.get('to')
    try:
        start = date.fromisoformat(raw_from) if raw_from else date.today().replace(day=1)
        end   = date.fromisoformat(raw_to)   if raw_to   else date.today()
    except ValueError:
        start = date.today().replace(day=1)
        end   = date.today()
    return start, end


# ─── 1. Daily summary (used by dashboard cards) ──────────────────────────────
@report_bp.route('/summary', methods=['GET'])
@require_roles('Manager')
def daily_summary():
    """
    Get daily summary
    ---
    tags:
      - Reports
    security:
      - BearerAuth: []
    responses:
      200:
        description: Daily summary
    """
    today = date.today()
    paid_today = Bill.query.filter(
        Bill.status == 'Paid',
        db.cast(Bill.paymentDate, db.Date) == today,
    ).all()
    orders_today = Order.query.filter(
        db.cast(Order.orderDate, db.Date) == today
    ).count()
    return jsonify({
        'date':             today.isoformat(),
        'revenue_today':    sum(float(b.amount) for b in paid_today),
        'bills_paid_today': len(paid_today),
        'orders_today':     orders_today,
    }), 200


# ─── 2. Revenue by day (chart data) ──────────────────────────────────────────
@report_bp.route('/revenue/daily', methods=['GET'])
@require_roles('Manager')
def revenue_daily():
    """
    Get daily revenue
    ---
    tags:
      - Reports
    security:
      - BearerAuth: []
    responses:
      200:
        description: Daily revenue
    """
    start, end = _parse_range()
    rows = (
        db.session.query(
            db.cast(Bill.paymentDate, db.Date).label('day'),
            func.sum(Bill.amount).label('revenue'),
            func.count(Bill.billID).label('bills'),
        )
        .filter(
            Bill.status == 'Paid',
            db.cast(Bill.paymentDate, db.Date) >= start,
            db.cast(Bill.paymentDate, db.Date) <= end,
        )
        .group_by(db.cast(Bill.paymentDate, db.Date))
        .order_by(db.cast(Bill.paymentDate, db.Date))
        .all()
    )
    return jsonify([
        {'day': str(r.day), 'revenue': float(r.revenue or 0), 'bills': int(r.bills)}
        for r in rows
    ]), 200


# ─── 3. Revenue by hour (peak time) ──────────────────────────────────────────
@report_bp.route('/revenue/hourly', methods=['GET'])
@require_roles('Manager')
def revenue_hourly():
    """
    Get hourly revenue
    ---
    tags:
      - Reports
    security:
      - BearerAuth: []
    responses:
      200:
        description: Hourly revenue
    """
    start, end = _parse_range()
    # Dùng extract() — SQLAlchemy map sang DATEPART trên SQL Server; tránh DATEPART(db.text(...)) lỗi cú pháp
    hour_expr = extract('hour', Order.orderDate)
    rows = (
        db.session.query(
            hour_expr.label('hour'),
            func.count(Order.orderID).label('orders'),
        )
        .filter(
            db.cast(Order.orderDate, db.Date) >= start,
            db.cast(Order.orderDate, db.Date) <= end,
        )
        .group_by(hour_expr)
        .order_by(hour_expr)
        .all()
    )
    # Fill gaps so chart always shows 7–22 (giờ mở quán)
    hour_map = {int(r.hour): int(r.orders) for r in rows}
    return jsonify([
        {'hour': h, 'label': f'{h:02d}:00', 'orders': hour_map.get(h, 0)}
        for h in range(7, 23)
    ]), 200


# ─── 4. Top selling items ─────────────────────────────────────────────────────
@report_bp.route('/top-items', methods=['GET'])
@require_roles('Manager')
def top_items():
    """
    Get top selling items
    ---
    tags:
      - Reports
    security:
      - BearerAuth: []
    responses:
      200:
        description: Top selling items
    """
    start, end = _parse_range()
    limit = int(request.args.get('limit', 10))
    rows = (
        db.session.query(
            MenuItem.nameMenuItem.label('name'),
            MenuItem.category.label('category'),
            func.sum(OrderItem.quantity).label('qty_sold'),
            func.sum(OrderItem.quantity * OrderItem.price).label('revenue'),
        )
        .join(OrderItem, OrderItem.menuItemID == MenuItem.menuItemID)
        .join(Order,     Order.orderID     == OrderItem.orderID)
        .filter(
            db.cast(Order.orderDate, db.Date) >= start,
            db.cast(Order.orderDate, db.Date) <= end,
        )
        .group_by(MenuItem.menuItemID, MenuItem.nameMenuItem, MenuItem.category)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(limit)
        .all()
    )
    return jsonify([
        {
            'name':     r.name,
            'category': r.category,
            'qty_sold': int(r.qty_sold or 0),
            'revenue':  float(r.revenue or 0),
        }
        for r in rows
    ]), 200


# ─── 5. Revenue by category ───────────────────────────────────────────────────
@report_bp.route('/revenue/category', methods=['GET'])
@require_roles('Manager')
def revenue_by_category():
    """
    Get revenue by category
    ---
    tags:
      - Reports
    security:
      - BearerAuth: []
    responses:
      200:
        description: Revenue by category
    """
    start, end = _parse_range()
    rows = (
        db.session.query(
            MenuItem.category.label('category'),
            func.sum(OrderItem.quantity).label('qty_sold'),
            func.sum(OrderItem.quantity * OrderItem.price).label('revenue'),
        )
        .join(OrderItem, OrderItem.menuItemID == MenuItem.menuItemID)
        .join(Order,     Order.orderID     == OrderItem.orderID)
        .filter(
            db.cast(Order.orderDate, db.Date) >= start,
            db.cast(Order.orderDate, db.Date) <= end,
        )
        .group_by(MenuItem.category)
        .order_by(func.sum(OrderItem.quantity * OrderItem.price).desc())
        .all()
    )
    return jsonify([
        {
            'category': r.category or 'Khác',
            'qty_sold': int(r.qty_sold or 0),
            'revenue':  float(r.revenue or 0),
        }
        for r in rows
    ]), 200


# ─── 6. Saved reports (generate + list) ───────────────────────────────────────
@report_bp.route('', methods=['GET'])
@require_roles('Manager')
def get_reports():
    """
    Get all reports
    ---
    tags:
      - Reports
    security:
      - BearerAuth: []
    responses:
      200:
        description: List of reports
    """
    reports = Report.query.order_by(Report.createdAt.desc()).all()
    return jsonify([r.to_dict() for r in reports]), 200


@report_bp.route('', methods=['POST'])
@require_roles('Manager')
def generate_report():
    """
    Generate a new report
    ---
    tags:
      - Reports
    security:
      - BearerAuth: []
    responses:
      201:
        description: Report generated
    """
    data = request.get_json()
    if not data or not data.get('period_start') or not data.get('period_end'):
        return jsonify({'error': 'period_start and period_end required'}), 400
    try:
        start = date.fromisoformat(data['period_start'])
        end   = date.fromisoformat(data['period_end'])
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    if start > end:
        return jsonify({'error': 'period_start must be ≤ period_end'}), 400

    employee_id = g.user.get('employee_id') or g.user.get('sub')

    paid_bills   = Bill.query.filter(
        Bill.status == 'Paid',
        db.cast(Bill.paymentDate, db.Date) >= start,
        db.cast(Bill.paymentDate, db.Date) <= end,
    ).all()
    total_revenue = sum(float(b.amount) for b in paid_bills)
    total_orders  = sum(len(b.orders)   for b in paid_bills)

    report = Report(
        typeReport   = data.get('type_report', f'{start} – {end}'),
        fromDate     = start,
        toDate       = end,
        totalRevenue = total_revenue,
        totalOrders  = total_orders,
        generatedBy  = int(employee_id) if employee_id else None,
    )
    db.session.add(report)
    db.session.commit()
    return jsonify(report.to_dict()), 201


@report_bp.route('/<int:report_id>', methods=['DELETE'])
@require_roles('Manager')
def delete_report(report_id):
    """
    Delete a saved report
    ---
    tags:
      - Reports
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: report_id
        required: true
        schema:
          type: integer
    responses:
      200:
        description: Report deleted
      404:
        description: Report not found
    """
    report = Report.query.get(report_id)
    if not report:
        return jsonify({'error': 'Báo cáo không tồn tại'}), 404
    db.session.delete(report)
    db.session.commit()
    return jsonify({'message': 'Đã xoá báo cáo', 'report_id': report_id}), 200
