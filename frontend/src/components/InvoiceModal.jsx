import { useRef } from 'react'
import { X, FileText, Printer } from 'lucide-react'

function fmt(n) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n ?? 0)) + '₫'
}

function fmtDate(d) {
  const dt = d ? new Date(d) : new Date()
  return dt.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/**
 * InvoiceModal — hiện hóa đơn dạng preview trên màn hình
 * Props:
 *   bill           — { bill_id, table_number, amount, orders, created_at }
 *   paymentMethod  — 'Cash' | 'QR' | 'Card'
 *   cashReceived   — số tiền khách đưa (nếu Cash)
 *   change         — tiền thối (nếu Cash)
 *   doneData       — response từ API sau khi thanh toán thành công
 *   customer       — thông tin hội viên (nếu có)
 *   redeemPreview  — { points_used, discount } nếu có đổi điểm
 *   onClose        — () => void
 */
export default function InvoiceModal({ bill, paymentMethod, cashReceived, change, doneData, customer, redeemPreview, onClose }) {
  const invoiceRef = useRef(null)

  const methodLabel = { Cash: 'Tiền mặt', QR: 'Chuyển khoản QR', Card: 'Thẻ / POS' }[paymentMethod] ?? paymentMethod
  const shopName    = 'Coffee Shop'
  const invoiceNo   = doneData?.payment_id ?? bill?.bill_id ?? '—'
  const paidAt      = doneData?.paid_at ?? new Date().toISOString()

  // Giảm giá điểm: ưu tiên doneData (từ API), fallback sang redeemPreview (snapshot local)
  const discount    = doneData?.discount ?? redeemPreview?.discount ?? 0
  const pointsUsed  = doneData?.points_used ?? redeemPreview?.points_used ?? 0
  const finalAmount = Math.max(0, parseFloat(bill?.amount ?? 0) - discount)

  // flatten items across all orders
  const lineItems = []
  bill?.orders?.forEach(order => {
    order.items?.forEach(item => {
      lineItems.push({
        name: item.name,
        qty:  item.quantity,
        price: item.price ?? (item.subtotal / item.quantity),
        subtotal: item.subtotal ?? item.price * item.quantity,
        note: item.note,
      })
    })
  })

  const handlePrint = () => {
    const html = invoiceRef.current?.innerHTML
    if (!html) return
    const win = window.open('', '_blank', 'width=480,height=700')
    win.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<title>Hóa đơn #${invoiceNo}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; font-size: 13px; color: #111; background: #fff; padding: 16px; }
  .center { text-align: center; }
  .shop-name { font-size: 20px; font-weight: 700; letter-spacing: 1px; }
  .divider { border: none; border-top: 1px dashed #999; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; padding: 2px 0; }
  .row .name { flex: 1; padding-right: 8px; }
  .bold { font-weight: 700; }
  .total-row { font-size: 15px; font-weight: 700; padding: 4px 0; }
  .small { font-size: 11px; color: #555; }
  .thanks { font-size: 14px; font-weight: 600; text-align: center; margin-top: 12px; }
  @media print {
    body { padding: 0; }
    button { display: none !important; }
  }
</style>
</head>
<body>
<div class="center">
  <div class="shop-name">${shopName}</div>
  <div class="small">HÓA ĐƠN THANH TOÁN</div>
  <div class="small">Số: #${invoiceNo}</div>
  <div class="small">${fmtDate(paidAt)}</div>
</div>
<hr class="divider" style="margin-top:10px"/>

<div class="row"><span>Bàn</span><span class="bold">${bill?.table_number === 0 ? 'Mang đi' : `Bàn ${bill?.table_number}`}</span></div>
<div class="row"><span>Thanh toán</span><span>${methodLabel}</span></div>

<hr class="divider"/>
<div class="row bold"><span>Món</span><span>SL × Đơn giá</span><span>Thành tiền</span></div>
<hr class="divider"/>
${lineItems.map(it => `
<div class="row">
  <span class="name">${it.name}${it.note ? `<br/><span class="small">* ${it.note}</span>` : ''}</span>
  <span>${it.qty} × ${fmt(it.price)}</span>
  <span>${fmt(it.subtotal)}</span>
</div>`).join('')}
<hr class="divider"/>
${discount > 0 ? `
<div class="row" style="color:#7c3aed"><span>Tạm tính</span><span>${fmt(bill?.amount)}</span></div>
<div class="row" style="color:#7c3aed"><span>Giảm điểm (${pointsUsed} điểm)</span><span>− ${fmt(discount)}</span></div>` : ''}
<div class="row total-row"><span>TỔNG CỘNG</span><span>${fmt(finalAmount)}</span></div>
${paymentMethod === 'Cash' && cashReceived ? `
<div class="row"><span>Tiền nhận</span><span>${fmt(cashReceived)}</span></div>
<div class="row bold"><span>Tiền thối</span><span>${fmt(change ?? 0)}</span></div>` : ''}
<hr class="divider"/>
<div class="thanks">Cảm ơn quý khách! ☕</div>
<div class="small center" style="margin-top:6px">Hẹn gặp lại lần sau</div>
</body>
</html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 400)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-600" strokeWidth={2} />
            <span className="font-bold text-gray-800">Xem hóa đơn</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* Invoice preview */}
        <div className="flex-1 overflow-y-auto p-5">
          <div
            ref={invoiceRef}
            className="font-mono text-sm border border-dashed border-gray-300 rounded-xl p-5 bg-gray-50 space-y-1"
          >
            {/* Shop header */}
            <div className="text-center mb-3">
              <p className="text-lg font-bold tracking-widest">{shopName}</p>
              <p className="text-xs text-gray-500">HÓA ĐƠN THANH TOÁN</p>
              <p className="text-xs text-gray-500">Số: #{invoiceNo}</p>
              <p className="text-xs text-gray-500">{fmtDate(paidAt)}</p>
            </div>

            <div className="border-t border-dashed border-gray-400 my-2" />

            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Bàn</span>
              <span className="font-bold">{bill?.table_number === 0 ? 'Mang đi' : `Bàn ${bill?.table_number}`}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Thanh toán</span>
              <span className="font-semibold">{methodLabel}</span>
            </div>

            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Items */}
            <div className="space-y-1.5">
              {lineItems.map((it, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs">
                    <span className="flex-1 pr-2 font-medium truncate">{it.name}</span>
                    <span className="text-gray-500 shrink-0">{it.qty} × {fmt(it.price)}</span>
                  </div>
                  <div className="flex justify-end text-xs text-gray-700 font-semibold">
                    {fmt(it.subtotal)}
                  </div>
                  {it.note && (
                    <p className="text-[10px] text-amber-600 italic">* {it.note}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Giảm giá điểm */}
            {discount > 0 && (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Tạm tính</span>
                  <span className="text-gray-500">{fmt(bill?.amount)}</span>
                </div>
                <div className="flex justify-between text-xs text-purple-700 font-semibold">
                  <span>Giảm điểm ({pointsUsed} điểm)</span>
                  <span>− {fmt(discount)}</span>
                </div>
              </>
            )}

            {/* Total */}
            <div className="flex justify-between font-bold text-sm">
              <span>TỔNG CỘNG</span>
              <span className="text-amber-700">{fmt(finalAmount)}</span>
            </div>

            {paymentMethod === 'Cash' && cashReceived && (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Tiền nhận</span>
                  <span>{fmt(cashReceived)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span>Tiền thối</span>
                  <span className="text-emerald-700">{fmt(change ?? 0)}</span>
                </div>
              </>
            )}

            <div className="border-t border-dashed border-gray-400 my-2" />
            <p className="text-center text-sm font-bold">Cảm ơn quý khách! ☕</p>
            <p className="text-center text-xs text-gray-400">Hẹn gặp lại lần sau</p>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1">Đóng</button>
          <button
            onClick={handlePrint}
            className="btn-primary flex-1 inline-flex items-center justify-center gap-2"
          >
            <Printer className="h-4 w-4 shrink-0" strokeWidth={2} />
            In hóa đơn
          </button>
        </div>
      </div>
    </div>
  )
}
