import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Check,
  StickyNote,
  ShoppingBag,
  AlertTriangle,
  Hourglass,
  RefreshCw,
  Coffee,
  CheckCircle2,
  FlaskConical,
  X,
  Loader2,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { SkeletonOrderCards } from '../components/Skeleton'
import { useToast } from '../context/ToastContext'
import api from '../services/api'

const REFRESH_INTERVAL = 15

function parseOrderTime(dateStr) {
  if (dateStr == null || dateStr === '') return null
  const t = new Date(dateStr)
  return Number.isNaN(t.getTime()) ? null : t
}

function timeAgo(dateStr) {
  const t = parseOrderTime(dateStr)
  if (!t) return '—'
  const diff = Math.floor((Date.now() - t.getTime()) / 1000)
  if (diff < 0) return 'vừa xong'
  if (diff < 60)   return `${diff}s trước`
  if (diff < 3600) return `${Math.floor(diff / 60)}m trước`
  return `${Math.floor(diff / 3600)}h trước`
}

function waitMins(dateStr) {
  const t = parseOrderTime(dateStr)
  if (!t) return 0
  return Math.max(0, Math.floor((Date.now() - t.getTime()) / 60000))
}

function urgency(dateStr) {
  const m = waitMins(dateStr)
  if (m >= 10) return 'critical'
  if (m >= 5)  return 'warning'
  return 'normal'
}

const URGENCY = {
  normal: {
    border:    'border-blue-100',
    headerBg:  'bg-gradient-to-r from-blue-600 to-blue-700',
    timeBg:    'bg-blue-500/60',
    subText:   'text-blue-200',
    qtyBg:     'bg-blue-100 text-blue-700',
    cardExtra: '',
  },
  warning: {
    border:    'border-amber-300',
    headerBg:  'bg-gradient-to-r from-amber-500 to-amber-600',
    timeBg:    'bg-amber-400/60',
    subText:   'text-amber-100',
    qtyBg:     'bg-amber-100 text-amber-700',
    cardExtra: '',
  },
  critical: {
    border:    'border-red-400',
    headerBg:  'bg-gradient-to-r from-red-600 to-red-700',
    timeBg:    'bg-red-500/60',
    subText:   'text-red-200',
    qtyBg:     'bg-red-100 text-red-700',
    cardExtra: 'urgency-critical',
  },
}

