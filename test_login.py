import requests

res = requests.post("http://127.0.0.1:5000/auth/login", json={"username": "manager", "password": "manager123"})
print(res.status_code, res.json())
