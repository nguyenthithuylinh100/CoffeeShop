"""
Alert Agent — chạy định kỳ bằng APScheduler, phát hiện bất thường
và lưu cảnh báo vào bộ nhớ (in-memory list, reset khi restart).

Tích hợp vào app.py:
    from agents.alert_agent import init_alert_agent
    init_alert_agent(app)

Frontend poll: GET /ai/alerts  (Manager only)
"""

import os
import json
import logging
import requests
from datetime import datetime, timedelta
from threading import Lock

logger = logging.getLogger(__name__)

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:5000")

# ── In-memory alert store ─────────────────────────────────────────────────────
# Mỗi alert: {id, level, category, title, detail, timestamp, read}
_alerts: list  = []
_lock:   Lock  = Lock()
_alert_id      = 0

ALERT_LEVELS = {"critical": 0, "warning": 1, "info": 2}
MAX_ALERTS = 50   # giữ tối đa 50 alert gần nhất


def _next_id() -> int:
    global _alert_id
    _alert_id += 1
    return _alert_id


def _push(level: str, category: str, title: str, detail: str):
    """Thêm alert mới. Bỏ qua nếu title giống alert gần nhất trong 30 phút."""
    with _lock:
        cutoff = datetime.now() - timedelta(minutes=30)
        recent = [a for a in _alerts if a["title"] == title and
                  datetime.fromisoformat(a["timestamp"]) > cutoff]
        if recent:
            return  # tránh spam cùng một cảnh báo
        _alerts.insert(0, {
            "id":        _next_id(),
            "level":     level,
            "category":  category,
            "title":     title,
            "detail":    detail,
            "timestamp": datetime.now().isoformat(),
            "read":      False,
        })
        # Giữ tối đa MAX_ALERTS
        del _alerts[MAX_ALERTS:]


def get_alerts(unread_only: bool = False) -> list:
    with _lock:
        data = [a.copy() for a in _alerts]
    return [a for a in data if not a["read"]] if unread_only else data


def mark_read(alert_id: int | None = None):
    """Đánh dấu đã đọc. Nếu alert_id=None → đánh dấu tất cả."""
    with _lock:
        for a in _alerts:
            if alert_id is None or a["id"] == alert_id:
                a["read"] = True


def _get(path: str, token: str, params: dict = None):
    try:
        r = requests.get(
            f"{BACKEND_URL}{path}",
            headers={"Authorization": f"Bearer {token}"},
            params=params,
            timeout=8,
        )
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.debug("AlertAgent _get %s: %s", path, e)
        return None


# ── Check functions ───────────────────────────────────────────────────────────

def check_low_stock(token: str):
    """Kiểm tra kho sắp hết → cảnh báo critical."""
    items = _get("/inventory/alerts", token)
    if not items:
        return
    for item in items:
        name = item.get("ingredient_name", "Nguyên liệu")
        qty  = item.get("quantity", 0)
        unit = item.get("unit", "")
        min_qty = item.get("min_quantity", 0)
        _push(
            level    = "critical",
            category = "Kho",
            title    = f"Sắp hết: {name}",
            detail   = f"Còn {qty}{unit} / ngưỡng {min_qty}{unit}. Cần nhập hàng ngay.",
        )


def check_slow_orders(token: str):
    """Phát hiện order chờ pha chế quá 10 phút → cảnh báo."""
    orders = _get("/orders/preparing", token)
    if not orders:
        return
    now = datetime.now()
    for o in orders:
        try:
            created  = datetime.fromisoformat(o.get("created_at", ""))
            wait_min = (now - created).total_seconds() / 60
        except Exception:
            continue
        if wait_min > 10:
            table = o.get("table_number", "?")
            oid   = o.get("order_id", "?")
            _push(
                level    = "warning",
                category = "Vận hành",
                title    = f"Order #{oid} — Bàn {table} chờ lâu",
                detail   = f"Đã chờ {wait_min:.0f} phút (ngưỡng: 10 phút). Kiểm tra Barista.",
            )


def check_unpaid_bills(token: str):
    """Bill chưa thanh toán quá 2 giờ → nhắc nhở."""
    bills = _get("/payment/bills/unpaid", token)
    if not bills:
        return
    now = datetime.now()
    for b in bills:
        try:
            created   = datetime.fromisoformat(b.get("created_at", ""))
            age_hours = (now - created).total_seconds() / 3600
        except Exception:
            continue
        if age_hours > 2:
            table  = b.get("table_number", "?")
            amount = b.get("amount", 0)
            _push(
                level    = "warning",
                category = "Thanh toán",
                title    = f"Bill Bàn {table} chưa thanh toán",
                detail   = f"Số tiền {amount:,.0f}₫ — chưa thanh toán {age_hours:.1f}h.",
            )


