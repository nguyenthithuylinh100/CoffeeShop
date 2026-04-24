from flask import Blueprint, request, jsonify
from database.db import db
from models.table import Table
from models.bill import Bill
from middleware.auth_middleware import require_auth, require_roles

table_bp = Blueprint('tables', __name__)

@table_bp.route('', methods=['GET'])
@require_auth
def get_tables():
    """
    Get all tables
    ---
    tags:
      - Tables
    security:
      - BearerAuth: []
    responses:
      200:
        description: List of all tables
    """

    # Hide internal takeaway pseudo-table (tableNumber=0) from normal table grid.
    tables = (
        Table.query
        .filter(Table.tableNumber > 0)
        .order_by(Table.tableNumber)
        .all()
    )
    table_ids = [t.tableID for t in tables]

    # Source of truth for UI availability: an existing Unpaid bill means occupied.
    occupied_ids = set()
    if table_ids:
        rows = (
            db.session.query(Bill.tableID)
            .filter(Bill.tableID.in_(table_ids), Bill.status == 'Unpaid')
            .distinct()
            .all()
        )
        occupied_ids = {row[0] for row in rows}

    payload = []
    for t in tables:
        item = t.to_dict()
        item['status'] = 'Occupied' if t.tableID in occupied_ids else 'Available'
        payload.append(item)

    return jsonify(payload), 200

@table_bp.route('', methods=['POST'])
@require_roles('Manager')
def create_table():
    """
    Create a new table
    ---
    tags:
      - Tables
    security:
      - BearerAuth: []
    responses:
      201:
        description: Created successfully
    """
    data = request.get_json()
    if not data or data.get('table_number') is None:
        return jsonify({'error': 'table_number is required'}), 400

    table = Table(tableNumber=data['table_number'])
    db.session.add(table)
    db.session.commit()
    return jsonify(table.to_dict()), 201

@table_bp.route('/<int:table_id>', methods=['DELETE'])
@require_roles('Manager')
def delete_table(table_id):
    """
    Delete a table
    ---
    tags:
      - Tables
    security:
      - BearerAuth: []
    responses:
      200:
        description: Deleted successfully
    """
    table = Table.query.get_or_404(table_id)
    db.session.delete(table)
    db.session.commit()
    return jsonify({'message': 'Deleted'}), 200
