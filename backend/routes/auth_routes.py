from flask import Blueprint, request, jsonify, g
from services import auth_service
from middleware.auth_middleware import require_auth

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Login endpoint
    ---
    tags:
      - Authentication
    parameters:
      - name: body
        in: body
        required: true
        schema:
          id: UserCredentials
          required:
            - username
            - password
          properties:
            username:
              type: string
            password:
              type: string
    responses:
      200:
        description: Successful login
      400:
        description: Missing credentials
      401:
        description: Invalid credentials
    """
    data = request.get_json()

    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password are required'}), 400

    result, err = auth_service.login(
        data['username'],
        data['password']
    )

    if err:
        return jsonify({'error': err}), 401

    return jsonify(result), 200


@auth_bp.route('/me', methods=['GET'])
@require_auth
def me():
    """
    Get current user
    ---
    tags:
      - Authentication
    responses:
      200:
        description: User info
      401:
        description: Unauthorized
    """
    return jsonify({'user': g.user}), 200