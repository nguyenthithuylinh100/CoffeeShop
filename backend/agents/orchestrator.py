"""
Multi-Agent AI System — Coffee Shop Management
================================================
5 specialized agents + 1 orchestrator:

  ReportAgent    → /reports/* endpoints
  InventoryAgent → /inventory/* endpoints
  MenuAgent      → /menu/* + /reports/*
  OperationsAgent→ /tables, /orders, /payment
  AlertAgent     → cảnh báo tổng hợp

Cấu hình (file .env hoặc biến môi trường):
  GEMINI_API_KEY  — bắt buộc (lấy tại aistudio.google.com)
  BACKEND_URL     — mặc định http://localhost:5000
"""

import os, json, logging
import requests
from datetime import date, timedelta, datetime
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
BACKEND_URL    = os.environ.get("BACKEND_URL", "http://localhost:5000")
MODEL          = "gemini-flash-latest"

# ── Tool definitions ──────────────────────────────────────────────────────────
TOOLS = [
    types.Tool(function_declarations=[
        # ── Report Agent ─────────────────────────────────────────────
        types.FunctionDeclaration(
            name="get_daily_summary",
            description="Lấy KPI tổng hợp hôm nay: doanh thu, số bill, số order. Dùng khi hỏi hôm nay bán được bao nhiêu.",
            parameters=types.Schema(type=types.Type.OBJECT, properties={}, required=[]),
        ),
        types.FunctionDeclaration(
            name="get_revenue_by_day",
            description="Doanh thu theo từng ngày trong khoảng thời gian. Dùng khi hỏi doanh thu tuần, tháng, so sánh ngày.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "days_back": types.Schema(type=types.Type.INTEGER, description="Số ngày tính ngược từ hôm nay (7=tuần, 30=tháng)"),
                },
                required=["days_back"],
            ),
        ),
        types.FunctionDeclaration(
            name="get_top_selling_items",
            description="Món bán chạy nhất theo số lượng và doanh thu. Dùng khi hỏi món nào bán tốt, top sản phẩm.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "days_back": types.Schema(type=types.Type.INTEGER, description="Số ngày phân tích"),
                    "limit":     types.Schema(type=types.Type.INTEGER, description="Số món cần lấy, mặc định 5"),
                },
                required=["days_back"],
            ),
        ),
        types.FunctionDeclaration(
            name="get_revenue_by_hour",
            description="Phân bố order theo giờ trong ngày, tìm giờ cao điểm. Dùng khi hỏi giờ nào đông khách, giờ cao điểm.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "days_back": types.Schema(type=types.Type.INTEGER, description="Số ngày phân tích"),
                },
                required=["days_back"],
            ),
        ),
        types.FunctionDeclaration(
            name="get_revenue_by_category",
            description="Doanh thu và sản lượng theo danh mục món ăn/đồ uống. Dùng khi hỏi danh mục nào tốt nhất.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "days_back": types.Schema(type=types.Type.INTEGER, description="Số ngày phân tích"),
                },
                required=["days_back"],
            ),
        ),
        # ── Inventory Agent ──────────────────────────────────────────
        types.FunctionDeclaration(
            name="get_all_inventory",
            description="Xem toàn bộ kho nguyên liệu: tên, số lượng tồn, đơn vị, ngưỡng cảnh báo.",
            parameters=types.Schema(type=types.Type.OBJECT, properties={}, required=[]),
        ),
        types.FunctionDeclaration(
            name="get_low_stock_alerts",
            description="Nguyên liệu sắp hết (số lượng <= ngưỡng tối thiểu). Dùng khi hỏi kho hết gì, cần nhập hàng gì.",
            parameters=types.Schema(type=types.Type.OBJECT, properties={}, required=[]),
        ),
        # ── Menu Agent ───────────────────────────────────────────────
        types.FunctionDeclaration(
            name="get_full_menu",
            description="Toàn bộ menu kể cả món tạm ngưng. Dùng khi hỏi menu có gì, giá bao nhiêu, món nào đang tắt.",
            parameters=types.Schema(type=types.Type.OBJECT, properties={}, required=[]),
        ),
        types.FunctionDeclaration(
            name="get_slow_selling_items",
            description="Phân tích món bán chậm nhất. Dùng khi hỏi món nào ít được gọi, nên tạm ngưng gì.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "days_back": types.Schema(type=types.Type.INTEGER, description="Số ngày phân tích"),
                    "limit":     types.Schema(type=types.Type.INTEGER, description="Số món trả về"),
                },
                required=["days_back"],
            ),
        ),
        # ── Operations Agent ─────────────────────────────────────────
        types.FunctionDeclaration(
            name="get_table_status",
            description="Trạng thái tất cả bàn: đang có khách hay trống. Dùng khi hỏi bàn nào trống, quán đang đông không.",
            parameters=types.Schema(type=types.Type.OBJECT, properties={}, required=[]),
        ),
        types.FunctionDeclaration(
            name="get_preparing_orders",
            description="Order đang chờ pha chế, bao gồm thời gian chờ. Dùng khi hỏi barista đang làm gì, order nào chờ lâu.",
            parameters=types.Schema(type=types.Type.OBJECT, properties={}, required=[]),
        ),
        types.FunctionDeclaration(
            name="get_unpaid_bills",
            description="Bill chưa thanh toán. Dùng khi hỏi còn bao nhiêu bàn chưa trả tiền, tổng tiền chờ thu.",
            parameters=types.Schema(type=types.Type.OBJECT, properties={}, required=[]),
        ),
        types.FunctionDeclaration(
            name="get_order_history",
            description="Lịch sử order theo ngày. Dùng khi hỏi hôm nay bao nhiêu order, tổng giao dịch ngày.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "days_back": types.Schema(type=types.Type.INTEGER, description="Số ngày tính ngược"),
                },
                required=["days_back"],
            ),
        ),
    ])
]

