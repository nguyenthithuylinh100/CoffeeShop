from flask import Blueprint, request, jsonify, g
from services import employee_service
from middleware.auth_middleware import require_roles
 
employee_bp = Blueprint('employees', __name__)
 
 
@employee_bp.route('', methods=['GET'])
@require_roles('Manager')
def list_employees():
    data = employee_service.get_all(
        search=request.args.get('search'),
        role=request.args.get('role'),
        status=request.args.get('status', 'Active')
    )
    return jsonify(data), 200
 
 
@employee_bp.route('/<int:emp_id>', methods=['GET'])
@require_roles('Manager')
def get_employee(emp_id):
    result, err = employee_service.get_by_id(emp_id)
    if err:
        return jsonify({'error': err}), 404
    return jsonify(result), 200
 
 
@employee_bp.route('', methods=['POST'])
@require_roles('Manager')
def create_employee():
    d = request.get_json() or {}
    required = ['name', 'username', 'password', 'role']
    if not all(k in d for k in required):
        return jsonify({'error': 'Thiếu trường bắt buộc: name, username, password, role'}), 400
    result, err = employee_service.create(
        name=d['name'],
        username=d['username'],
        password=d['password'],
        role=d['role'],
        phone=d.get('phone')
    )
    if err:
        return jsonify({'error': err}), 400
    return jsonify(result), 201
 
 
@employee_bp.route('/<int:emp_id>', methods=['PUT'])
@require_roles('Manager')
def update_employee(emp_id):
    d = request.get_json() or {}
    result, err = employee_service.update(emp_id, d, g.user['employee_id'])
    if err:
        return jsonify({'error': err}), 400
    return jsonify(result), 200
 
 
@employee_bp.route('/<int:emp_id>', methods=['DELETE'])
@require_roles('Manager')
def deactivate_employee(emp_id):
    result, err = employee_service.deactivate(emp_id, g.user['employee_id'])
    if err:
        return jsonify({'error': err}), 400
    return jsonify(result), 200
 
 
@employee_bp.route('/<int:emp_id>/reset-password', methods=['PUT'])
@require_roles('Manager')
def reset_password(emp_id):
    result, err = employee_service.reset_password(emp_id)
    if err:
        return jsonify({'error': err}), 404
    return jsonify(result), 200
 