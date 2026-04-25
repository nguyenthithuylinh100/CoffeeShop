from flask import Blueprint, request, jsonify
from database.db import db
from models.menu_item import MenuItem
from models.inventory import MenuItemIngredient, Inventory
from middleware.auth_middleware import require_auth, require_roles

menu_bp = Blueprint('menu', __name__)

@menu_bp.route('', methods=['GET'])
@require_auth
def get_available_menu():
    """
    Get all available menu items
    ---
    tags:
      - Menu
    security:
      - BearerAuth: []
    responses:
      200:
        description: List of available menu items
    """
    items = MenuItem.query.filter_by(isAvailable=True).all()
    return jsonify([i.to_dict() for i in items]), 200

@menu_bp.route('/all', methods=['GET'])
@require_roles('Manager')
def get_all_menu():
    """
    Get all menu items (Managers only)
    ---
    tags:
      - Menu
    security:
      - BearerAuth: []
    responses:
      200:
        description: List of all menu items
      403:
        description: Forbidden (Not a Manager)
    """
    items = MenuItem.query.all()
    return jsonify([i.to_dict() for i in items]), 200

@menu_bp.route('', methods=['POST'])
@require_roles('Manager')
def create_menu_item():
    """
    Create a new menu item
    ---
    tags:
      - Menu
    security:
      - BearerAuth: []
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            name:
              type: string
            price:
              type: number
            category:
              type: string
            is_available:
              type: boolean
    responses:
      201:
        description: Created successfully
      400:
        description: Invalid request
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    if data.get('name') in (None, '') or data.get('price') is None:
        return jsonify({'error': 'name and price are required'}), 400

    item = MenuItem(
        nameMenuItem = data['name'],
        price        = data['price'],
        category     = data.get('category', ''),
        isAvailable  = data.get('is_available', True),
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201

@menu_bp.route('/<int:item_id>', methods=['PUT'])
@require_roles('Manager')
def update_menu_item(item_id):
    """
    Update a menu item
    ---
    tags:
      - Menu
    security:
      - BearerAuth: []
    responses:
      200:
        description: Updated successfully
    """
    item = MenuItem.query.get_or_404(item_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    if 'name'         in data: item.nameMenuItem = data['name']
    if 'price'        in data: item.price        = data['price']
    if 'category'     in data: item.category     = data['category']
    if 'is_available' in data: item.isAvailable  = data['is_available']
    db.session.commit()
    return jsonify(item.to_dict()), 200

@menu_bp.route('/<int:item_id>/ingredients', methods=['GET'])
@require_auth
def get_menu_item_ingredients(item_id):
    """
    Get ingredients for a menu item
    ---
    tags:
      - Menu
    security:
      - BearerAuth: []
    responses:
      200:
        description: List of ingredients for the menu item
      404:
        description: Menu item not found
    """
    item = MenuItem.query.get_or_404(item_id)
    ingredients = [ing.to_dict() for ing in item.ingredients]
    return jsonify({
        'menu_item_id': item.menuItemID,
        'name': item.nameMenuItem,
        'ingredients': ingredients,
    }), 200

@menu_bp.route('/<int:item_id>/ingredients', methods=['PUT'])
@require_roles('Manager')
def set_menu_item_ingredients(item_id):
    """
    Replace all ingredients for a menu item
    ---
    tags:
      - Menu
    security:
      - BearerAuth: []
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            ingredients:
              type: array
              items:
                type: object
                properties:
                  inventory_id:
                    type: integer
                  quantity_used:
                    type: number
    responses:
      200:
        description: Ingredients updated successfully
      400:
        description: Invalid request
      404:
        description: Menu item not found
    """
    item = MenuItem.query.get_or_404(item_id)
    data = request.get_json()
    if data is None:
        return jsonify({'error': 'Request body is required'}), 400

    ingredients = data.get('ingredients', [])

    # Validate each ingredient entry
    for ing in ingredients:
        inv_id = ing.get('inventory_id')
        qty    = ing.get('quantity_used')
        if not inv_id or qty is None:
            return jsonify({'error': 'Mỗi nguyên liệu cần có inventory_id và quantity_used'}), 400
        if float(qty) <= 0:
            return jsonify({'error': f'Số lượng nguyên liệu phải lớn hơn 0 (inventory_id={inv_id})'}), 400
        if not Inventory.query.get(inv_id):
            return jsonify({'error': f'Không tìm thấy nguyên liệu có id={inv_id}'}), 400

    # Replace all existing links
    MenuItemIngredient.query.filter_by(menuItemID=item_id).delete()

    for ing in ingredients:
        db.session.add(MenuItemIngredient(
            menuItemID   = item_id,
            inventoryID  = int(ing['inventory_id']),
            quantityUsed = float(ing['quantity_used']),
        ))

    db.session.commit()

    result = [i.to_dict() for i in item.ingredients]
    return jsonify({'menu_item_id': item_id, 'ingredients': result}), 200

@menu_bp.route('/<int:item_id>', methods=['DELETE'])
@require_roles('Manager')
def delete_menu_item(item_id):
    """
    Delete a menu item
    ---
    tags:
      - Menu
    security:
      - BearerAuth: []
    responses:
      200:
        description: Deleted successfully
    """
    item = MenuItem.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Deleted'}), 200
