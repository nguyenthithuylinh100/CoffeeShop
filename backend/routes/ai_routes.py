"""
AI Routes — /ai/*
  POST /ai/chat          → Orchestrator chat (Manager)
  GET  /ai/alerts        → Lấy danh sách cảnh báo (Manager)
  PUT  /ai/alerts/read   → Đánh dấu đã đọc (Manager)
"""

from flask import Blueprint, request, jsonify, g
from middleware.auth_middleware import require_roles
from agents.orchestrator import chat
from agents.alert_agent   import get_alerts, mark_read

ai_bp = Blueprint('ai', __name__)


# ── Chat ──────────────────────────────────────────────────────────────────────
@ai_bp.route('/chat', methods=['POST'])
@require_roles('Manager')
def ai_chat():
    """
    POST /ai/chat
    Body: { "message": "...", "history": [{role, content}, ...] }
    Returns: { "reply": "..." }
    """
    data    = request.get_json(silent=True) or {}
    message = (data.get('message') or '').strip()

    if not message:
        return jsonify({'error': 'Message is required'}), 400

    token   = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    history = data.get('history') or []

    reply = chat(message=message, manager_token=token, history=history)
    return jsonify({'reply': reply}), 200


# ── Alerts ────────────────────────────────────────────────────────────────────
@ai_bp.route('/alerts', methods=['GET'])
@require_roles('Manager')
def ai_alerts():
    """
    GET /ai/alerts?unread=true
    Returns danh sách cảnh báo từ Alert Agent.
    Query params:
      unread=true  → chỉ trả alert chưa đọc
    """
    unread_only = request.args.get('unread', '').lower() == 'true'
    alerts = get_alerts(unread_only=unread_only)
    return jsonify({
        'alerts':       alerts,
        'total':        len(alerts),
        'unread_count': sum(1 for a in get_alerts() if not a['read']),
    }), 200


@ai_bp.route('/alerts/read', methods=['PUT'])
@require_roles('Manager')
def ai_alerts_mark_read():
    """
    PUT /ai/alerts/read
    Body: { "id": 5 }   → đánh dấu alert cụ thể
    Body: {}             → đánh dấu tất cả đã đọc
    """
    data = request.get_json(silent=True) or {}
    alert_id = data.get('id')
    mark_read(alert_id)
    return jsonify({'ok': True}), 200
