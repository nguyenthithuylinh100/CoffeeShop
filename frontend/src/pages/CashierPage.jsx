import { useState, useEffect, useCallback, useRef } from 'react'
import Navbar       from '../components/Navbar'
import TableStatus  from '../components/TableStatus'
import MenuDisplay  from '../components/MenuDisplay'
import OrderPanel   from '../components/OrderPanel'
import PaymentPanel from '../components/PaymentPanel'
import { SkeletonTableGrid, SkeletonMenuList, SkeletonBillList } from '../components/Skeleton'
import { useToast } from '../context/ToastContext'
import api from '../services/api'
import {
  ClipboardList,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Hourglass,
  StickyNote,
  Check,
  Package,
  Send,
  ShoppingBag,
  Armchair,
  ShoppingCart,
  Wallet,
  X,
  Keyboard,
  MousePointerClick,
  Radio,
  CreditCard,
  Loader2,
} from 'lucide-react'

const TAKEAWAY_TABLE = { table_id: 0, table_number: 'Mang đi', status: 'Available' }

function fmt(n) {
  return new Intl.NumberFormat('vi-VN').format(n) + '₫'
}

function isOrderCompleted(status) {
  return String(status || '').trim().toLowerCase() === 'completed'
}

function normalizeBill(raw) {
  const orders = Array.isArray(raw?.orders) ? raw.orders : []
  const ordersStatus = Array.isArray(raw?.orders_status) ? raw.orders_status : orders
  const total = ordersStatus.length
  const completed = ordersStatus.filter(o => isOrderCompleted(o?.status)).length
  const isReady = total > 0 && completed === total
  return {
    ...raw,
    orders,
    orders_status: ordersStatus,
    is_ready: typeof raw?.is_ready === 'boolean' ? raw.is_ready : isReady,
  }
}

