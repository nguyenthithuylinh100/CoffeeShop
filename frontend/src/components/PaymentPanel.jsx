import { useEffect, useState, useCallback } from 'react'
import {
  RefreshCw, CheckCircle2, Clock, PartyPopper,
  Banknote, Smartphone, CreditCard, AlertTriangle,
  XCircle, RotateCw, Printer, ArrowLeft,
  UserPlus, Star, Phone, X, Gift, Search, FileText,
} from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import InvoiceModal from './InvoiceModal'

/* ─────────────────────────────── helpers ──────────────────────────────────── */

// ── Cấu hình VietQR — đổi thành STK thật của quán ──────────────────────────
const BANK_CONFIG = {
  bankId:      'MB',           // mã ngân hàng VietQR (MB, VCB, TCB, ACB...)
  accountNo:   '0961688109',   // số tài khoản quán
  accountName: 'COFFEE SHOP',  // tên chủ tài khoản (IN HOA, không dấu)
}
// ────────────────────────────────────────────────────────────────────────────

function buildVietQR(amount, description) {
  const { bankId, accountNo, accountName } = BANK_CONFIG
  const desc = encodeURIComponent(description ?? 'Thanh toan')
  const name = encodeURIComponent(accountName)
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-qr_only.png?amount=${amount}&addInfo=${desc}&accountName=${name}`
}

function fmt(n) {
  return new Intl.NumberFormat('vi-VN').format(n) + '₫'
}

function isOrderCompleted(status) {
  return String(status || '').trim().toLowerCase() === 'completed'
}

function pointsToEarn(amount) {
  return Math.floor(parseFloat(amount) / 10_000)
}

/* ─────────────────────────── level styling ────────────────────────────────── */

const LEVEL = {
  Gold:   { bg: 'bg-yellow-50 border-yellow-300', badge: 'bg-yellow-100 text-yellow-800', icon: '🥇' },
  Silver: { bg: 'bg-gray-50  border-gray-300',    badge: 'bg-gray-100  text-gray-700',    icon: '🥈' },
  Normal: { bg: 'bg-blue-50  border-blue-200',    badge: 'bg-blue-100  text-blue-700',    icon: '⭐' },
}

function levelStyle(level) {
  return LEVEL[level] || LEVEL.Normal
}

/* ────────────────────────── Spinner inline ─────────────────────────────────── */

function Spinner({ className = 'w-4 h-4 border-white' }) {
  return (
    <span className={`animate-spin border-2 border-t-transparent rounded-full inline-block ${className}`} />
  )
}

/* ────────────────────────── CustomerBadge ──────────────────────────────────── */

function CustomerBadge({ customer, onRemove }) {
  const lvl = levelStyle(customer.member_level)
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border mb-3 ${lvl.bg}`}>
      <span className="text-base">{lvl.icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-gray-800">{customer.name}</span>
        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${lvl.badge}`}>{customer.member_level}</span>
      </div>
      <span className="text-xs text-purple-700 font-medium shrink-0">
        {customer.points.toLocaleString('vi-VN')} điểm
      </span>
      {onRemove && (
        <button type="button" onClick={onRemove} className="text-gray-400 hover:text-gray-600 ml-1" title="Bỏ hội viên">
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      )}
    </div>
  )
}

/* ──────────────────────────── LoyaltyPanel ─────────────────────────────────── */
/*
  Modes:
    ask      → banner hỏi có hội viên không
    search   → nhập SĐT tìm kiếm
    found    → tìm thấy, xác nhận dùng
    register → chưa có, gợi ý đăng ký
*/

function LoyaltyPanel({ onSelect, onSkip }) {
  const [mode,     setMode]     = useState('ask')
  const [phone,    setPhone]    = useState('')
  const [form,     setForm]     = useState({ name: '', phone: '', email: '' })
  const [customer, setCustomer] = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [err,      setErr]      = useState('')

  /* search by phone */
  const searchByPhone = async (p) => {
    const q = (p ?? phone).trim()
    if (!q) return
    setLoading(true)
    setErr('')
    try {
      const res = await api.get(`/customers/phone`, { params: { q } })
      setCustomer(res.data)
      setMode('found')
    } catch (e) {
      if (e.response?.status === 404) {
        setForm(f => ({ ...f, phone: q }))
        setMode('register')
      } else {
        setErr(e.response?.data?.error || 'Lỗi kết nối, thử lại')
      }
    } finally {
      setLoading(false)
    }
  }

  /* register new member */
  const register = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      setErr('Vui lòng nhập họ tên và số điện thoại')
      return
    }
    setLoading(true)
    setErr('')
    try {
      const res = await api.post('/customers', form)
      setCustomer(res.data)
      setMode('found')
    } catch (e) {
      setErr(e.response?.data?.error || 'Không thể đăng ký, thử lại')
    } finally {
      setLoading(false)
    }
  }

  /* ── ASK ── */
  if (mode === 'ask') return (
    <div className="border border-purple-200 bg-purple-50 rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Star className="h-4 w-4 text-purple-600 shrink-0" strokeWidth={2} />
        <p className="text-sm font-semibold text-purple-800">Tích điểm hội viên</p>
        <span className="text-xs text-purple-400 ml-auto">Tuỳ chọn</span>
      </div>
      <p className="text-xs text-purple-600 mb-3 leading-relaxed">
        1 điểm mỗi 10.000₫ &nbsp;·&nbsp; Silver ≥ 50đ &nbsp;·&nbsp; Gold ≥ 200đ
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('search')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          <Phone className="h-3.5 w-3.5" strokeWidth={2} />
          Nhập SĐT hội viên
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
          Bỏ qua
        </button>
      </div>
    </div>
  )

  /* ── SEARCH ── */
  if (mode === 'search') return (
    <div className="border border-purple-200 bg-purple-50 rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Search className="h-4 w-4 text-purple-600 shrink-0" strokeWidth={2} />
        <p className="text-sm font-semibold text-purple-800">Tìm hội viên theo SĐT</p>
        <button type="button" onClick={() => { setMode('ask'); setErr('') }} className="ml-auto text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type="tel"
          className="input-field flex-1"
          placeholder="Số điện thoại..."
          value={phone}
          onChange={e => { setPhone(e.target.value); setErr('') }}
          onKeyDown={e => e.key === 'Enter' && searchByPhone()}
          autoFocus
        />
        <button
          type="button"
          onClick={() => searchByPhone()}
          disabled={loading || !phone.trim()}
          className="btn-primary px-4 disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {loading ? <Spinner /> : 'Tìm'}
        </button>
      </div>

      {err && <p className="text-xs text-red-600 mt-2">{err}</p>}

      <button
        type="button"
        onClick={onSkip}
        className="text-xs text-gray-400 hover:text-gray-600 mt-2 underline w-full text-center"
      >
        Không có hội viên — thanh toán bình thường
      </button>
    </div>
  )

  /* ── REGISTER ── */
  if (mode === 'register') return (
    <div className="border border-emerald-200 bg-emerald-50 rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <UserPlus className="h-4 w-4 text-emerald-700 shrink-0" strokeWidth={2} />
        <p className="text-sm font-semibold text-emerald-800">Đăng ký hội viên mới</p>
        <button type="button" onClick={() => { setMode('search'); setErr('') }} className="ml-auto text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <p className="text-xs text-emerald-700 mb-3 leading-relaxed">
        SĐT <strong>{form.phone}</strong> chưa đăng ký.
        Đăng ký ngay để bắt đầu tích điểm từ lần này!
      </p>

      <div className="flex flex-col gap-2">
        <input
          type="text"
          className="input-field"
          placeholder="Họ và tên *"
          value={form.name}
          onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErr('') }}
          autoFocus
        />
        <input
          type="tel"
          className="input-field"
          placeholder="Số điện thoại *"
          value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
        />
        <input
          type="email"
          className="input-field"
          placeholder="Email (tuỳ chọn)"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
        />
      </div>

      {err && <p className="text-xs text-red-600 mt-2">{err}</p>}

      <div className="flex gap-2 mt-3">
        <button type="button" onClick={onSkip} className="flex-1 btn-secondary text-sm">
          Bỏ qua
        </button>
        <button
          type="button"
          onClick={register}
          disabled={loading || !form.name.trim() || !form.phone.trim()}
          className="flex-1 btn-success text-sm inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {loading
            ? <Spinner />
            : <><UserPlus className="h-4 w-4" strokeWidth={2} />Đăng ký & tích điểm</>}
        </button>
      </div>
    </div>
  )

  /* ── FOUND ── */
  if (mode === 'found' && customer) {
    const lvl = levelStyle(customer.member_level)
    return (
      <div className={`border rounded-2xl p-4 mb-4 ${lvl.bg}`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 text-xl">
            {lvl.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-800">{customer.name}</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${lvl.badge}`}>
                {customer.member_level}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{customer.phone}</p>
            <p className="text-sm font-semibold text-purple-700 mt-1 inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-purple-500" strokeWidth={2} />
              {customer.points.toLocaleString('vi-VN')} điểm tích luỹ
            </p>
          </div>
          <button type="button" onClick={() => { setMode('search'); setErr('') }} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          <button type="button" onClick={onSkip} className="flex-1 btn-secondary text-sm">
            Không dùng
          </button>
          <button
            type="button"
            onClick={() => onSelect(customer)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
            Dùng hội viên & tích điểm
          </button>
        </div>
      </div>
    )
  }

  return null
}

