#!/bin/bash
# Script khởi động nhanh cho Mac/Linux
# Chạy: chmod +x start.sh && ./start.sh

echo "☕ Coffee Shop Management System"
echo "================================"

# Backend
echo ""
echo "▶ Khởi động Backend..."
cd backend
python -m venv venv 2>/dev/null
source venv/bin/activate
pip install -r requirements.txt -q
python seed.py
python app.py &
BACKEND_PID=$!
echo "✅ Backend đang chạy (PID: $BACKEND_PID)"

# Frontend
echo ""
echo "▶ Khởi động Frontend..."
cd ../frontend
npm install -q
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend đang chạy (PID: $FRONTEND_PID)"

echo ""
echo "🚀 Ứng dụng đang chạy tại: http://localhost:3000"
echo ""
echo "Tài khoản demo:"
echo "  Manager  → manager / manager123"
echo "  Cashier  → cashier / cashier123"
echo "  Barista  → barista / barista123"
echo ""
echo "Nhấn Ctrl+C để dừng..."
wait