# ── HTTP helper ───────────────────────────────────────────────────────────────
def _get(path, token, params=None):
    url = f"{BACKEND_URL}{path}"
    headers = {"Authorization": f"Bearer {token}"}
    try:
        r = requests.get(url, headers=headers, params=params, timeout=10)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.ConnectionError:
        raise RuntimeError(f"Không kết nối được backend tại {BACKEND_URL}")
    except requests.exceptions.Timeout:
        raise RuntimeError(f"Backend timeout khi gọi {path}")
    except requests.exceptions.HTTPError:
        raise RuntimeError(f"Backend lỗi {r.status_code} khi gọi {path}")

def _range(days_back):
    today = date.today()
    frm   = today - timedelta(days=max(0, int(days_back) - 1))
    return frm.isoformat(), today.isoformat()

# ── Tool executor ─────────────────────────────────────────────────────────────
def _run_tool(name, args, token):
    try:
        # ── Report ───────────────────────────────────────────────────
        if name == "get_daily_summary":
            d = _get("/reports/summary", token)
            return json.dumps({
                "doanh_thu_hom_nay":  d.get("revenue_today", 0),
                "so_bill_thanh_toan": d.get("bills_paid_today", 0),
                "so_order_hom_nay":   d.get("orders_today", 0),
                "ngay": d.get("date", date.today().isoformat()),
            }, ensure_ascii=False)

        if name == "get_revenue_by_day":
            frm, to = _range(args.get("days_back", 7))
            rows = _get("/reports/revenue/daily", token, {"from": frm, "to": to})
            total = sum(r.get("revenue", 0) for r in rows)
            return json.dumps({
                "tu_ngay": frm, "den_ngay": to,
                "tong_doanh_thu": total, "so_ngay_co_data": len(rows),
                "chi_tiet": rows,
            }, ensure_ascii=False)

        if name == "get_top_selling_items":
            frm, to = _range(args.get("days_back", 7))
            rows = _get("/reports/top-items", token,
                        {"from": frm, "to": to, "limit": args.get("limit", 5)})
            return json.dumps({
                "khoang": f"{frm} đến {to}", "top_items": rows,
            }, ensure_ascii=False)

        if name == "get_revenue_by_hour":
            frm, to = _range(args.get("days_back", 7))
            rows = _get("/reports/revenue/hourly", token, {"from": frm, "to": to})
            peak = max(rows, key=lambda x: x.get("orders", 0)) if rows else {}
            return json.dumps({
                "khoang": f"{frm} đến {to}",
                "gio_cao_diem": peak.get("label", "N/A"),
                "so_order_dinh": peak.get("orders", 0),
                "phan_bo": rows,
            }, ensure_ascii=False)

        if name == "get_revenue_by_category":
            frm, to = _range(args.get("days_back", 7))
            rows = _get("/reports/revenue/category", token, {"from": frm, "to": to})
            return json.dumps({
                "khoang": f"{frm} đến {to}", "theo_danh_muc": rows,
            }, ensure_ascii=False)

        # ── Inventory ────────────────────────────────────────────────
        if name == "get_all_inventory":
            items = _get("/inventory", token)
            low = [i for i in items if i.get("is_low")]
            return json.dumps({
                "tong": len(items), "sap_het": len(low), "danh_sach": items,
            }, ensure_ascii=False)

        if name == "get_low_stock_alerts":
            items = _get("/inventory/alerts", token)
            return json.dumps({
                "so_nguyen_lieu_sap_het": len(items),
                "can_nhap": [
                    {"ten": i.get("ingredient_name"), "con_lai": i.get("quantity"),
                     "don_vi": i.get("unit"), "nguong": i.get("min_quantity")}
                    for i in items
                ],
            }, ensure_ascii=False)

        # ── Menu ─────────────────────────────────────────────────────
        if name == "get_full_menu":
            items = _get("/menu/all", token)
            active   = [i for i in items if i.get("is_available")]
            inactive = [i for i in items if not i.get("is_available")]
            return json.dumps({
                "tong": len(items), "dang_ban": len(active), "tam_ngung": len(inactive),
                "danh_sach": items,
            }, ensure_ascii=False)

        if name == "get_slow_selling_items":
            frm, to  = _range(args.get("days_back", 7))
            all_top  = _get("/reports/top-items", token, {"from": frm, "to": to, "limit": 999})
            slow = sorted(
                [i for i in all_top if i.get("qty_sold", 0) < 10],
                key=lambda x: x.get("qty_sold", 0)
            )[:int(args.get("limit", 5))]
            return json.dumps({
                "khoang": f"{frm} đến {to}", "mon_ban_cham": slow,
                "goi_y": "Cân nhắc tạm ngưng hoặc giảm giá kích cầu",
            }, ensure_ascii=False)

        # ── Operations ───────────────────────────────────────────────
        if name == "get_table_status":
            tables = _get("/tables", token)
            occupied  = [t for t in tables if t.get("status") == "Occupied"]
            available = [t for t in tables if t.get("status") == "Available"]
            return json.dumps({
                "tong_ban": len(tables), "co_khach": len(occupied), "trong": len(available),
                "chi_tiet": tables,
            }, ensure_ascii=False)

        if name == "get_preparing_orders":
            orders = _get("/orders/preparing", token)
            now = datetime.now()
            enriched = []
            for o in orders:
                try:
                    created = datetime.fromisoformat(o.get("created_at", ""))
                    wait    = round((now - created).total_seconds() / 60, 1)
                except Exception:
                    wait = None
                enriched.append({
                    "order_id": o.get("order_id"),
                    "ban": o.get("table_number"),
                    "so_mon": len(o.get("items", [])),
                    "cho_phut": wait,
                    "can_chu_y": wait is not None and wait > 10,
                })
            urgent = [e for e in enriched if e.get("can_chu_y")]
            return json.dumps({
                "tong_order_cho": len(orders),
                "qua_10_phut": len(urgent),
                "chi_tiet": enriched,
            }, ensure_ascii=False)

        if name == "get_unpaid_bills":
            bills = _get("/payment/bills/unpaid", token)
            total = sum(b.get("amount", 0) for b in bills)
            return json.dumps({
                "so_bill_chua_tt": len(bills), "tong_tien_cho": total,
                "chi_tiet": [
                    {"bill_id": b.get("bill_id"), "ban": b.get("table_number"),
                     "so_tien": b.get("amount"), "san_sang_tt": b.get("is_ready", False)}
                    for b in bills
                ],
            }, ensure_ascii=False)

        if name == "get_order_history":
            frm, to = _range(args.get("days_back", 1))
            orders  = _get("/orders/history", token, {"from": frm, "to": to})
            paid_rev = sum(o.get("bill_amount", 0) for o in orders if o.get("bill_status") == "Paid")
            return json.dumps({
                "tu_ngay": frm, "den_ngay": to,
                "tong_order": len(orders),
                "hoan_thanh": len([o for o in orders if o.get("status") == "Completed"]),
                "doanh_thu_da_tt": paid_rev,
            }, ensure_ascii=False)

        return json.dumps({"loi": f"Tool '{name}' không tồn tại"})

    except RuntimeError as e:
        logger.error("Tool %s: %s", name, e)
        return json.dumps({"loi": str(e)})
    except Exception as e:
        logger.exception("Tool %s unexpected error", name)
        return json.dumps({"loi": f"Lỗi: {str(e)}"})