/* ──────────────────────────── BillSummary ──────────────────────────────────── */

function BillSummary({ bill, customer, progress, discount = 0, pointsUsed = 0 }) {
  const finalAmt = Math.max(0, parseFloat(bill.amount) - discount)
  return (
    <div className="bg-gray-50 rounded-xl p-3 mb-4 max-h-52 overflow-y-auto">

      {/* order readiness banner */}
      {progress && (
        <div className={`mb-3 rounded-xl px-3 py-2 text-xs font-medium border inline-flex items-start gap-2 w-full ${
          progress.allCompleted
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-orange-50 text-orange-700 border-orange-200'
        }`}>
          {progress.allCompleted
            ? <><CheckCircle2 className="h-4 w-4 shrink-0 mt-px" strokeWidth={2} />Tất cả {progress.total} order hoàn thành</>
            : <><Clock className="h-4 w-4 shrink-0 mt-px" strokeWidth={2} />Còn {progress.pending} order đang pha chế</>
          }
        </div>
      )}

      {/* order items */}
      {bill.orders?.map(order => (
        <div key={order.order_id} className="mb-2 last:mb-0">
          <p className="text-xs font-bold text-gray-400 mb-1 flex items-center gap-2">
            <span>Order #{order.order_id}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              isOrderCompleted(order.status) ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {isOrderCompleted(order.status) ? 'Đã xong' : 'Đang pha'}
            </span>
          </p>
          {order.items?.map(item => (
            <div key={item.order_item_id} className="flex justify-between text-sm py-0.5">
              <span className="text-gray-700">{item.name} × {item.quantity}</span>
              <span className="text-gray-500 font-medium">{fmt(item.subtotal)}</span>
            </div>
          ))}
        </div>
      ))}

      {/* total */}
      <div className="divider" />
      {discount > 0 && (
        <div className="flex justify-between text-sm text-purple-600 mb-1">
          <span className="inline-flex items-center gap-1"><Gift className="h-3.5 w-3.5" strokeWidth={2} />Giảm điểm ({pointsUsed} điểm)</span>
          <span className="font-semibold">− {fmt(discount)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold">
        <span>Còn phải trả</span>
        <span className={discount > 0 ? "text-emerald-700" : "text-amber-700"}>{fmt(finalAmt)}</span>
      </div>

      {/* points to earn preview */}
      {customer && (
        <div className="mt-1 flex justify-between text-xs text-purple-600">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3" strokeWidth={2} />
            Điểm sẽ nhận
          </span>
          <span className="font-semibold">+{pointsToEarn(finalAmt)} điểm</span>
        </div>
      )}
    </div>
  )
}


/* ─────────────────────── RedeemPanel (đổi điểm giảm giá) ───────────────────── */

function RedeemPanel({ customer, bill, onConfirm, onSkip }) {
  const [points,  setPoints]  = useState('')
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState('')

  const maxPoints = Math.min(
    customer.points,
    Math.floor(parseFloat(bill.amount) / 1000)   // 1 điểm = 1.000₫
  )

  const calcPreview = async (val) => {
    const pts = parseInt(val)
    if (!pts || pts <= 0) { setPreview(null); setErr(''); return }
    if (pts > customer.points) { setErr(`Vượt quá điểm hiện có (${customer.points})`); setPreview(null); return }
    setLoading(true); setErr('')
    try {
      const res = await api.post('/payment/preview-redeem', {
        customer_id:      customer.customer_id,
        points_to_redeem: pts,
        bill_amount:      parseFloat(bill.amount),
      })
      setPreview(res.data)
    } catch (e) {
      setErr(e.response?.data?.error || 'Không tính được')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (v) => {
    setPoints(v)
    if (!v) { setPreview(null); setErr(''); return }
    calcPreview(v)
  }

  const useAll = () => { handleChange(String(maxPoints)) }

  return (
    <div className="border border-purple-200 bg-purple-50 rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="h-4 w-4 text-purple-600 shrink-0" strokeWidth={2} />
        <p className="text-sm font-semibold text-purple-800">Đổi điểm giảm giá</p>
        <span className="text-xs text-purple-400 ml-auto">Tuỳ chọn</span>
      </div>

      {/* điểm hiện có */}
      <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2 mb-3 border border-purple-100">
        <span className="text-xs text-gray-500">Điểm hiện có</span>
        <span className="font-bold text-purple-700 inline-flex items-center gap-1">
          <Star className="h-3.5 w-3.5" strokeWidth={2} />
          {customer.points.toLocaleString('vi-VN')} điểm
        </span>
      </div>

      {/* nhập điểm */}
      <div className="flex gap-2 mb-2">
        <div className="flex-1">
          <input
            type="number"
            className="input-field"
            placeholder={`Nhập số điểm (tối đa ${maxPoints})...`}
            value={points}
            min={1}
            max={maxPoints}
            onChange={e => handleChange(e.target.value)}
          />
        </div>
        {maxPoints > 0 && (
          <button
            type="button"
            onClick={useAll}
            className="shrink-0 px-3 py-2 rounded-xl border border-purple-300 text-purple-700 text-xs font-semibold hover:bg-purple-100 transition-colors"
          >
            Dùng hết
          </button>
        )}
      </div>

      {err && <p className="text-xs text-red-500 mb-2">{err}</p>}

      {/* preview kết quả */}
      {loading && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <Spinner className="w-3 h-3 border-purple-400" /> Đang tính...
        </div>
      )}

      {preview && !loading && (
        <div className="bg-white rounded-xl border border-emerald-200 px-3 py-2.5 mb-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Tổng bill gốc</span>
            <span className="font-medium text-gray-700">{fmt(bill.amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-purple-600">Giảm ({preview.points_used} điểm)</span>
            <span className="font-semibold text-purple-700">− {fmt(preview.discount)}</span>
          </div>
          <div className="divider my-1" />
          <div className="flex justify-between text-sm font-bold">
            <span className="text-gray-800">Còn phải trả</span>
            <span className="text-emerald-700 text-base">{fmt(preview.final_amount)}</span>
          </div>
          <p className="text-xs text-gray-400">
            Điểm còn lại sau khi đổi: <strong className="text-purple-700">{preview.points_remaining}</strong>
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={onSkip} className="flex-1 btn-secondary text-sm">
          Không đổi điểm
        </button>
        <button
          type="button"
          onClick={() => onConfirm(preview)}
          disabled={!preview || loading}
          className="flex-1 btn-primary text-sm disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
        >
          <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
          Áp dụng giảm giá
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────── Main PaymentPanel ─────────────────────────────── */

export default function PaymentPanel({ bills, onPaymentSuccess, onRefresh }) {
  const [selectedBill,  setSelectedBill]  = useState(null)
  const [step,          setStep]          = useState('select')   // select | loyalty | redeem | method | cash | qr | card | failed | done
  const [method,        setMethod]        = useState(null)
  const [cashReceived,  setCashReceived]  = useState('')
  const [loading,       setLoading]       = useState(false)
  const [refreshing,    setRefreshing]    = useState(false)
  const [failReason,    setFailReason]    = useState('')
  const [doneData,      setDoneData]      = useState(null)
  const [customer,      setCustomer]      = useState(null)
  const [redeem,        setRedeem]        = useState({ points: '', preview: null, loading: false, err: '' })
  const [qrLoaded,      setQrLoaded]      = useState(false)
  const [qrError,       setQrError]       = useState(false)
  const [showInvoice,   setShowInvoice]   = useState(false)
  const [paidBill,      setPaidBill]      = useState(null)  // snapshot bill khi thanh toán xong
  const [paidCustomer,  setPaidCustomer]  = useState(null)  // snapshot hội viên khi thanh toán xong
  const [paidDiscount,  setPaidDiscount]  = useState(null)  // snapshot giảm giá điểm khi thanh toán xong

  const { success: toastSuccess } = useToast()

  /* ── helpers ── */

  const getProgress = useCallback((bill) => {
    const orders = Array.isArray(bill?.orders_status)
      ? bill.orders_status
      : (bill?.orders || [])
    const total     = orders.length
    const completed = orders.filter(o => isOrderCompleted(o?.status)).length
    return { total, completed, pending: total - completed, allCompleted: total > 0 && completed === total }
  }, [])

  const reset = useCallback(() => {
    setSelectedBill(null)
    setStep('select')
    setMethod(null)
    setCashReceived('')
    setFailReason('')
    setDoneData(null)
    setCustomer(null)
    setRedeem({ points: '', preview: null, loading: false, err: '' })
    setQrLoaded(false)
    setQrError(false)
    setShowInvoice(false)
    setPaidBill(null)
    setPaidCustomer(null)
    setPaidDiscount(null)
  }, [])

  /* ── sync selected bill when list refreshes ── */
  useEffect(() => {
    if (!selectedBill) return
    if (step === 'done') return  // bill đã thanh toán xong, biến mất khỏi list là bình thường
    const latest = bills.find(b => b.bill_id === selectedBill.bill_id)
    if (!latest) { reset(); return }
    setSelectedBill(latest)
  }, [bills, step]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── auto-refresh every 10 s ── */
  useEffect(() => {
    if (!onRefresh) return
    const id = setInterval(() => onRefresh(), 10_000)
    return () => clearInterval(id)
  }, [onRefresh])

  const handleRefresh = async () => {
    if (!onRefresh) return
    setRefreshing(true)
    try { await onRefresh() } finally { setRefreshing(false) }
  }

  /* ── select bill → loyalty step ── */
  const handleSelectBill = (bill) => {
    setSelectedBill(bill)
    setStep('loyalty')
    setMethod(null)
    setCashReceived('')
    setFailReason('')
    setCustomer(null)
    setQrLoaded(false)
    setQrError(false)
  }

  /* ── loyalty callbacks ── */
  const handleLoyaltySelect = (c) => { setCustomer(c); setStep('redeem') }
  const handleLoyaltySkip   = ()  => { setCustomer(null); setStep('method') }

  /* ── choose payment method ── */
  const handleSelectMethod = (m) => {
    setMethod(m)
    setQrLoaded(false)
    setQrError(false)
    setStep(m === 'Cash' ? 'cash' : m === 'QR' ? 'qr' : 'card')
  }

  /* ── fire payment API ── */
  const doPayment = async (extraPayload = {}) => {
    setLoading(true)
    try {
      const res = await api.post('/payment', {
        bill_id:          selectedBill.bill_id,
        payment_method:   method === 'QR' ? 'E-wallet' : method,
        customer_id:      customer?.customer_id ?? null,
        points_to_redeem: redeem.preview?.points_used ?? 0,
        ...extraPayload,
      })
      toastSuccess('Thanh toán thành công! Bàn đã được giải phóng.')
      setPaidBill(selectedBill)        // snapshot trước khi bill biến mất khỏi danh sách
      setPaidCustomer(customer)        // snapshot hội viên
      setPaidDiscount(redeem.preview)  // snapshot thông tin giảm giá điểm
      setDoneData(res.data)
      setStep('done')
      setShowInvoice(true)   // tự động mở hóa đơn ngay sau khi thanh toán
      // Delay reload để InvoiceModal không bị unmount trước khi hiện
      setTimeout(() => onPaymentSuccess(), 300)
    } catch (err) {
      setFailReason(err.response?.data?.error || 'Giao dịch thất bại')
      setStep('failed')
    } finally {
      setLoading(false)
    }
  }

  /* ── derived ── */
  const finalAmount = selectedBill
    ? Math.max(0, parseFloat(selectedBill.amount) - (redeem.preview?.discount ?? 0))
    : 0

  const change = method === 'Cash' && cashReceived && selectedBill
    ? parseFloat(cashReceived) - finalAmount
    : null

  const selectedProgress = selectedBill ? getProgress(selectedBill) : null

  const qrAmount = finalAmount
  const qrDesc   = `Bill ${selectedBill?.bill_id ?? ''} Ban ${selectedBill?.table_number === 0 ? 'Mang di' : (selectedBill?.table_number ?? '')}`
  const qrUrl    = selectedBill ? buildVietQR(qrAmount, qrDesc) : ''

  /* ══════════════════════════════════════════════════════════════════════════
     STEP: select — danh sách bill chưa thanh toán
  ══════════════════════════════════════════════════════════════════════════ */
  if (step === 'select') return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800">Chọn Bill cần thanh toán</h3>
        <button
          type="button"
          onClick={handleRefresh}
          className="btn-ghost text-xs inline-flex items-center gap-1.5"
          disabled={refreshing}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={2} />
          {refreshing ? 'Đang làm mới...' : 'Làm mới'}
        </button>
      </div>

      {bills.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <div className="mb-2 flex justify-center">
            <PartyPopper className="h-10 w-10 text-emerald-300" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium">Không có bill nào chờ thanh toán</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bills.map(bill => {
            const prog = getProgress(bill)
            return (
              <button key={bill.bill_id} onClick={() => handleSelectBill(bill)} className="card-hover w-full text-left">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-gray-800">{bill.table_number === 0 ? 'Mang đi' : `Bàn ${bill.table_number}`}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {bill.orders?.length || 0} order &nbsp;·&nbsp; Mở lúc{' '}
                      {bill.created_at
                        ? new Date(bill.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </p>
                    <p className={`text-xs mt-1 font-medium ${prog.allCompleted ? 'text-emerald-600' : 'text-orange-600'}`}>
                      {prog.completed}/{prog.total} order hoàn thành
                      {prog.pending > 0 ? ` · còn ${prog.pending} đang pha` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-700 text-lg">{fmt(bill.amount)}</p>
                    <span className="badge-unpaid">Chưa TT</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )

  /* ══════════════════════════════════════════════════════════════════════════
     STEP: loyalty — hỏi / tìm / đăng ký hội viên
  ══════════════════════════════════════════════════════════════════════════ */
  if (step === 'loyalty') return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={reset} className="btn-ghost p-1 text-sm inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <h3 className="font-bold text-gray-800">
          {selectedBill.table_number === 0 ? 'Mang đi' : `Bàn ${selectedBill.table_number}`} &nbsp;·&nbsp; {fmt(selectedBill.amount)}
        </h3>
      </div>

      <LoyaltyPanel onSelect={handleLoyaltySelect} onSkip={handleLoyaltySkip} />
    </div>
  )


  /* ══════════════════════════════════════════════════════════════════════════
     STEP: redeem — đổi điểm giảm giá (sau loyalty, chỉ khi có hội viên)
  ══════════════════════════════════════════════════════════════════════════ */
  if (step === 'redeem') return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={() => setStep('loyalty')} className="btn-ghost p-1 text-sm inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <h3 className="font-bold text-gray-800">
          {selectedBill.table_number === 0 ? 'Mang đi' : `Bàn ${selectedBill.table_number}`} &nbsp;·&nbsp; {fmt(selectedBill.amount)}
        </h3>
      </div>

      <CustomerBadge customer={customer} />

      <RedeemPanel
        customer={customer}
        bill={selectedBill}
        onConfirm={(preview) => {
          setRedeem(r => ({ ...r, preview, points: preview?.points_used ? String(preview.points_used) : r.points }))
          setStep('method')
        }}
        onSkip={() => {
          setRedeem({ points: '', preview: null, loading: false, err: '' })
          setStep('method')
        }}
      />
    </div>
  )

  /* ══════════════════════════════════════════════════════════════════════════
     STEP: method — chọn phương thức thanh toán
  ══════════════════════════════════════════════════════════════════════════ */
  if (step === 'method') return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={() => setStep(customer ? 'redeem' : 'loyalty')} className="btn-ghost p-1 text-sm inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <h3 className="font-bold text-gray-800">
          {selectedBill.table_number === 0 ? 'Mang đi' : `Bàn ${selectedBill.table_number}`} &nbsp;·&nbsp; {fmt(selectedBill.amount)}
        </h3>
      </div>

      {/* hội viên đang dùng */}
      {customer && (
        <CustomerBadge
          customer={customer}
          onRemove={() => {
            setCustomer(null);
            setRedeem({
              points: "",
              preview: null,
              loading: false,
              err: "",
            });
          }}
        />
      )}
      {/* bill summary */}
      <BillSummary bill={selectedBill} customer={customer} progress={selectedProgress} discount={redeem.preview?.discount ?? 0} pointsUsed={redeem.preview?.points_used ?? 0} />

      <p className="section-title">Phương thức thanh toán</p>
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: 'Cash', Icon: Banknote,   label: 'Tiền mặt' },
          { key: 'QR',   Icon: Smartphone, label: 'Chuyển khoản QR' },
          { key: 'Card', Icon: CreditCard, label: 'Thẻ / POS' },
        ].map(({ key, Icon, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleSelectMethod(key)}
            disabled={!selectedProgress?.allCompleted}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Icon className="h-9 w-9 text-amber-700" strokeWidth={1.75} />
            <span className="text-xs font-semibold text-gray-700 text-center">{label}</span>
          </button>
        ))}
      </div>

      {!selectedProgress?.allCompleted && (
        <p className="text-xs text-orange-600 mt-3 text-center inline-flex items-center justify-center gap-1.5 w-full">
          <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          Chưa thể thanh toán — còn order đang pha chế
        </p>
      )}
    </div>
  )

  /* ══════════════════════════════════════════════════════════════════════════
     STEP: cash — tiền mặt
  ══════════════════════════════════════════════════════════════════════════ */
  if (step === 'cash') return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={() => setStep('method')} className="btn-ghost p-1 text-sm inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <h3 className="font-bold text-gray-800 inline-flex items-center gap-2">
          <Banknote className="h-5 w-5 text-amber-700" strokeWidth={2} />
          Thanh toán tiền mặt
        </h3>
      </div>

      <div className="bg-amber-50 rounded-xl p-4 mb-4 text-center">
        <p className="text-sm text-gray-500 mb-1">Số tiền cần thu</p>
        <p className="text-3xl font-bold text-amber-700">{fmt(selectedBill.amount)}</p>
        {customer && (
          <p className="text-xs text-purple-600 mt-1.5 font-medium">
            Hội viên: {customer.name} &nbsp;(+{pointsToEarn(selectedBill.amount)} điểm)
          </p>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Tiền khách đưa (VNĐ)</label>
        <input
          type="number"
          className="input-field text-lg font-bold text-center"
          placeholder="Nhập số tiền..."
          value={cashReceived}
          onChange={e => setCashReceived(e.target.value)}
          min={0}
          step="1000"
          autoFocus
        />

        {change !== null && change >= 0 && (
          <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-center">
            <p className="text-xs text-gray-500">Tiền thối lại</p>
            <p className="text-xl font-bold text-emerald-700">{fmt(change)}</p>
          </div>
        )}

        {change !== null && change < 0 && (
          <div className="mt-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-center">
            <p className="text-sm text-red-600 font-medium inline-flex items-center justify-center gap-1.5">
              <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={2} />
              Tiền không đủ ({fmt(Math.abs(change))} thiếu)
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setStep('method')} className="btn-secondary flex-1">Hủy</button>
        <button
          type="button"
          onClick={() => doPayment({ amount_received: parseFloat(cashReceived), final_amount: finalAmount })}
          disabled={loading || !cashReceived || change === null || change < 0}
          className="btn-success flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading
            ? <Spinner />
            : <><CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={2} />Xác nhận đã thu</>}
        </button>
      </div>
    </div>
  )

  /* ══════════════════════════════════════════════════════════════════════════
     STEP: qr — chuyển khoản QR (VietQR thực tế)
  ══════════════════════════════════════════════════════════════════════════ */
  if (step === 'qr') return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={() => setStep('method')} className="btn-ghost p-1 text-sm inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <h3 className="font-bold text-gray-800 inline-flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-amber-700" strokeWidth={2} />
          Chuyển khoản QR
        </h3>
      </div>

      <div className="flex flex-col items-center mb-5">
        {/* QR image */}
        <div className="relative w-52 h-52 mb-3">
          {!qrLoaded && !qrError && (
            <div className="absolute inset-0 bg-gray-100 rounded-2xl animate-pulse flex items-center justify-center">
              <Smartphone className="h-10 w-10 text-gray-300" strokeWidth={1.5} />
            </div>
          )}
          {qrError && (
            <div className="absolute inset-0 bg-red-50 border-2 border-dashed border-red-200 rounded-2xl flex flex-col items-center justify-center gap-2">
              <XCircle className="h-8 w-8 text-red-400" strokeWidth={1.5} />
              <p className="text-xs text-red-500 text-center px-2">Không tải được QR<br />Kiểm tra kết nối</p>
            </div>
          )}
          <img
            src={qrUrl}
            alt="VietQR"
            className={`w-52 h-52 rounded-2xl object-contain transition-opacity duration-300 ${qrLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setQrLoaded(true)}
            onError={() => { setQrError(true); setQrLoaded(false) }}
          />
        </div>

        {/* Bank info */}
        <p className="text-xs text-gray-500">{BANK_CONFIG.bankId} · {BANK_CONFIG.accountNo}</p>
        <p className="text-xs font-semibold text-gray-700 mb-3">{BANK_CONFIG.accountName}</p>

        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-center w-full">
          <p className="text-xs text-gray-500 mb-0.5">Số tiền chuyển khoản</p>
          <p className="text-2xl font-bold text-blue-700">{fmt(finalAmount)}</p>
          <p className="text-[10px] text-gray-400 mt-1">Nội dung: {qrDesc}</p>
        </div>

        {customer && (
          <p className="text-xs text-purple-600 mt-2 font-medium">
            Hội viên: {customer.name} &nbsp;(+{pointsToEarn(finalAmount)} điểm)
          </p>
        )}
        <p className="text-xs text-gray-500 mt-2 text-center">
          Yêu cầu khách mở app ngân hàng → Quét mã → Xác nhận
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setFailReason('Giao dịch bị hủy / lỗi'); setStep('failed') }}
          className="btn-secondary flex-1"
        >
          Hủy / Lỗi
        </button>
        <button
          type="button"
          onClick={() => doPayment()}
          disabled={loading}
          className="btn-success flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading
            ? <Spinner />
            : <><CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={2} />Đã nhận được tiền</>}
        </button>
      </div>
    </div>
  )

  /* ══════════════════════════════════════════════════════════════════════════
     STEP: card — thẻ / POS
  ══════════════════════════════════════════════════════════════════════════ */
  if (step === 'card') return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={() => setStep('method')} className="btn-ghost p-1 text-sm inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <h3 className="font-bold text-gray-800 inline-flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-700" strokeWidth={2} />
          Quẹt thẻ / POS
        </h3>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center mb-4">
        <CreditCard className="h-12 w-12 mx-auto mb-3 text-blue-600" strokeWidth={1.5} />
        <p className="text-sm text-gray-500 mb-1">Yêu cầu khách quẹt thẻ tại máy POS</p>
        <p className="text-2xl font-bold text-blue-700">{fmt(finalAmount)}</p>
        {customer && (
          <p className="text-xs text-purple-600 mt-1.5 font-medium">
            Hội viên: {customer.name} &nbsp;(+{pointsToEarn(finalAmount)} điểm)
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setFailReason('Thẻ bị từ chối hoặc lỗi POS'); setStep('failed') }}
          className="btn-secondary flex-1 inline-flex items-center justify-center gap-2"
        >
          <XCircle className="h-4 w-4 shrink-0" strokeWidth={2} />Thẻ lỗi
        </button>
        <button
          type="button"
          onClick={() => doPayment()}
          disabled={loading}
          className="btn-success flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading
            ? <Spinner />
            : <><CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={2} />Thành công</>}
        </button>
      </div>
    </div>
  )

  /* ══════════════════════════════════════════════════════════════════════════
     STEP: failed
  ══════════════════════════════════════════════════════════════════════════ */
  if (step === 'failed') return (
    <div className="text-center py-6">
      <div className="mb-3 flex justify-center">
        <XCircle className="h-14 w-14 text-red-400" strokeWidth={1.5} />
      </div>
      <h3 className="font-bold text-gray-800 text-lg mb-1">Giao dịch thất bại</h3>
      <p className="text-sm text-gray-500 mb-3">{failReason}</p>
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 mb-6 text-sm text-red-700">
        Trạng thái bill đã được ghi nhận là <strong>Thất bại</strong>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={reset} className="btn-secondary flex-1">Chọn Bill khác</button>
        <button
          type="button"
          onClick={() => setStep('method')}
          className="btn-warning flex-1 inline-flex items-center justify-center gap-2"
        >
          <RotateCw className="h-4 w-4 shrink-0" strokeWidth={2} />Thử lại
        </button>
      </div>
    </div>
  )

  /* ══════════════════════════════════════════════════════════════════════════
     STEP: done
  ══════════════════════════════════════════════════════════════════════════ */
  if (step === 'done') return (
    <>
      {showInvoice && (
        <InvoiceModal
          bill={paidBill ?? selectedBill}
          paymentMethod={method}
          cashReceived={cashReceived ? parseFloat(cashReceived) : null}
          change={change}
          doneData={doneData}
          customer={paidCustomer ?? customer}
          redeemPreview={paidDiscount ?? redeem.preview}
          onClose={() => setShowInvoice(false)}
        />
      )}
      <div className="text-center py-6">
        <div className="mb-3 flex justify-center">
          <PartyPopper className="h-16 w-16 text-amber-500" strokeWidth={1.5} />
        </div>
        <h3 className="font-bold text-gray-800 text-xl mb-1">Thanh toán thành công!</h3>
        <p className="text-gray-500 text-sm mb-4">{(paidBill ?? selectedBill)?.table_number === 0 ? 'Đơn mang đi' : `Bàn ${(paidBill ?? selectedBill)?.table_number}`} đã được giải phóng</p>

        {/* tiền thối */}
        {method === 'Cash' && doneData?.change > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-4 mb-4">
            <p className="text-sm text-gray-500">Tiền thối lại cho khách</p>
            <p className="text-3xl font-bold text-emerald-700">{fmt(doneData.change)}</p>
          </div>
        )}

        {/* giảm giá điểm */}
        {doneData?.discount > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl px-4 py-3 mb-4">
            <p className="text-sm text-purple-700">
              Đã đổi <span className="font-bold">{doneData.points_used} điểm</span> → giảm <span className="font-bold text-emerald-700">{fmt(doneData.discount)}</span>
            </p>
          </div>
        )}

        {/* tích điểm thành công */}
        {doneData?.points_earned > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl px-4 py-3 mb-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Star className="h-5 w-5 text-purple-600" strokeWidth={2} />
              <p className="font-bold text-purple-800">Tích điểm thành công!</p>
            </div>
            <p className="text-sm text-purple-700">
              <span className="font-bold">+{doneData.points_earned} điểm</span>
              {customer?.name && <> cho {customer.name}</>}
            </p>
            {doneData.new_level && doneData.new_level !== customer?.member_level && (
              <p className="text-xs text-yellow-700 font-semibold mt-2 bg-yellow-100 rounded-lg px-2 py-1 inline-block">
                🎉 Nâng hạng lên {doneData.new_level}!
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-2">
          <button type="button" onClick={reset} className="btn-secondary flex-1">Hoàn tất</button>
          <button
            type="button"
            onClick={() => setShowInvoice(true)}
            className="btn-primary flex-1 inline-flex items-center justify-center gap-2"
          >
            <FileText className="h-4 w-4 shrink-0" strokeWidth={2} />
            Xem hóa đơn / In
          </button>
        </div>
      </div>
    </>
  )

  return null
}