/** Panel "Đơn đã đặt" — giữ nguyên từ bản gốc */
function ExistingOrdersPanel({ tableOrders, loading }) {
  const [collapsed, setCollapsed] = useState(false)
  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="space-y-2">
          <div className="h-10 bg-gray-100 rounded-xl" />
          <div className="h-10 bg-gray-100 rounded-xl" />
        </div>
      </div>
    )
  }
  if (!tableOrders?.orders?.length) return null
  const totalItems = tableOrders.orders.reduce(
    (s, o) => s + (o.items?.reduce((ss, i) => ss + i.quantity, 0) ?? 0), 0
  )
  return (
    <div className="card border-l-4 border-orange-400">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-amber-700 shrink-0" strokeWidth={2} />
          <span className="text-base font-bold text-gray-800">Đơn đã đặt</span>
          <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {tableOrders.orders.length} order • {totalItems} món
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-amber-700">{fmt(tableOrders.amount)}</span>
          <button onClick={() => setCollapsed(c => !c)} className="text-gray-400 hover:text-gray-600 text-xs font-medium inline-flex items-center gap-1">
            {collapsed ? <><ChevronDown className="h-3.5 w-3.5" /> Mở rộng</> : <><ChevronUp className="h-3.5 w-3.5" /> Thu gọn</>}
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {tableOrders.orders.map(order => (
            <div key={order.order_id} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500">Order #{order.order_id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isOrderCompleted(order.status) ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {isOrderCompleted(order.status) ? (
                      <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} /> Hoàn thành</span>
                    ) : (
                      <span className="inline-flex items-center gap-1"><Hourglass className="h-3.5 w-3.5" strokeWidth={2} /> Đang pha</span>
                    )}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="space-y-1">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between text-sm">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="bg-white border border-gray-200 text-gray-600 text-xs font-bold min-w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                        {item.quantity}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-700 font-medium truncate block">{item.name}</span>
                        {item.note && (
                          <span className="text-xs text-amber-600 italic inline-flex items-start gap-1 mt-0.5">
                            <StickyNote className="h-3.5 w-3.5 shrink-0 mt-0.5" strokeWidth={2} />
                            {item.note}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 font-medium shrink-0 ml-2">
                      {fmt(item.subtotal ?? item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {!collapsed && (
        <div className="mt-3 pt-2 border-t border-orange-100 flex justify-between items-center">
          <span className="text-xs text-gray-500">Tổng bill hiện tại</span>
          <span className="font-bold text-amber-700">{fmt(tableOrders.amount)}</span>
        </div>
      )}
    </div>
  )
}

/** Badge trạng thái order trong tracker */
function OrderStatusBadge({ status }) {
  if (isOrderCompleted(status))
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold inline-flex items-center gap-1">
        <Check className="h-3 w-3" strokeWidth={3} /> Xong
      </span>
    )
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold animate-pulse inline-flex items-center gap-1">
      <Hourglass className="h-3 w-3" strokeWidth={2} /> Đang pha
    </span>
  )
}

/** Panel theo dõi tiến trình barista (tab Thanh Toán) */
function BaristaTracker({ bills, onRefresh }) {
  const pending = bills.filter(b => !b.is_ready)
  const ready   = bills.filter(b => b.is_ready)
  if (!bills.length) return null
  return (
    <div className="mb-4">
      {pending.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold text-amber-700 inline-flex items-center gap-1.5">
              <Hourglass className="h-4 w-4 shrink-0" strokeWidth={2} />
              Đang pha chế ({pending.length} bill)
            </span>
            <button onClick={onRefresh} className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline">Làm mới</button>
          </div>
          <div className="space-y-2">
            {pending.map(bill => (
              <div key={bill.bill_id} className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-amber-800 text-sm">
                    {bill.table_number === 0 ? (
                      <span className="inline-flex items-center gap-1"><Package className="h-4 w-4 shrink-0" strokeWidth={2} /> Mang đi</span>
                    ) : (
                      `Bàn ${bill.table_number}`
                    )}
                  </span>
                  <span className="text-xs text-amber-600 font-medium">
                    {bill.orders_status?.filter(o => isOrderCompleted(o?.status)).length ?? 0}
                    /{bill.orders_status?.length ?? 0} order xong
                  </span>
                </div>
                <div className="space-y-1">
                  {bill.orders_status?.map(ord => (
                    <div key={ord.order_id} className="flex items-center gap-2">
                      <OrderStatusBadge status={ord.status} />
                      <span className="text-xs text-gray-600">
                        Order #{ord.order_id} — {ord.items?.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {ready.length > 0 && (
        <div className="mb-3">
          <span className="text-sm font-bold text-emerald-700 inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} />
            Sẵn sàng thanh toán ({ready.length} bill)
          </span>
        </div>
      )}
    </div>
  )
}

// UC1 + UC2 + UC3 + UC4 + UC5
export default function CashierPage() {
  const [tables, setTables]               = useState([])
  const [menuItems, setMenuItems]         = useState([])
  const [unpaidBills, setUnpaidBills]     = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [orderItems, setOrderItems]       = useState([])
  const [activeTab, setActiveTab]         = useState('order')
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [occupiedDialog, setOccupiedDialog] = useState(null)
  const [successDialog, setSuccessDialog]   = useState(null)
  const [tableOrders, setTableOrders]       = useState(null)
  const [tableOrdersLoading, setTableOrdersLoading] = useState(false)
  // Skeleton loading states
  const [loadingTables, setLoadingTables] = useState(true)
  const [loadingMenu, setLoadingMenu]     = useState(true)
  const [loadingBills, setLoadingBills]     = useState(true)
  const [billsInitialized, setBillsInitialized] = useState(false)

  const pollRef = useRef(null)
  const { success, error, info } = useToast()

  /* ── Load bills riêng để poll không re-trigger skeleton ── */
  const loadBills = useCallback(async () => {
    try {
      const res = await api.get('/payment/bills/unpaid')
      const normalized = Array.isArray(res.data) ? res.data.map(normalizeBill) : []
      setUnpaidBills(normalized)
    } catch {} finally {
      setLoadingBills(false)
      setBillsInitialized(true)
    }
  }, [])

  /* ── Load tất cả lần đầu ── */
  const loadData = useCallback(async () => {
    try {
      setLoadingTables(true); setLoadingMenu(true)
      const [t, m, b] = await Promise.all([
        api.get('/tables'),
        api.get('/menu'),
        api.get('/payment/bills/unpaid'),
      ])
      setTables(t.data)
      setMenuItems(m.data)
      const normalized = Array.isArray(b.data) ? b.data.map(normalizeBill) : []
      setUnpaidBills(normalized)
    } catch {
      error('Không thể tải dữ liệu')
    } finally {
      setLoadingTables(false); setLoadingMenu(false); setLoadingBills(false)
      setBillsInitialized(true)
    }
  }, [error])

  useEffect(() => {
    loadData()
    // Poll bills mỗi 10s để cập nhật tiến trình barista
    pollRef.current = setInterval(loadBills, 10000)
    return () => clearInterval(pollRef.current)
  }, [loadData, loadBills])

  /* ── Load orders của bàn được chọn ── */
  const loadTableOrders = useCallback(async (tableId) => {
    if (!tableId || tableId === TAKEAWAY_TABLE.table_id) { setTableOrders(null); return }
    setTableOrdersLoading(true)
    try {
      const res = await api.get(`/orders/table/${tableId}`)
      setTableOrders(res.data)
    } catch {
      setTableOrders(null)
    } finally {
      setTableOrdersLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTableOrders(selectedTable?.table_id ?? null)
  }, [selectedTable, loadTableOrders])

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (e.key === 'Escape') {
        setOccupiedDialog(null)
        setSuccessDialog(null)
        return
      }
      if (e.key === 'Enter' && orderItems.length > 0 && selectedTable) {
        handleConfirmOrder()
        return
      }
      const num = parseInt(e.key)
      if (!isNaN(num) && num >= 1 && num <= 9 && tables[num - 1]) {
        const t = tables[num - 1]
        if (t.status === 'Occupied') { setOccupiedDialog(t); return }
        setSelectedTable(t); setOrderItems([])
        info(`Đã chọn Bàn ${t.table_number}`)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables, orderItems, selectedTable])

  /* ── Table selection ── */
  const handleSelectTable = (table) => {
    if (table.status === 'Occupied') { setOccupiedDialog(table); return }
    setSelectedTable(table); setOrderItems([])
  }

  const handleOccupiedConfirm = (yes) => {
    if (yes) { setSelectedTable(occupiedDialog); setOrderItems([]) }
    setOccupiedDialog(null)
  }

  /* ── Cart actions ── */
  const handleAddItem = (item) => {
    setOrderItems(prev => {
      const idx = prev.findIndex(i => i.menu_item_id === item.menu_item_id)
      if (idx >= 0) return prev.map((i, n) => n === idx ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { ...item, quantity: 1, note: '' }]
    })
  }
  const handleChangeQty = (idx, qty) => {
    if (qty <= 0) setOrderItems(prev => prev.filter((_, i) => i !== idx))
    else setOrderItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: qty } : item))
  }
  const handleChangeNote = (idx, note) =>
    setOrderItems(prev => prev.map((item, i) => i === idx ? { ...item, note } : item))
  const handleRemove = (idx) => setOrderItems(prev => prev.filter((_, i) => i !== idx))

  /* ── Confirm order ── */
  const handleConfirmOrder = useCallback(async () => {
    if (!selectedTable || !orderItems.length) return
    setConfirmLoading(true)
    try {
      const res = await api.post('/orders', {
        table_id: selectedTable.table_id,
        items: orderItems.map(i => ({
          menu_item_id: i.menu_item_id,
          quantity: i.quantity,
          note: i.note || null,
        })),
      })
      setSuccessDialog({
        table: selectedTable.table_number,
        order_id: res.data.order_id,
        items: orderItems,
      })
      setOrderItems([])
      loadData()
      loadTableOrders(selectedTable.table_id)
    } catch (err) {
      error(err.response?.data?.error || 'Lỗi tạo order')
    } finally {
      setConfirmLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTable, orderItems, error, loadData, loadTableOrders])

  const readyCount   = unpaidBills.filter(b => b.is_ready).length
  const pendingCount = unpaidBills.filter(b => !b.is_ready).length

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar title="Thu Ngân" />

      {/* Keyboard hint bar */}
      <div className="bg-amber-50 border-b border-amber-100 px-4 py-1.5 hidden sm:flex items-center gap-4 text-xs text-amber-700">
        <span className="inline-flex items-center gap-1.5"><Keyboard className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> Phím tắt:</span>
        <span><kbd className="bg-white border border-amber-200 rounded px-1 font-mono">1–9</kbd> chọn bàn</span>
        <span><kbd className="bg-white border border-amber-200 rounded px-1 font-mono">Enter</kbd> xác nhận order</span>
        <span><kbd className="bg-white border border-amber-200 rounded px-1 font-mono">Esc</kbd> đóng dialog</span>
      </div>

      {/* Dialog: bàn đang có khách */}
      {occupiedDialog && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Armchair className="h-9 w-9 text-orange-600" strokeWidth={1.75} />
              </div>
              <h3 className="font-bold text-gray-800 text-lg">Bàn {occupiedDialog.table_number} đang có khách</h3>
              <p className="text-sm text-gray-500 mt-1">Bạn có muốn gọi thêm món cho bàn này không?</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleOccupiedConfirm(false)} className="btn-secondary flex-1">Chọn bàn khác</button>
              <button onClick={() => handleOccupiedConfirm(true)} className="btn-primary flex-1">Gọi thêm món</button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog: order success */}
      {successDialog && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="text-center mb-4">
              <div className="mb-3 flex justify-center">
                <Send className="h-14 w-14 text-amber-500" strokeWidth={1.5} />
              </div>
              <h3 className="font-bold text-gray-800 text-lg">Order đã gửi Barista!</h3>
              <p className="text-sm text-gray-500 mt-1 inline-flex items-center gap-1.5 justify-center flex-wrap">
                {successDialog.table === 'Mang đi' ? (
                  <><Package className="h-4 w-4 shrink-0 text-amber-600" strokeWidth={2} /> Mang đi</>
                ) : (
                  `Bàn ${successDialog.table}`
                )}
                {' '}— Order #{successDialog.order_id}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              {successDialog.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-0.5">
                  <span className="text-gray-700">{item.name}</span>
                  <span className="font-semibold text-gray-600">× {item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setSuccessDialog(null); setSelectedTable(null) }} className="btn-secondary flex-1">
                Chọn bàn mới
              </button>
              <button onClick={() => setSuccessDialog(null)} className="btn-primary flex-1">
                {successDialog.table === 'Mang đi' ? 'Thêm đơn' : `Thêm cho Bàn ${successDialog.table}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          <button
            onClick={() => setActiveTab('order')}
            className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'order' ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <ShoppingCart className="h-4 w-4 shrink-0" strokeWidth={2} />
              Tạo Order
            </span>
          </button>
          <button
            onClick={() => setActiveTab('payment')}
            className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'payment' ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Wallet className="h-4 w-4 shrink-0" strokeWidth={2} />
              Thanh Toán
            </span>
            {readyCount > 0 && (
              <span className="ml-1.5 bg-emerald-500 text-white text-xs rounded-full w-4 h-4 inline-flex items-center justify-center">
                {readyCount}
              </span>
            )}
            {pendingCount > 0 && (
              <span className="ml-1 bg-amber-400 text-white text-xs rounded-full w-4 h-4 inline-flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 max-w-7xl mx-auto w-full">
        {activeTab === 'order' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Col 1+2 */}
            <div className="lg:col-span-2 space-y-4">
              <div className="card">
                <div className="mb-3 pb-3 border-b border-gray-100">
                  <button
                    onClick={() => { setSelectedTable(TAKEAWAY_TABLE); setOrderItems([]) }}
                    className={`w-full rounded-xl border-2 px-4 py-2.5 text-left transition-colors ${
                      selectedTable?.table_id === TAKEAWAY_TABLE.table_id
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-sky-200 bg-sky-50 hover:border-sky-400'
                    }`}
                  >
                    <div className="font-semibold text-gray-800 inline-flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5 text-sky-700 shrink-0" strokeWidth={2} />
                      Mua về (Mang đi)
                    </div>
                    <div className="text-xs text-gray-500">Không cần chọn bàn trong quán</div>
                  </button>
                </div>
                {loadingTables
                  ? <SkeletonTableGrid count={8} />
                  : <TableStatus tables={tables} selectedTableId={selectedTable?.table_id ?? null} onSelect={handleSelectTable} />
                }
              </div>

              {selectedTable ? (
                <>
                  <ExistingOrdersPanel tableOrders={tableOrders} loading={tableOrdersLoading} />
                  <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="bg-amber-100 text-amber-800 text-sm font-bold px-3 py-1 rounded-full">
                        {selectedTable.table_id === TAKEAWAY_TABLE.table_id
                          ? 'Đơn mang đi'
                          : `Bàn ${selectedTable.table_number}`}
                      </span>
                      <span className={selectedTable.status === 'Occupied' ? 'badge-occupied' : 'badge-available'}>
                        {selectedTable.status === 'Occupied' ? 'Đang có khách' : 'Trống'}
                      </span>
                      {tableOrders?.orders?.length > 0 && (
                        <span className="text-xs text-gray-400 ml-1">
                          • {tableOrders.orders.length} order trước đó
                        </span>
                      )}
                      <button
                        onClick={() => { setSelectedTable(null); setOrderItems([]) }}
                        className="ml-auto text-gray-400 hover:text-gray-600 text-sm"
                      >
                        <span className="inline-flex items-center gap-1">
                          Đổi bàn <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </span>
                      </button>
                    </div>
                    {loadingMenu
                      ? <SkeletonMenuList count={5} />
                      : <MenuDisplay menuItems={menuItems} onAddItem={handleAddItem} />
                    }
                  </div>
                </>
              ) : (
                <div className="card text-center py-14">
                  <div className="mb-3 flex justify-center opacity-40">
                    <MousePointerClick className="h-14 w-14 text-gray-400" strokeWidth={1.25} />
                  </div>
                  <p className="text-gray-400 font-medium">Chọn một bàn để bắt đầu tạo order</p>
                  <p className="text-xs text-gray-300 mt-2">Hoặc nhấn phím 1–9 để chọn nhanh</p>
                </div>
              )}
            </div>

            {/* Col 3: Cart */}
            <div className="card flex flex-col" style={{ minHeight: 520 }}>
              {selectedTable ? (
                <OrderPanel
                  orderItems={orderItems}
                  onRemove={handleRemove}
                  onChangeQty={handleChangeQty}
                  onChangeNote={handleChangeNote}
                  onConfirm={handleConfirmOrder}
                  loading={confirmLoading}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                  <div className="mb-3 flex justify-center text-gray-300">
                    <ShoppingCart className="h-14 w-14" strokeWidth={1.25} />
                  </div>
                  <p className="text-sm text-gray-400 font-medium">Chọn bàn trước</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Tab Thanh Toán ── */
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Barista tracker */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700 inline-flex items-center gap-2">
                  <Radio className="h-4 w-4 text-amber-600 shrink-0" strokeWidth={2} />
                  Tiến trình pha chế
                </h3>
                <span className="text-xs text-gray-400">Tự cập nhật mỗi 10s</span>
              </div>
              {!billsInitialized ? (
                <SkeletonBillList count={2} />
              ) : (
                <>
                  <BaristaTracker bills={unpaidBills} onRefresh={loadBills} />
                  {!unpaidBills.length && (
                    <p className="text-sm text-gray-400 text-center py-4">Không có bill nào đang mở</p>
                  )}
                </>
              )}
            </div>

            {/* Payment panel */}
            <div className="card">
              <h3 className="text-sm font-bold text-gray-700 mb-1 inline-flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-amber-700 shrink-0" strokeWidth={2} />
                Thanh toán
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                Chỉ thanh toán được khi barista đã hoàn thành <strong>tất cả</strong> món.
                Bàn tự giải phóng sau khi thanh toán thành công.
              </p>
              {/* KHÔNG dùng loadingBills ở đây — sẽ unmount PaymentPanel và mất state modal */}
              {!billsInitialized ? (
                <SkeletonBillList count={2} />
              ) : (
                <PaymentPanel
                  bills={unpaidBills.filter(b => b.is_ready)}
                  onPaymentSuccess={loadData}
                  onRefresh={loadBills}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
