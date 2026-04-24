from flask import Blueprint, request, jsonify, g, current_app
from services import order_service
from middleware.auth_middleware import require_roles, require_auth

order_bp = Blueprint('orders', __name__)


@order_bp.route('', methods=['POST'])
@require_roles('Cashier')
def create_order():
    """
    Create a new order
    ---
    tags:
      - Orders
    security:
      - BearerAuth: []
    responses:
      201:
        description: Order created successfully
    """
    data = request.get_json(silent=True) or {}
    current_app.logger.info(
        'create_order called: user=%s role=%s table_id=%s items_count=%s',
        g.user.get('username'),
        g.user.get('role'),
        data.get('table_id'),
        len(data.get('items', [])) if isinstance(data.get('items'), list) else 'invalid'
    )

    if not data or data.get('table_id') is None or not data.get('items'):
        current_app.logger.warning(
            'create_order rejected: missing required fields, payload=%s',
            data
        )
        return jsonify({'error': 'table_id and items are required'}), 400

    # FIX: 'sub' field in JWT holds employee_id
    employee_id = g.user.get('employee_id') or g.user.get('sub')
    if not employee_id:
        current_app.logger.warning(
            'create_order rejected: missing employee identity, user_payload=%s',
            g.user
        )
        return jsonify({'error': 'Invalid token: missing employee identity'}), 401

    result, err = order_service.create_order(
        table_id    = data['table_id'],
        items       = data['items'],
        employee_id = int(employee_id),
    )
    if err:
        current_app.logger.error(
            'create_order failed: employee_id=%s table_id=%s error=%s',
            employee_id,
            data.get('table_id'),
            err
        )
        return jsonify({'error': err}), 400
    current_app.logger.info(
        'create_order success: order_id=%s bill_id=%s table_id=%s employee_id=%s',
        result.get('order_id'),
        result.get('bill_id'),
        data.get('table_id'),
        employee_id
    )
    return jsonify(result), 201


@order_bp.route('/preparing', methods=['GET'])
@require_roles('Barista')
def get_preparing():
    """
    Get preparing orders
    ---
    tags:
      - Orders
    security:
      - BearerAuth: []
    responses:
      200:
        description: List of preparing orders
    """
    return jsonify(order_service.get_preparing_orders()), 200


@order_bp.route('/table/<int:table_id>', methods=['GET'])
@require_roles('Cashier')
def unpaid_bill_for_table(table_id):
    """Open Unpaid bill + orders for the selected table (Cashier screen)."""
    data, err = order_service.get_unpaid_bill_for_table(table_id)
    if err:
        return jsonify({'error': err}), 404
    return jsonify(data), 200


@order_bp.route('/<int:order_id>/complete', methods=['PUT'])
@require_roles('Barista')
def complete_order(order_id):
    """
    Complete an order
    ---
    tags:
      - Orders
    security:
      - BearerAuth: []
    responses:
      200:
        description: Order completed successfully
    """
    result, err = order_service.complete_order(order_id)
    if err:
        return jsonify({'error': err}), 400
    return jsonify(result), 200


@order_bp.route('/history', methods=['GET'])
@require_roles('Manager')
def order_history():
    """
    Get order history
    ---
    tags:
      - Orders
    security:
      - BearerAuth: []
    responses:
      200:
        description: Order history
    """
    from_date = request.args.get('from')
    to_date   = request.args.get('to')
    data = order_service.get_order_history(from_date, to_date)
    return jsonify(data), 200


@order_bp.route('/debug/check-create', methods=['POST'])
@require_auth
def debug_check_create_order():
    """
    Debug create order
    ---
    tags:
      - Orders
    security:
      - BearerAuth: []
    responses:
      200:
        description: Debug info
    """
    payload = request.get_json(silent=True) or {}
    role = (g.user.get('role') or '').strip()
    employee_id = g.user.get('employee_id') or g.user.get('sub')
    items = payload.get('items')

    checks = {
        'has_token_user': bool(g.user),
        'is_cashier_role': role.lower() == 'cashier',
        'has_employee_id': bool(employee_id),
        'has_table_id': payload.get('table_id') is not None,
        'items_is_list': isinstance(items, list),
        'items_non_empty': isinstance(items, list) and len(items) > 0,
    }

    # Keep response compact and safe, but enough for debugging.
    return jsonify({
        'ok_to_create_order': all(checks.values()),
        'checks': checks,
        'user_context': {
            'username': g.user.get('username'),
            'role': role,
            'employee_id': str(employee_id) if employee_id is not None else None,
        },
        'payload_preview': {
            'table_id': payload.get('table_id'),
            'items_count': len(items) if isinstance(items, list) else None,
        },
    }), 200