def check_daily_revenue(token: str):
    """So sánh doanh thu hôm nay với trung bình 7 ngày. Cảnh báo nếu giảm >25%."""
    from datetime import date, timedelta
    today = date.today().isoformat()
    week  = (date.today() - timedelta(days=7)).isoformat()

    summary = _get("/reports/summary", token)
    history = _get("/reports/revenue/daily", token, {"from": week, "to": today})
    if not summary or not history:
        return

    today_rev   = float(summary.get("revenue_today", 0))
    past_days   = [r for r in history if r.get("day") != today]
    if not past_days:
        return
    avg_rev = sum(float(r.get("revenue", 0)) for r in past_days) / len(past_days)
    if avg_rev <= 0:
        return

    drop_pct = (avg_rev - today_rev) / avg_rev * 100
    if drop_pct >= 25:
        _push(
            level    = "warning",
            category = "Doanh thu",
            title    = f"Doanh thu hôm nay giảm {drop_pct:.0f}%",
            detail   = (
                f"Hôm nay: {today_rev:,.0f}₫ / "
                f"Trung bình 7 ngày: {avg_rev:,.0f}₫. "
                f"Kiểm tra vận hành và khuyến mãi."
            ),
        )


def check_peak_hour(token: str):
    """Thông báo khi vào giờ cao điểm (dựa trên lịch sử 7 ngày)."""
    from datetime import date, timedelta
    week = (date.today() - timedelta(days=7)).isoformat()
    today = date.today().isoformat()
    hourly = _get("/reports/revenue/hourly", token, {"from": week, "to": today})
    if not hourly:
        return
    current_hour = datetime.now().hour
    hour_data = next((h for h in hourly if h.get("hour") == current_hour), None)
    if not hour_data:
        return
    avg_orders = sum(h.get("orders", 0) for h in hourly) / len(hourly) if hourly else 0
    if hour_data.get("orders", 0) >= avg_orders * 1.5:
        _push(
            level    = "info",
            category = "Vận hành",
            title    = f"Giờ cao điểm: {current_hour:02d}:00",
            detail   = (
                f"Khung {current_hour:02d}:00–{current_hour+1:02d}:00 thường có "
                f"{hour_data['orders']} orders (cao hơn TB {avg_orders:.0f}). "
                f"Đảm bảo đủ nhân lực."
            ),
        )


# ── Scheduler bootstrap ───────────────────────────────────────────────────────

def _get_manager_token(app) -> str:
    """
    Lấy JWT token của Manager để Alert Agent gọi APIs nội bộ.
    Dùng tài khoản manager mặc định từ seed data.
    """
    try:
        import bcrypt
        from models.employee import Employee
        with app.app_context():
            mgr = Employee.query.filter_by(role="Manager", status="Active").first()
            if not mgr:
                return ""
        # Gọi /auth/login nội bộ để lấy token
        r = requests.post(
            f"{BACKEND_URL}/auth/login",
            json={"username": mgr.username, "password": "manager123"},
            timeout=5,
        )
        if r.status_code == 200:
            return r.json().get("token", "")
    except Exception as e:
        logger.debug("AlertAgent get_manager_token: %s", e)
    return ""


def _run_all_checks(app):
    """Chạy tất cả checks — gọi từ scheduler."""
    token = _get_manager_token(app)
    if not token:
        logger.debug("AlertAgent: no manager token, skip checks")
        return
    try:
        check_low_stock(token)
        check_slow_orders(token)
        check_unpaid_bills(token)
        check_daily_revenue(token)
        check_peak_hour(token)
        logger.info("AlertAgent: checks done, alerts=%d", len(_alerts))
    except Exception as e:
        logger.exception("AlertAgent run_all_checks error: %s", e)


def init_alert_agent(app):
    """
    Khởi động APScheduler background jobs.
    Gọi 1 lần trong create_app() sau khi app đã init xong.
    """
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.interval import IntervalTrigger

        scheduler = BackgroundScheduler(
            job_defaults={"coalesce": True, "max_instances": 1, "misfire_grace_time": 30}
        )

        # Kho — mỗi 5 phút
        scheduler.add_job(
            lambda: check_low_stock(_get_manager_token(app)),
            trigger=IntervalTrigger(minutes=5),
            id="check_low_stock",
        )
        # Order chờ lâu — mỗi 3 phút
        scheduler.add_job(
            lambda: check_slow_orders(_get_manager_token(app)),
            trigger=IntervalTrigger(minutes=3),
            id="check_slow_orders",
        )
        # Bill chưa thanh toán — mỗi 15 phút
        scheduler.add_job(
            lambda: check_unpaid_bills(_get_manager_token(app)),
            trigger=IntervalTrigger(minutes=15),
            id="check_unpaid_bills",
        )
        # Doanh thu — mỗi 1 giờ
        scheduler.add_job(
            lambda: check_daily_revenue(_get_manager_token(app)),
            trigger=IntervalTrigger(hours=1),
            id="check_daily_revenue",
        )
        # Giờ cao điểm — mỗi 30 phút
        scheduler.add_job(
            lambda: check_peak_hour(_get_manager_token(app)),
            trigger=IntervalTrigger(minutes=30),
            id="check_peak_hour",
        )

        scheduler.start()
        logger.info("AlertAgent scheduler started ✅")

        # Chạy ngay lần đầu (delay 10s để Flask khởi động xong)
        import threading
        def _first_run():
            import time; time.sleep(10)
            _run_all_checks(app)
        threading.Thread(target=_first_run, daemon=True).start()

    except ImportError:
        logger.warning("APScheduler not installed — Alert Agent disabled. Run: pip install apscheduler")
    except Exception as e:
        logger.exception("AlertAgent init error: %s", e)
