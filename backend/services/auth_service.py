import jwt
import bcrypt
from datetime import datetime, timedelta
from flask import current_app
from models.employee import Employee


def login(username: str, password: str):
    # Tìm user
    employee = Employee.query.filter_by(
        username=username.strip(),
        status='Active'
    ).first()

    if not employee:
        return None, 'Invalid username or password'

    # Check password (CHỈ 1 LẦN)
    if not bcrypt.checkpw(
        password.encode('utf-8'),
        employee.password_hash.encode('utf-8')
    ):
        return None, 'Invalid username or password'


    # Tạo JWT
    expiry = datetime.utcnow() + timedelta(
        hours=current_app.config['JWT_EXPIRY_HOURS']
    )

    payload = {
        # RFC 7519: "sub" should be a string.
        'sub': str(employee.employeeID),
        'employee_id': employee.employeeID,
        'username': employee.username,
        'name': employee.name,
        'role': employee.role,
        'exp': expiry,
    }

    token = jwt.encode(
        payload,
        current_app.config['JWT_SECRET'],
        algorithm='HS256'
    )

    return {
        'token': token,
        'employee': employee.to_dict()
    }, None