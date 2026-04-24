from flask import Blueprint, request, jsonify
from services import inventory_service
from middleware.auth_middleware import require_roles

inventory_bp = Blueprint('inventory', __name__)

@inventory_bp.route('', methods=['GET'])
@require_roles('Manager')
def get_inventory():
    """
    Get all inventory items
    ---
    tags:
      - Inventory
    security:
      - BearerAuth: []
    responses:
      200:
        description: List of inventory items
    """
    return jsonify(inventory_service.get_all_inventory()), 200

@inventory_bp.route('/alerts', methods=['GET'])
@require_roles('Manager')
def low_stock_alerts():
    """
    Get low stock alerts
    ---
    tags:
      - Inventory
    security:
      - BearerAuth: []
    responses:
      200:
        description: List of low stock alerts
    """
    return jsonify(inventory_service.get_low_stock_alerts()), 200

@inventory_bp.route('', methods=['POST'])
@require_roles('Manager')
def create_inventory():
    """
    Create a new inventory item
    ---
    tags:
      - Inventory
    security:
      - BearerAuth: []
    responses:
      201:
        description: Created successfully
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    if data.get('ingredient_name') in (None, '') or data.get('quantity') is None:
        return jsonify({'error': 'ingredient_name and quantity are required'}), 400

    result, err = inventory_service.create_inventory(
        ingredient_name=data['ingredient_name'],
        quantity=data['quantity'],
        unit=data.get('unit', ''),
        min_quantity=data.get('min_quantity', 0),
    )
    if err:
        return jsonify({'error': err}), 400
    return jsonify(result), 201

@inventory_bp.route('/<int:inventory_id>', methods=['PUT'])
@require_roles('Manager')
def update_inventory(inventory_id):
    """
    Update an inventory item's stock
    ---
    tags:
      - Inventory
    security:
      - BearerAuth: []
    responses:
      200:
        description: Updated successfully
    """
    data = request.get_json()
    if not data or data.get('quantity') is None:
        return jsonify({'error': 'quantity is required'}), 400

    result, err = inventory_service.update_inventory(inventory_id, data['quantity'])
    if err:
        return jsonify({'error': err}), 400
    return jsonify(result), 200


@inventory_bp.route('/transactions', methods=['GET'])
@require_roles('Manager')
def inventory_transactions():
    limit = int(request.args.get('limit', 100))
    return jsonify(inventory_service.get_inventory_transactions(limit=limit)), 200


@inventory_bp.route('/suppliers', methods=['GET'])
@require_roles('Manager')
def list_suppliers():
    active_only = request.args.get('active') == '1'
    return jsonify(inventory_service.get_suppliers(active_only=active_only)), 200


@inventory_bp.route('/suppliers', methods=['POST'])
@require_roles('Manager')
def create_supplier():
    data = request.get_json() or {}
    result, err = inventory_service.create_supplier(
        supplier_name=data.get('supplier_name'),
        phone=data.get('phone', ''),
        email=data.get('email', ''),
        address=data.get('address', ''),
    )
    if err:
        return jsonify({'error': err}), 400
    return jsonify(result), 201


@inventory_bp.route('/suppliers/<int:supplier_id>', methods=['PUT'])
@require_roles('Manager')
def update_supplier(supplier_id):
    data = request.get_json() or {}
    result, err = inventory_service.update_supplier(supplier_id, data)
    if err:
        return jsonify({'error': err}), 400
    return jsonify(result), 200


@inventory_bp.route('/suppliers/<int:supplier_id>', methods=['DELETE'])
@require_roles('Manager')
def delete_supplier(supplier_id):
    result, err = inventory_service.delete_supplier(supplier_id)
    if err:
        return jsonify({'error': err}), 400
    return jsonify(result), 200


@inventory_bp.route('/suppliers/<int:supplier_id>/transactions', methods=['GET'])
@require_roles('Manager')
def supplier_transactions(supplier_id):
    limit = int(request.args.get('limit', 100))
    result, err = inventory_service.get_supplier_transactions(supplier_id, limit=limit)
    if err:
        return jsonify({'error': err}), 400
    return jsonify(result), 200


@inventory_bp.route('/suppliers/<int:supplier_id>/transactions', methods=['POST'])
@require_roles('Manager')
def create_supplier_transaction(supplier_id):
    data = request.get_json() or {}
    if not data.get('inventory_id') or data.get('quantity') is None:
        return jsonify({'error': 'inventory_id and quantity are required'}), 400
    result, err = inventory_service.create_supplier_transaction(
        supplier_id=supplier_id,
        inventory_id=int(data['inventory_id']),
        quantity=float(data['quantity']),
        note=data.get('note', ''),
    )
    if err:
        return jsonify({'error': err}), 400
    return jsonify(result), 201


