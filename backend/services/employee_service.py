import bcrypt
import secrets
import string
from database.db import db
from models.employee import Employee
 
VALID_ROLES = {'Cashier', 'Barista', 'Manager'}
 
 
def get_all(search=None, role=None, status='Active'):
    q = Employee.query
    if status:
        q = q.filter_by(status=status)
    if role:
        q = q.filter_by(role=role)
    if search:
        q = q.filter(Employee.name.ilike(f'%{search}%'))
    return [e.to_dict() for e in q.order_by(Employee.createdAt.desc()).all()]
 
 
def get_by_id(emp_id):
    e = Employee.query.get(emp_id)
    return (e.to_dict(), None) if e else (None, 'Không tìm thấy nhân viên')
 
 
def create(name, username, password, role, phone=None):
    if role not in VALID_ROLES:
        return None, f'Role không hợp lệ. Cho phép: {", ".join(VALID_ROLES)}'
    if Employee.query.filter_by(username=username).first():
        return None, f'Username "{username}" đã tồn tại'
    if len(password) < 8:
        return None, 'Mật khẩu tối thiểu 8 ký tự'
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    emp = Employee(
        name=name,
        username=username,
        password_hash=hashed,
        role=role,
        phone=phone,
        status='Active'
    )
    db.session.add(emp)
    try:
        db.session.commit()
        return emp.to_dict(), None
    except Exception as e:
        db.session.rollback()
        return None, str(e)
 
 
def update(emp_id, data, requester_id):
    emp = Employee.query.get(emp_id)
    if not emp:
        return None, 'Không tìm thấy nhân viên'
    if 'name' in data:
        emp.name = data['name']
    if 'phone' in data:
        emp.phone = data['phone']
    if 'role' in data:
        if data['role'] not in VALID_ROLES:
            return None, 'Role không hợp lệ'
        emp.role = data['role']
    if 'status' in data:
        emp.status = data['status']
    try:
        db.session.commit()
        return emp.to_dict(), None
    except Exception as e:
        db.session.rollback()
        return None, str(e)
 
 
def deactivate(emp_id, requester_id):
    if emp_id == requester_id:
        return None, 'Không thể khóa tài khoản đang đăng nhập'
    emp = Employee.query.get(emp_id)
    if not emp:
        return None, 'Không tìm thấy nhân viên'
    emp.status = 'Inactive'
    db.session.commit()
    return {'message': f'Đã khóa tài khoản {emp.username}'}, None
 
 

def reset_password(emp_id):
    emp = Employee.query.get(emp_id)
    if not emp:
        return None, 'Không tìm thấy nhân viên'
    default_pwd = '12345678'
    emp.password_hash = bcrypt.hashpw(default_pwd.encode(), bcrypt.gensalt()).decode()
    db.session.commit()
    return {'temp_password': default_pwd, 'username': emp.username}, None