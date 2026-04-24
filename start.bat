@echo off
echo ==============================
echo   Coffee Shop Management
echo ==============================
echo.

echo [1/4] Cai dat Backend...
cd backend
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
python seed.py
echo.

echo [2/4] Khoi dong Flask (port 5000)...
start "Flask Backend" cmd /k "venv\Scripts\activate && python app.py"
timeout /t 3 /nobreak >nul

echo [3/4] Cai dat Frontend...
cd ..\frontend
npm install
echo.

echo [4/4] Khoi dong React (port 3000)...
start "React Frontend" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Ung dung dang chay!
echo   Truy cap: http://localhost:3000
echo ========================================
echo.
echo   manager / manager123
echo   cashier / cashier123
echo   barista / barista123
echo.
pause
