import jwt
import functools
from flask import request, jsonify, g, current_app


def _decode_token():
    """Decode JWT từ Authorization header, trả về (payload, None) hoặc (None, (msg, code))"""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None, ('Missing or invalid Authorization header', 401)
    token = auth_header[7:]
    try:
        payload = jwt.decode(
            token,
            current_app.config['JWT_SECRET'],
            algorithms=['HS256']
        )
        # Đảm bảo employee_id luôn có trong payload (backward compat)
        if 'employee_id' not in payload:
            sub = payload.get('sub')
            if isinstance(sub, int):
                payload['employee_id'] = sub
            elif isinstance(sub, str) and sub.isdigit():
                payload['employee_id'] = int(sub)
        return payload, None
    except jwt.ExpiredSignatureError:
        return None, ('Token expired', 401)
    except jwt.InvalidTokenError:
        return None, ('Invalid token', 401)


def require_auth(f):
    """Decorator: yêu cầu JWT hợp lệ, gán g.user = payload"""
    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        payload, err = _decode_token()
        if err:
            return jsonify({'error': err[0]}), err[1]
        g.user = payload
        return f(*args, **kwargs)
    return wrapper


def require_roles(*roles):
    """
    Decorator factory: yêu cầu JWT hợp lệ VÀ role phù hợp.
    Không lồng require_auth để tránh double-decode.
    """
    allowed = [r.lower() for r in roles]

    def decorator(f):
        @functools.wraps(f)
        def wrapper(*args, **kwargs):
            # Decode token trực tiếp (không gọi require_auth)
            payload, err = _decode_token()
            if err:
                return jsonify({'error': err[0]}), err[1]
            # Kiểm tra role
            user_role = payload.get('role', '').lower()
            if user_role not in allowed:
                return jsonify({'error': 'Forbidden: insufficient role'}), 403
            g.user = payload
            return f(*args, **kwargs)
        return wrapper
    return decorator
