from flask import Blueprint, request, jsonify
from services import payment_service
from middleware.auth_middleware import require_roles

payment_bp = Blueprint('payment', __name__)


@payment_bp.route('/bills/unpaid', methods=['GET'])
@require_roles('Cashier')
def unpaid_bills():
    """
    Get all unpaid bills
    ---
    tags:
      - Payment
    security:
      - BearerAuth: []
    responses:
      200:
        description: List of unpaid bills
    """
    return jsonify(payment_service.get_unpaid_bills()), 200


@payment_bp.route('/bills/history', methods=['GET'])
@require_roles('Manager')
def bill_history():
    """
    Get bill history
    ---
    tags:
      - Payment
    security:
      - BearerAuth: []
    responses:
      200:
        description: Bill history
    """
    from_date = request.args.get('from')
    to_date   = request.args.get('to')
    if not from_date or not to_date:
        return jsonify({'error': 'Cần tham số from và to'}), 400
    result, err = payment_service.get_bill_history(from_date, to_date)
    if err:
        return jsonify({'error': err}), 400
    return jsonify(result), 200


@payment_bp.route('/bills/<int:bill_id>', methods=['GET'])
@require_roles('Cashier')
def bill_detail(bill_id):
    """
    Get details of a specific bill
    ---
    tags:
      - Payment
    security:
      - BearerAuth: []
    responses:
      200:
        description: Bill details
    """
    result, err = payment_service.get_bill_detail(bill_id)
    if err:
        return jsonify({'error': err}), 404
    return jsonify(result), 200


@payment_bp.route('', methods=['POST'])
@require_roles('Cashier')
def process_payment():
    """
    Process payment for a bill
    ---
    tags:
      - Payment
    security:
      - BearerAuth: []
    responses:
      200:
        description: Payment processed successfully
    """
    data = request.get_json()
    if not data or not data.get('bill_id') or not data.get('payment_method'):
        return jsonify({'error': 'Cần bill_id và payment_method'}), 400

    result, err = payment_service.process_payment(
        bill_id          = data['bill_id'],
        payment_method   = data['payment_method'],
        amount_received  = data.get('amount_received'),
        customer_id      = data.get('customer_id'),
        points_to_redeem = int(data.get('points_to_redeem') or 0),
    )
    if err:
        return jsonify({'error': err}), 400
    return jsonify(result), 200


@payment_bp.route('/bills/<int:bill_id>/failed', methods=['PUT'])
@require_roles('Cashier')
def mark_failed(bill_id):
    """
    Mark payment as failed
    ---
    tags:
      - Payment
    security:
      - BearerAuth: []
    responses:
      200:
        description: Payment marked as failed
    """
    result, err = payment_service.mark_payment_failed(bill_id)
    if err:
        return jsonify({'error': err}), 400
    return jsonify(result), 200


@payment_bp.route('/preview-redeem', methods=['POST'])
@require_roles('Cashier')
def preview_redeem():
    """
    Tính trước kết quả đổi điểm mà không thay đổi DB.
    Body: { customer_id, points_to_redeem, bill_amount }
    """
    d = request.get_json() or {}
    result, err = payment_service.preview_redeem(
        customer_id      = d.get('customer_id'),
        points_to_redeem = int(d.get('points_to_redeem', 0)),
        bill_amount      = float(d.get('bill_amount', 0)),
    )
    if err:
        return jsonify({'error': err}), 400
    return jsonify(result), 200