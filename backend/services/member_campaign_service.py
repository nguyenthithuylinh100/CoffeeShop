import smtplib
from datetime import datetime, timedelta
from email.message import EmailMessage

from flask import current_app

from database.db import db
from models.customer import Customer
from models.member_notification import MemberNotification


VOUCHER_BY_LEVEL = {
    'Normal': {
        'code_prefix': 'WELCOME5',
        'discount_percent': 5,
        'max_discount': 20_000,
        'min_order': 50_000,
        'valid_days': 15,
    },
    'Silver': {
        'code_prefix': 'SILVER10',
        'discount_percent': 10,
        'max_discount': 40_000,
        'min_order': 80_000,
        'valid_days': 20,
    },
    'Gold': {
        'code_prefix': 'GOLD15',
        'discount_percent': 15,
        'max_discount': 70_000,
        'min_order': 120_000,
        'valid_days': 30,
    },
}


def get_voucher_catalog():
    return VOUCHER_BY_LEVEL


def _build_voucher(level: str, customer_id: int):
    cfg = VOUCHER_BY_LEVEL[level]
    expires = datetime.now() + timedelta(days=cfg['valid_days'])
    return {
        'level': level,
        'voucher_code': f"{cfg['code_prefix']}-{customer_id}",
        'discount_percent': cfg['discount_percent'],
        'max_discount': cfg['max_discount'],
        'min_order': cfg['min_order'],
        'expires_at': expires.strftime('%d/%m/%Y'),
    }


def _render_campaign_text(shop_name: str, customer_name: str, voucher: dict, note: str | None):
    title = f"Uu dai hang {voucher['level']} danh cho ban"
    message = (
        f"{shop_name} tang ban ma {voucher['voucher_code']} giam {voucher['discount_percent']}% "
        f"(toi da {voucher['max_discount']:,}d, don toi thieu {voucher['min_order']:,}d), "
        f"co hieu luc den {voucher['expires_at']}."
    )
    if note:
        message = f'{message} {note.strip()}'
    return title, message


def _send_email(recipient: str, subject: str, body: str):
    host = current_app.config.get('SMTP_HOST')
    username = current_app.config.get('SMTP_USERNAME')
    password = current_app.config.get('SMTP_PASSWORD')
    sender = current_app.config.get('MAIL_SENDER')
    port = current_app.config.get('SMTP_PORT', 587)
    use_tls = current_app.config.get('SMTP_USE_TLS', True)

    if not host or not username or not password:
        raise RuntimeError('Chua cau hinh SMTP_HOST/SMTP_USERNAME/SMTP_PASSWORD')

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = sender
    msg['To'] = recipient
    msg.set_content(body)

    with smtplib.SMTP(host, port, timeout=20) as smtp:
        if use_tls:
            smtp.starttls()
        smtp.login(username, password)
        smtp.send_message(msg)


def send_test_email(recipient: str, subject: str = '', message: str = ''):
    recipient = (recipient or '').strip()
    if not recipient:
        return None, 'recipient_email is required'
    if '@' not in recipient or '.' not in recipient.split('@')[-1]:
        return None, 'recipient_email is invalid'

    shop_name = current_app.config.get('SHOP_NAME', 'Coffee Shop')
    final_subject = (subject or '').strip() or f'Test SMTP tu {shop_name}'
    final_message = (message or '').strip() or (
        f'Day la email test SMTP tu he thong {shop_name}.\n'
        'Neu ban nhan duoc email nay, cau hinh Gmail SMTP da hoat dong.'
    )

    try:
        _send_email(recipient, final_subject, final_message)
        return {
            'recipient_email': recipient,
            'subject': final_subject,
            'status': 'Sent',
        }, None
    except Exception as ex:
        return None, str(ex)


def _top_error_groups(error_rows: list[dict], limit: int = 3):
    grouped = {}
    for row in error_rows:
        key = row.get('error') or 'Unknown SMTP error'
        if key not in grouped:
            grouped[key] = {
                'error': key,
                'count': 0,
                'sample_recipients': [],
            }
        grouped[key]['count'] += 1
        email = row.get('recipient_email')
        if email and len(grouped[key]['sample_recipients']) < 3:
            grouped[key]['sample_recipients'].append(email)
    ranked = sorted(grouped.values(), key=lambda x: x['count'], reverse=True)
    return ranked[: max(1, min(limit, 10))]


def send_voucher_campaign(level: str, note: str = '', send_email: bool = True, error_limit: int = 3):
    level = (level or '').strip()
    if level not in VOUCHER_BY_LEVEL:
        return None, f'Hang hoi vien khong hop le: {level}'

    customers = Customer.query.filter_by(memberLevel=level).all()
    active_customers = [c for c in customers if (getattr(c, 'status', 'Active') or 'Active') == 'Active']
    if not active_customers:
        return None, f'Khong co hoi vien dang hoat dong o hang {level}'

    shop_name = current_app.config.get('SHOP_NAME', 'Coffee Shop')
    total = len(active_customers)
    sent_inapp = 0
    sent_email = 0
    email_failed = 0
    email_skipped = 0
    failed_details = []

    for customer in active_customers:
        voucher = _build_voucher(level, customer.customerID)
        title, message = _render_campaign_text(shop_name, customer.name, voucher, note)
        channel = 'Both' if send_email else 'InApp'
        status = 'Sent'
        error_msg = None

        if send_email:
            if customer.email:
                try:
                    mail_body = (
                        f'Chao {customer.name},\n\n'
                        f'{message}\n\n'
                        f'Cam on ban da dong hanh cung {shop_name}.'
                    )
                    _send_email(customer.email, title, mail_body)
                    sent_email += 1
                except Exception as ex:
                    email_failed += 1
                    status = 'Failed'
                    error_msg = str(ex)
                    failed_details.append({
                        'customer_id': customer.customerID,
                        'customer_name': customer.name,
                        'recipient_email': customer.email,
                        'error': error_msg,
                    })
            else:
                email_skipped += 1
                status = 'Skipped'
                error_msg = 'Khong co email hoi vien'

        db.session.add(
            MemberNotification(
                customerID=customer.customerID,
                channel=channel,
                title=title,
                message=message,
                status=status,
                error=error_msg,
            )
        )
        sent_inapp += 1

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return None, str(e)

    return {
        'member_level': level,
        'total_members': total,
        'inapp_sent': sent_inapp,
        'email_sent': sent_email,
        'email_failed': email_failed,
        'email_skipped': email_skipped,
        'smtp_error_top': _top_error_groups(failed_details, error_limit),
        'smtp_error_samples': failed_details[:10],
        'voucher_template': VOUCHER_BY_LEVEL[level],
    }, None
