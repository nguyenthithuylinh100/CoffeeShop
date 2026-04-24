from flask import Blueprint, request, jsonify
from services import customer_service
from services import member_campaign_service
from middleware.auth_middleware import require_roles, require_auth

customer_bp = Blueprint('customers', __name__)


@customer_bp.route('/stats', methods=['GET'])
@require_auth
def customer_stats():
    result, err = customer_service.get_stats()
    if err:
        return jsonify({'error': err}), 500
    return jsonify(result), 200


@customer_bp.route('', methods=['GET'])
@require_auth
def list_customers():
    data = customer_service.search(
        search_query = request.args.get('search'),
        level        = request.args.get('level'),
        status       = request.args.get('status', 'Active'),
    )
    return jsonify(data), 200


@customer_bp.route('', methods=['POST'])
@require_auth
def create_customer():
    d = request.get_json() or {}
    result, err = customer_service.create(
        name  = d.get('name'),
        phone = d.get('phone'),
        email = d.get('email'),
    )
    if err:
        return jsonify({'error': err}), 400
    return jsonify(result), 201


# Dùng query param ?q=<phone> để tránh vấn đề URL encoding với path param
@customer_bp.route('/phone', methods=['GET'])
@require_auth
def get_by_phone():
    phone = request.args.get('q', '').strip()
    if not phone:
        return jsonify({'error': 'Cần tham số q (số điện thoại)'}), 400
    result, err = customer_service.get_by_phone(phone)
    if err:
        return jsonify({'error': err}), 404
    return jsonify(result), 200


@customer_bp.route('/<int:customer_id>', methods=['GET'])
@require_auth
def get_customer(customer_id):
    result, err = customer_service.get_by_id(customer_id)
    if err:
        return jsonify({'error': err}), 404
    return jsonify(result), 200


@customer_bp.route('/<int:customer_id>', methods=['PUT'])
@require_roles('Manager')
def update_customer(customer_id):
    d = request.get_json() or {}
    result, err = customer_service.update(customer_id, d)
    if err:
        return jsonify({'error': err}), 400
    return jsonify(result), 200


@customer_bp.route('/<int:customer_id>', methods=['DELETE'])
@require_roles('Manager')
def deactivate_customer(customer_id):
    result, err = customer_service.deactivate(customer_id)
    if err:
        return jsonify({'error': err}), 400
    return jsonify(result), 200


@customer_bp.route('/<int:customer_id>/add-points', methods=['POST'])
@require_auth
def add_points(customer_id):
    d = request.get_json() or {}
    bill_id = d.get('bill_id')
    if not bill_id:
        return jsonify({'error': 'Cần bill_id'}), 400
    result, err = customer_service.add_points_from_bill(customer_id, bill_id)
    if err:
        return jsonify({'error': err}), 400
    return jsonify(result), 200


@customer_bp.route('/voucher-catalog', methods=['GET'])
@require_roles('Manager')
def voucher_catalog():
    return jsonify(member_campaign_service.get_voucher_catalog()), 200


@customer_bp.route('/campaigns/send-voucher', methods=['POST'])
@require_roles('Manager')
def send_voucher_campaign():
    d = request.get_json() or {}
    level = d.get('member_level')
    note = d.get('note', '')
    send_email = bool(d.get('send_email', True))
    error_limit = int(d.get('error_limit', 3))
    result, err = member_campaign_service.send_voucher_campaign(
        level=level,
        note=note,
        send_email=send_email,
        error_limit=error_limit,
    )
    if err:
        return jsonify({'error': err}), 400
    return jsonify(result), 200


@customer_bp.route('/campaigns/test-email', methods=['POST'])
@require_roles('Manager')
def send_test_email():
    d = request.get_json() or {}
    result, err = member_campaign_service.send_test_email(
        recipient=d.get('recipient_email'),
        subject=d.get('subject', ''),
        message=d.get('message', ''),
    )
    if err:
        return jsonify({'error': err}), 400
    return jsonify(result), 200