# ── System prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """Bạn là AI Assistant hỗ trợ quản lý quán cà phê. Bạn có thể truy cập dữ liệu thực từ hệ thống thông qua các công cụ (tools).

CÁCH HOẠT ĐỘNG:
- Luôn gọi tool để lấy dữ liệu thực — KHÔNG đoán số liệu
- Nếu câu hỏi liên quan nhiều mảng, gọi đồng thời nhiều tool
- Tổng hợp kết quả thành câu trả lời mạch lạc bằng tiếng Việt

FORMAT TRẢ LỜI:
- Tiếng Việt, ngắn gọn, đúng trọng tâm
- Số tiền: 1.234.000₫ (dấu chấm phân cách nghìn)
- Khi phát hiện vấn đề: luôn kèm đề xuất hành động cụ thể
- Nếu không có dữ liệu: nói rõ "chưa có dữ liệu trong khoảng thời gian này"

VÍ DỤ CÂU HỎI VÀ AGENT SỬ DỤNG:
- "Hôm nay bán được bao nhiêu?" → get_daily_summary
- "Kho có gì sắp hết không?" → get_low_stock_alerts
- "Món nào bán chậm nhất tuần này?" → get_slow_selling_items
- "Tình trạng bàn và order hiện tại?" → get_table_status + get_preparing_orders
- "Đề xuất nhập hàng tuần tới?" → get_low_stock_alerts + get_top_selling_items
"""

# ── Main entry point ──────────────────────────────────────────────────────────
def chat(message: str, manager_token: str = "", history: list = None) -> str:
    """
    Orchestrator chính: nhận câu hỏi → điều phối agents → trả lời.

    Args:
        message:       Câu hỏi của Manager
        manager_token: JWT Bearer token (để gọi backend APIs)
        history:       Lịch sử [{role, content}] từ frontend
    """
    api_key = GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "AIzaSyBVdej34Jw363MJO7HRRFqmEAPoIaFdJwQ")
    if not api_key:
        return (
            "⚠️ Chưa cấu hình GEMINI_API_KEY.\n"
            "Thêm vào file backend/.env:\n"
            "  GEMINI_API_KEY=your-key-here\n\n"
            "Lấy API key miễn phí tại: https://aistudio.google.com/apikey"
        )

    if not manager_token:
        return "⚠️ Không có token xác thực. Vui lòng đăng nhập lại."

    try:
        client = genai.Client(api_key=api_key.strip())

        # Xây dựng contents với lịch sử hội thoại (tối đa 6 lượt)
        contents = []
        if history:
            for h in (history or [])[-6:]:
                role = "user" if h.get("role") == "user" else "model"
                contents.append(types.Content(
                    role=role,
                    parts=[types.Part(text=h.get("content", ""))],
                ))
        contents.append(types.Content(
            role="user",
            parts=[types.Part(text=message)],
        ))

        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            tools=TOOLS,
            tool_config=types.ToolConfig(
                function_calling_config=types.FunctionCallingConfig(mode="AUTO")
            ),
            temperature=0.2,
            max_output_tokens=1024,
        )

        # Agentic loop: Gemini → tool calls → results → Gemini → ...
        for _ in range(3):  # max 3 vòng
            response = client.models.generate_content(
                model=MODEL, contents=contents, config=config
            )
            candidate = response.candidates[0]

            tool_calls = []
            text_parts = []
            for part in candidate.content.parts:
                if hasattr(part, "function_call") and part.function_call:
                    tool_calls.append(part.function_call)
                elif hasattr(part, "text") and part.text:
                    text_parts.append(part.text)

            # Không có tool call → đây là câu trả lời cuối
            if not tool_calls:
                return "\n".join(text_parts).strip() or "Không có phản hồi."

            logger.info("Tool calls: %s", [tc.name for tc in tool_calls])

            # Thêm response của model vào contents
            contents.append(types.Content(
                role="model", parts=candidate.content.parts
            ))

            # Thực thi tools và thêm kết quả
            tool_parts = []
            for fc in tool_calls:
                result = _run_tool(fc.name, dict(fc.args or {}), manager_token)
                logger.debug("Tool %s → %s", fc.name, result[:100])
                tool_parts.append(types.Part(
                    function_response=types.FunctionResponse(
                        name=fc.name,
                        response={"result": result},
                    )
                ))
            contents.append(types.Content(role="tool", parts=tool_parts))

        return "AI đã đạt giới hạn xử lý. Thử câu hỏi đơn giản hơn."

    except Exception as e:
        err = str(e)
        logger.exception("Orchestrator error")
        if "API_KEY" in err or "api_key" in err.lower() or "invalid" in err.lower():
            return "⚠️ API key Gemini không hợp lệ. Kiểm tra lại GEMINI_API_KEY."
        if "quota" in err.lower() or "429" in err:
            return "⚠️ Đã vượt quota API Gemini. Thử lại sau ít phút."
        if "Connection" in err or "connect" in err.lower():
            return f"⚠️ Không kết nối được backend ({BACKEND_URL}). Kiểm tra Flask đang chạy."
        return f"⚠️ Lỗi AI: {err}"
