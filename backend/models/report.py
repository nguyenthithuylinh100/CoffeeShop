from database.db import db
from datetime import datetime

class Report(db.Model):
    __tablename__ = 'Report'            # khop SQL v3

    reportID     = db.Column('reportID',     db.Integer,        primary_key=True, autoincrement=True)
    typeReport   = db.Column('typeReport',   db.String(50),     nullable=False)
    fromDate     = db.Column('fromDate',     db.Date,           nullable=False)
    toDate       = db.Column('toDate',       db.Date,           nullable=False)
    totalRevenue = db.Column('totalRevenue', db.Numeric(15, 0), default=0)
    totalOrders  = db.Column('totalOrders',  db.Integer,        default=0)
    createdAt    = db.Column('createdAt',    db.DateTime,       default=datetime.utcnow)
    generatedBy  = db.Column('generatedBy',  db.Integer,        db.ForeignKey('Employee.employeeID'))

    employee = db.relationship('Employee', back_populates='reports')

    def to_dict(self):
        return {
            'report_id':     self.reportID,
            'type_report':   self.typeReport,
            'period_start':  self.fromDate.isoformat(),
            'period_end':    self.toDate.isoformat(),
            'total_revenue': float(self.totalRevenue),
            'total_orders':  self.totalOrders,
            'created_at':    self.createdAt.isoformat(),
            'generated_by':  self.generatedBy,
        }
