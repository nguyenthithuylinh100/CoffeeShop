"""
Migrate legacy UTC timestamps to local UTC+7.

Use this only for old records created before the timezone fix.

Examples:
  python migrate_add_7h_legacy_timestamps.py --before "2026-04-08T03:30:00" --dry-run
  python migrate_add_7h_legacy_timestamps.py --before "2026-04-08T03:30:00"
"""

from __future__ import annotations

import argparse
from datetime import datetime, timedelta

from app import create_app
from database.db import db
from models.bill import Bill
from models.order import Order


SHIFT_HOURS = 7
SHIFT_DELTA = timedelta(hours=SHIFT_HOURS)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Add +7h to legacy timestamps stored in UTC."
    )
    parser.add_argument(
        "--before",
        required=True,
        help='Only migrate rows with timestamp < this ISO datetime, e.g. "2026-04-08T03:30:00".',
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview how many rows would be updated without committing.",
    )
    return parser.parse_args()


def parse_before(raw: str) -> datetime:
    try:
        return datetime.fromisoformat(raw)
    except ValueError as exc:
        raise SystemExit(
            f'Invalid --before value: "{raw}". Use format YYYY-MM-DDTHH:MM:SS'
        ) from exc


def shift_orders(before_dt: datetime) -> int:
    rows = (
        Order.query
        .filter(Order.orderDate.isnot(None), Order.orderDate < before_dt)
        .all()
    )
    for row in rows:
        row.orderDate = row.orderDate + SHIFT_DELTA
    return len(rows)


def shift_bills(before_dt: datetime) -> tuple[int, int]:
    created_rows = (
        Bill.query
        .filter(Bill.createdAt.isnot(None), Bill.createdAt < before_dt)
        .all()
    )
    for row in created_rows:
        row.createdAt = row.createdAt + SHIFT_DELTA

    paid_rows = (
        Bill.query
        .filter(Bill.paymentDate.isnot(None), Bill.paymentDate < before_dt)
        .all()
    )
    for row in paid_rows:
        row.paymentDate = row.paymentDate + SHIFT_DELTA

    return len(created_rows), len(paid_rows)


def main() -> None:
    args = parse_args()
    before_dt = parse_before(args.before)

    app = create_app()
    with app.app_context():
        shifted_orders = shift_orders(before_dt)
        shifted_bill_created, shifted_bill_paid = shift_bills(before_dt)

        print(f"[preview] cutoff: {before_dt.isoformat()}")
        print(f"[preview] shift delta: +{SHIFT_HOURS}h")
        print(f"[preview] orders.orderDate rows: {shifted_orders}")
        print(f"[preview] bills.createdAt rows: {shifted_bill_created}")
        print(f"[preview] bills.paymentDate rows: {shifted_bill_paid}")

        if args.dry_run:
            db.session.rollback()
            print("[dry-run] no changes committed.")
            return

        db.session.commit()
        print("[done] migration committed successfully.")


if __name__ == "__main__":
    main()
