import { ShoppingCart, X, CheckCircle2, Minus, Plus } from 'lucide-react'

// UC3 + UC4: Add Item + Edit Order – danh sách món tạm, chỉnh số lượng, ghi chú, xoá
function fmt(n) {
  return new Intl.NumberFormat('vi-VN').format(n) + '₫'
}

export default function OrderPanel({ orderItems, onRemove, onChangeQty, onChangeNote, onConfirm, loading }) {
  const total = orderItems.reduce((s, i) => s + i.price * i.quantity, 0)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-700 text-sm">Order Tạm</h2>
        {orderItems.length > 0 && (
          <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {orderItems.reduce((s, i) => s + i.quantity, 0)} món
          </span>
        )}
      </div>

      {/* Empty state */}
      {orderItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-300 py-8">
          <ShoppingCart className="h-12 w-12 mb-3 text-gray-200" strokeWidth={1.5} />
          <p className="text-sm font-medium text-gray-400">Chưa có món nào</p>
          <p className="text-xs text-gray-400 mt-1">Chọn món từ menu bên trái</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
          {orderItems.map((item, idx) => (
            <div key={idx} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              {/* Item header */}
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs text-amber-600 font-bold mt-0.5">{fmt(item.price)}</p>
                </div>
                {/* UC4: Điều chỉnh số lượng */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onChangeQty(idx, item.quantity - 1)}
                    className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 flex items-center justify-center transition-colors"
                    aria-label="Giảm"
                  >
                    <Minus className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-gray-800">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => onChangeQty(idx, item.quantity + 1)}
                    className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 flex items-center justify-center transition-colors"
                    aria-label="Tăng"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                  {/* UC4: Xoá món */}
                  <button
                    type="button"
                    onClick={() => onRemove(idx)}
                    className="w-7 h-7 rounded-lg bg-white border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors ml-1"
                    aria-label="Xóa món"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
              {/* UC4: Ghi chú đặc biệt (ít đường, không đá...) */}
              <input
                type="text"
                placeholder="Ghi chú: ít đường, không đá..."
                value={item.note}
                onChange={e => onChangeNote(idx, e.target.value)}
                className="mt-2 w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder-gray-300"
              />
              {/* Subtotal */}
              <div className="text-right text-xs font-bold text-gray-500 mt-1">
                = {fmt(item.price * item.quantity)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer: total + confirm */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        {orderItems.length > 0 && (
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-gray-600">Tổng tạm:</span>
            <span className="text-lg font-bold text-amber-700">{fmt(total)}</span>
          </div>
        )}
        {/* UC2: Cashier nhấn "Xác nhận Order" */}
        <button
          type="button"
          onClick={onConfirm}
          disabled={orderItems.length === 0 || loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"/>
              Đang gửi...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={2} />
              Xác nhận Order
            </>
          )}
        </button>
      </div>
    </div>
  )
}
