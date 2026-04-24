"""
Run once to seed sample data:
  cd backend
  python seed.py

Includes: tables, inventory, menu, employees, AND 30 days of historical
orders/bills so that the Reports and Order History pages show real data.
"""
import sys, os, random
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from database.db import db
from datetime import datetime, timedelta, date

app = create_app()

with app.app_context():
    from models.table    import Table
    from models.menu_item import MenuItem
    from models.inventory import Inventory, MenuItemIngredient
    from models.bill     import Bill
    from models.order    import Order
    from models.order_item import OrderItem
    from models.employee  import Employee
    import bcrypt

    # ── 1. Employees ────────────────────────────────────────────────────────
    if Employee.query.count() == 0:
        for name, username, role, pw in [
            ('Nguyen Minh Quan', 'manager',  'Manager', 'manager123'),
            ('Tran Thi Lan',     'cashier',  'Cashier', 'cashier123'),
            ('Le Van Hung',      'cashier2', 'Cashier', 'cashier123'),
            ('Pham Thi Mai',     'barista',  'Barista', 'barista123'),
        ]:
            h = bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
            db.session.add(Employee(name=name, username=username, role=role,
                                    password_hash=h, status='Active'))
        db.session.commit()
        print('✅ Seeded employees')

    # Ensure barista exists (even if Employee table was already seeded).
    barista_username = 'barista'
    barista_password = 'barista123'
    barista = Employee.query.filter_by(username=barista_username).first()

    if not barista:
        h = bcrypt.hashpw(barista_password.encode(), bcrypt.gensalt()).decode()
        db.session.add(
            Employee(
                name='Pham Thi Mai',
                username=barista_username,
                role='Barista',
                password_hash=h,
                status='Active',
            )
        )
        db.session.commit()
        print('✅ Seeded barista')
    else:
        needs_update = False

        if barista.status != 'Active':
            barista.status = 'Active'
            needs_update = True

        if barista.name != 'Pham Thi Mai':
            barista.name = 'Pham Thi Mai'
            needs_update = True

        if barista.role != 'Barista':
            barista.role = 'Barista'
            needs_update = True

        if not bcrypt.checkpw(
            barista_password.encode('utf-8'),
            barista.password_hash.encode('utf-8'),
        ):
            barista.password_hash = bcrypt.hashpw(barista_password.encode(), bcrypt.gensalt()).decode()
            needs_update = True

        if needs_update:
            db.session.commit()
            print('✅ Updated barista credentials')

    # ── 2. Tables ────────────────────────────────────────────────────────────
    if Table.query.count() == 0:
        db.session.add_all([Table(tableNumber=i) for i in range(1, 11)])
        db.session.commit()
        print('✅ Seeded 10 tables')

    # ── 3. Inventory ─────────────────────────────────────────────────────────
    if Inventory.query.count() == 0:
        inv_data = [
            ('Ca phe robusta',   5000, 'g',     500),
            ('Ca phe arabica',   3000, 'g',     300),
            ('Sua tuoi',        10000, 'ml',   1000),
            ('Sua dac',          5000, 'ml',    500),
            ('Duong trang',      3000, 'g',     300),
            ('Da vien',         20000, 'g',    2000),
            ('Tra xanh matcha',  1000, 'g',     100),
            ('Tra oolong',       1000, 'g',     100),
            ('Cacao bot',        2000, 'g',     200),
            ('Kem tuoi',         3000, 'ml',    300),
            ('Syrup caramel',    2000, 'ml',    200),
            ('Syrup vanilla',    2000, 'ml',    200),
            ('Nuoc loc',        50000, 'ml',   5000),
            ('Banh mi sandwich',  100, 'cai',    10),
            ('Croissant',          80, 'cai',     8),
            ('Cheesecake',         50, 'mieng',   5),
            ('Tiramisu',           40, 'mieng',   4),
        ]
        for n, q, u, m in inv_data:
            db.session.add(Inventory(nameInventory=n, quantity=q, unit=u, minQuantity=m))
        db.session.commit()
        print('✅ Seeded inventory')

    # ── 4. Menu items ─────────────────────────────────────────────────────────
    if MenuItem.query.count() == 0:
        menu_data = [
            ('Ca phe den',        25000, 'Ca Phe'),
            ('Ca phe sua',        30000, 'Ca Phe'),
            ('Cappuccino',        45000, 'Ca Phe'),
            ('Latte',             45000, 'Ca Phe'),
            ('Americano',         40000, 'Ca Phe'),
            ('Caramel Macchiato', 55000, 'Ca Phe'),
            ('Ca phe trung',      40000, 'Ca Phe'),
            ('Tra xanh matcha',   45000, 'Tra'),
            ('Tra oolong sua',    40000, 'Tra'),
            ('Tra dao',           35000, 'Tra'),
            ('Chocolate nong',    45000, 'Khac'),
            ('Chocolate da',      45000, 'Khac'),
            ('Nuoc cam ep',       35000, 'Khac'),
            ('Banh mi sandwich',  30000, 'Do An'),
            ('Croissant',         25000, 'Do An'),
            ('Cheesecake',        45000, 'Do An'),
            ('Tiramisu',          50000, 'Do An'),
        ]
        for name, price, cat in menu_data:
            db.session.add(MenuItem(nameMenuItem=name, price=price,
                                    category=cat, isAvailable=True))
        db.session.commit()
        print('✅ Seeded 17 menu items')

    # ── 5. Historical orders (last 30 days) ───────────────────────────────────
    # Only seed if no bills exist yet
    if Bill.query.count() == 0:
        menus  = MenuItem.query.all()
        tables = Table.query.all()
        emp    = Employee.query.filter_by(role='Cashier').first()
        if not emp:
            emp = Employee.query.first()

        random.seed(42)
        today    = date.today()
        bill_cnt = 0

        for days_back in range(30, 0, -1):
            day        = today - timedelta(days=days_back)
            # 3-8 bills per day
            n_bills    = random.randint(3, 8)
            # peak hours: 7-9, 11-13, 15-17
            peak_hours = list(range(7, 10)) + list(range(11, 14)) + list(range(15, 18))

            for _ in range(n_bills):
                tbl   = random.choice(tables)
                hour  = random.choice(peak_hours)
                minute= random.randint(0, 59)
                created = datetime(day.year, day.month, day.day, hour, minute)

                bill = Bill(
                    tableID   = tbl.tableID,
                    status    = 'Paid',
                    method    = random.choice(['Cash', 'Cash', 'E-wallet', 'Card']),
                    createdAt = created,
                    paymentDate = created + timedelta(minutes=random.randint(20, 90)),
                    amount    = 0,
                )
                db.session.add(bill)
                db.session.flush()

                # 1 or 2 orders per bill
                n_orders = random.randint(1, 2)
                bill_total = 0.0
                for _ in range(n_orders):
                    order_time = created + timedelta(minutes=random.randint(0, 15))
                    order = Order(
                        billID     = bill.billID,
                        employeeID = emp.employeeID,
                        status     = 'Completed',
                        orderDate  = order_time,
                    )
                    db.session.add(order)
                    db.session.flush()

                    # 2-4 different items
                    chosen = random.sample(menus, random.randint(2, 4))
                    for item in chosen:
                        qty = random.randint(1, 3)
                        db.session.add(OrderItem(
                            orderID    = order.orderID,
                            menuItemID = item.menuItemID,
                            quantity   = qty,
                            price      = item.price,
                        ))
                        bill_total += float(item.price) * qty

                bill.amount = bill_total
                bill_cnt += 1

        db.session.commit()
        print(f'✅ Seeded {bill_cnt} historical bills (30 days)')

    print('\n🎉 Seed complete!')
    print('   manager  / manager123')
    print('   cashier  / cashier123')
    print('   barista  / barista123')