/* ── Modal nguyên liệu ───────────────────────────────────────────────────── */
function IngredientModal({ item, quantity, onClose }) {
  const [loading, setLoading]       = useState(true)
  const [ingredients, setIngredients] = useState([])
  const [error, setError]           = useState(null)

  useEffect(() => {
    if (!item?.menu_item_id) return
    setLoading(true)
    setError(null)
    api.get(`/menu/${item.menu_item_id}/ingredients`)
      .then(res => {
        setIngredients(res.data.ingredients || [])
      })
      .catch(() => setError('Không tải được nguyên liệu'))
      .finally(() => setLoading(false))
  }, [item?.menu_item_id])

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <FlaskConical className="h-5 w-5 text-white shrink-0" strokeWidth={2} />
            <div className="min-w-0">
              <p className="text-white font-bold text-base leading-snug truncate">
                {item?.name}
              </p>
              <p className="text-emerald-100 text-xs mt-0.5">
                Số lượng gọi: <span className="font-bold text-white">{quantity}</span> phần
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors shrink-0 mt-0.5"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-6 text-gray-400">
              <Loader2 className="h-7 w-7 animate-spin" strokeWidth={2} />
              <p className="text-sm">Đang tải nguyên liệu...</p>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          ) : ingredients.length === 0 ? (
            <div className="text-center py-6">
              <FlaskConical className="h-10 w-10 text-gray-200 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-gray-400 text-sm">Món này chưa có thông tin nguyên liệu</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">
                Nguyên liệu cho {quantity} phần
              </p>
              <div className="space-y-2">
                {ingredients.map((ing, idx) => {
                  const totalQty = (parseFloat(ing.quantity_used) * quantity).toFixed(2)
                  // Remove trailing zeros: "1.50" → "1.5", "2.00" → "2"
                  const displayQty = parseFloat(totalQty).toString()
                  const perQty = parseFloat(ing.quantity_used).toString()

                  return (
                    <div
                      key={ing.inventory_id ?? idx}
                      className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800 text-sm truncate">
                          {ing.ingredient_name}
                        </p>
                        {quantity > 1 && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {perQty} {ing.unit} × {quantity}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="bg-emerald-100 text-emerald-700 font-bold text-sm px-3 py-1 rounded-lg tabular-nums">
                          {displayQty}
                        </span>
                        {ing.unit && (
                          <p className="text-xs text-gray-400 mt-0.5">{ing.unit}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-center text-xs text-gray-300 mt-4">
                Nhấn ra ngoài để đóng
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* Swipe-to-complete — callback ref + layout effect để luôn gắn listener khi DOM sẵn sàng */
function useSwipe(onComplete) {
  const startX   = useRef(0)
  const dragging = useRef(false)
  const cbRef    = useRef(onComplete)
  cbRef.current = onComplete

  const [node, setNode] = useState(null)

  useEffect(() => {
    if (!node) return

    const start = (x) => { dragging.current = true; startX.current = x }
    const move  = (x) => {
      if (!dragging.current) return
      const dx = Math.max(0, x - startX.current)
      node.style.transform = `translateX(${dx}px)`
      node.style.opacity   = String(1 - dx / 180)
    }
    const end = (x) => {
      if (!dragging.current) return
      dragging.current = false
      const dx = Math.max(0, x - startX.current)
      if (dx > 85) {
        node.style.transition = 'transform .22s ease, opacity .22s ease'
        node.style.transform  = 'translateX(110%)'
        node.style.opacity    = '0'
        setTimeout(() => {
          cbRef.current()
          node.style.transition = ''
          node.style.transform  = ''
          node.style.opacity    = ''
        }, 230)
      } else {
        node.style.transition = 'transform .18s ease, opacity .18s ease'
        node.style.transform  = ''
        node.style.opacity    = ''
        setTimeout(() => { node.style.transition = '' }, 200)
      }
    }

    const md = e => start(e.clientX)
    const mm = e => move(e.clientX)
    const mu = e => end(e.clientX)
    const ts = e => start(e.touches[0].clientX)
    const tm = e => { e.preventDefault(); move(e.touches[0].clientX) }
    const te = e => end(e.changedTouches[0].clientX)

    node.addEventListener('mousedown', md)
    window.addEventListener('mousemove', mm)
    window.addEventListener('mouseup', mu)
    node.addEventListener('touchstart', ts, { passive: true })
    node.addEventListener('touchmove',  tm, { passive: false })
    node.addEventListener('touchend',   te)

    return () => {
      node.removeEventListener('mousedown', md)
      window.removeEventListener('mousemove', mm)
      window.removeEventListener('mouseup', mu)
      node.removeEventListener('touchstart', ts)
      node.removeEventListener('touchmove',  tm)
      node.removeEventListener('touchend',   te)
    }
  }, [node])

  return setNode
}

function OrderCard({ order, onComplete, completing, onItemClick }) {
  const level = urgency(order.created_at)
  const st    = URGENCY[level]
  const mins  = waitMins(order.created_at)
  const swipeRef = useSwipe(onComplete)

  const tn = order.table_number
  const isTakeaway = tn === 0 || tn === '0'
  const tableTitle =
    isTakeaway ? 'Mang đi'
    : tn == null || tn === '' ? 'Bàn —'
    : `Bàn ${tn}`

  return (
    <div className="relative overflow-hidden rounded-2xl h-full flex flex-col">
      {/* Swipe reveal background */}
      <div className="absolute inset-0 bg-emerald-500 rounded-2xl flex items-center gap-2 pl-5 z-0">
        <Check className="h-5 w-5 text-white shrink-0" strokeWidth={2.5} />
        <span className="text-white font-semibold text-sm">Hoàn thành</span>
      </div>

      {/* Draggable card */}
      <div
        ref={swipeRef}
        className={`relative z-10 bg-white border-2 ${st.border} ${st.cardExtra} rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-grab active:cursor-grabbing select-none flex flex-col flex-1 min-h-0`}
      >
        {/* Header */}
        <div className={`${st.headerBg} text-white px-4 py-3 flex justify-between items-start gap-3`}>
          <div className="min-w-0 flex-1 flex items-start gap-2">
            {isTakeaway && (
              <ShoppingBag className="h-6 w-6 shrink-0 text-white/95 mt-0.5" strokeWidth={2} />
            )}
            <div className="min-w-0">
              <p className="font-bold text-lg sm:text-xl leading-snug break-words">{tableTitle}</p>
              <p className={`${st.subText} text-xs mt-0.5`}>Order #{order.order_id ?? '—'}</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-1 shrink-0">
            {level === 'critical' && (
              <span className="bg-white text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                KHẨN
              </span>
            )}
            <span className={`${st.timeBg} text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap`}>
              {timeAgo(order.created_at)}
            </span>
            {level !== 'normal' && (
              <p className={`${st.subText} text-xs whitespace-nowrap`}>{mins} phút chờ</p>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="p-4 flex flex-col flex-1 min-h-0">
          <div className="space-y-2 mb-4 flex-1 min-h-0 overflow-y-auto max-h-[min(320px,50vh)]">
            {!order.items?.length ? (
              <p className="text-sm text-gray-400 text-center py-2">Không có chi tiết món</p>
            ) : (
              order.items.map((item, idx) => (
              <div key={item.order_item_id ?? idx} className="flex items-start gap-3">
                <span className={`${st.qtyBg} text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0 tabular-nums`}>
                  {item.quantity}
                </span>
                <div className="flex-1 min-w-0">
                  {/* Tên món — click để xem nguyên liệu */}
                  <button
                    type="button"
                    onMouseDown={e => e.stopPropagation()}
                    onTouchStart={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); onItemClick(item) }}
                    className="font-semibold text-gray-800 text-sm break-words leading-snug text-left w-full hover:text-emerald-600 transition-colors group flex items-center gap-1"
                  >
                    <span className="flex-1">{item.name || 'Món'}</span>
                    <FlaskConical className="h-3.5 w-3.5 text-gray-300 group-hover:text-emerald-500 shrink-0 transition-colors" strokeWidth={2} />
                  </button>
                  {item.note && (
                    <div className="mt-0.5 inline-flex max-w-full items-start gap-1.5 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-2 py-0.5 break-words">
                      <StickyNote className="h-3.5 w-3.5 shrink-0 mt-0.5" strokeWidth={2} />
                      <span>{item.note}</span>
                    </div>
                  )}
                </div>
              </div>
              ))
            )}
          </div>

          {order.items?.length > 0 && (
            <p className="text-xs text-gray-300 text-center mb-2 flex items-center justify-center gap-1">
              <FlaskConical className="h-3 w-3" strokeWidth={2} />
              Nhấn tên món để xem nguyên liệu
            </p>
          )}

          <button
            type="button"
            onClick={onComplete}
            disabled={completing}
            className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 shadow-sm ${
              level === 'critical'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'btn-success'
            }`}
          >
            {completing ? (
              <><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />Đang cập nhật...</>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={2} />
                Hoàn thành
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-300 mt-1.5">hoặc vuốt phải →</p>
        </div>
      </div>
    </div>
  )
}

// UC6 + UC7
export default function BaristaPage() {
  const [orders, setOrders]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [completing, setCompleting] = useState({})
  const [countdown, setCountdown]   = useState(REFRESH_INTERVAL)
  const [lastRefresh, setLastRefresh] = useState(null)
  // Modal nguyên liệu
  const [modalItem, setModalItem]   = useState(null) // { menu_item_id, name, quantity }
  const intervalRef = useRef(null)
  const { success, error: toastError } = useToast()

  const loadOrders = useCallback(async () => {
    try {
      const res = await api.get('/orders/preparing')
      const list = res.data
      setOrders(Array.isArray(list) ? list : [])
      setLastRefresh(new Date())
      setCountdown(REFRESH_INTERVAL)
    } catch {
      toastError('Không thể tải danh sách order')
    } finally {
      setLoading(false)
    }
  }, [toastError])

  useEffect(() => {
    loadOrders()
    intervalRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { loadOrders(); return REFRESH_INTERVAL }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [loadOrders])

  const handleComplete = useCallback(async (orderId) => {
    setCompleting(prev => ({ ...prev, [orderId]: true }))
    try {
      await api.put(`/orders/${orderId}/complete`)
      success(`Order #${orderId} hoàn thành! Thông báo phục vụ mang ra.`)
      loadOrders()
    } catch (err) {
      toastError(err.response?.data?.error || 'Không cập nhật được')
    } finally {
      setCompleting(prev => ({ ...prev, [orderId]: false }))
    }
  }, [success, toastError, loadOrders])

  const handleItemClick = useCallback((item) => {
    setModalItem({
      menu_item_id: item.menu_item_id,
      name:         item.name,
      quantity:     item.quantity,
    })
  }, [])

  const criticalCount = orders.filter(o => urgency(o.created_at) === 'critical').length
  const warningCount  = orders.filter(o => urgency(o.created_at) === 'warning').length

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar title="Pha Chế" />

      <div className="p-4 max-w-6xl mx-auto w-full flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-gray-800">Hàng Đợi Pha Chế</h2>
            {orders.length > 0 && (
              <span className="badge-preparing text-sm px-3 py-1">{orders.length} đơn</span>
            )}
            {criticalCount > 0 && (
              <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full animate-pulse inline-flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.5} />
                {criticalCount} khẩn cấp
              </span>
            )}
            {warningCount > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full inline-flex items-center gap-1">
                <Hourglass className="h-3.5 w-3.5" strokeWidth={2} />
                {warningCount} đang chậm
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-4 h-4 rounded-full border-2 border-gray-200 relative overflow-hidden">
                <div
                  className="absolute bottom-0 left-0 right-0 bg-amber-400 transition-all"
                  style={{ height: `${(countdown / REFRESH_INTERVAL) * 100}%` }}
                />
              </div>
              Làm mới sau {countdown}s
            </div>
            <button type="button" onClick={loadOrders} className="btn-secondary text-sm inline-flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4" strokeWidth={2} />
              Làm mới ngay
            </button>
          </div>
        </div>

        {/* Urgency legend */}
        {orders.length > 0 && (
          <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block"/>0–5 phút</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"/>5–10 phút</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"/>&gt;10 phút (khẩn)</span>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <SkeletonOrderCards count={3} />
        ) : orders.length === 0 ? (
          <div className="text-center py-24">
            <div className="mb-4 flex justify-center opacity-25">
              <Coffee className="h-20 w-20 text-gray-400" strokeWidth={1.25} />
            </div>
            <h3 className="text-xl font-bold text-gray-400">Chưa có đơn hàng</h3>
            <p className="text-sm text-gray-400 mt-2">Tự động làm mới sau {countdown} giây</p>
            {lastRefresh && (
              <p className="text-xs text-gray-300 mt-1">
                Cập nhật lần cuối: {lastRefresh.toLocaleTimeString('vi-VN')}
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
            {orders.map(order => (
              <OrderCard
                key={order.order_id}
                order={order}
                onComplete={() => handleComplete(order.order_id)}
                completing={!!completing[order.order_id]}
                onItemClick={handleItemClick}
              />
            ))}
          </div>
        )}

        {orders.length > 0 && (
          <p className="text-center text-xs text-gray-400 mt-6">
            Tự động làm mới sau {countdown}s
            {lastRefresh && ` • Cập nhật: ${lastRefresh.toLocaleTimeString('vi-VN')}`}
          </p>
        )}
      </div>

      {/* Modal nguyên liệu */}
      {modalItem && (
        <IngredientModal
          item={modalItem}
          quantity={modalItem.quantity}
          onClose={() => setModalItem(null)}
        />
      )}
    </div>
  )
}
