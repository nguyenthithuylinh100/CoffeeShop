import { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react'
import { Check, X, Info, AlertTriangle } from 'lucide-react'

const ToastContext = createContext(null)

const TOAST_STUB = {
  toast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
  dismiss: () => {},
}

let _id = 0

/**
 * ToastProvider – bọc ngoài App, cung cấp hook useToast() cho toàn hệ thống.
 * Hỗ trợ stack nhiều toast, auto-dismiss với progress bar, 4 loại:
 *   success | error | info | warning
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((msg, type = 'success', duration = 3500) => {
    const id = ++_id
    setToasts(prev => [...prev.slice(-4), { id, msg, type, duration }])
    timers.current[id] = setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  // Shorthand helpers
  const success = useCallback((msg, dur) => toast(msg, 'success', dur), [toast])
  const error   = useCallback((msg, dur) => toast(msg, 'error',   dur), [toast])
  const info    = useCallback((msg, dur) => toast(msg, 'info',    dur), [toast])
  const warning = useCallback((msg, dur) => toast(msg, 'warning', dur), [toast])

  const value = useMemo(
    () => ({ toast, success, error, info, warning, dismiss }),
    [toast, success, error, info, warning, dismiss]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext) ?? TOAST_STUB

/* ── Styling maps ── */
const STYLES = {
  success: {
    bar:  'bg-emerald-500',
    dot:  'bg-emerald-500',
    Icon: Check,
    iconBg: 'bg-emerald-100 text-emerald-700',
    text: 'text-gray-800',
    border: 'border-emerald-200',
    bg: 'bg-white',
  },
  error: {
    bar:  'bg-red-500',
    dot:  'bg-red-500',
    Icon: X,
    iconBg: 'bg-red-100 text-red-700',
    text: 'text-gray-800',
    border: 'border-red-200',
    bg: 'bg-white',
  },
  info: {
    bar:  'bg-blue-500',
    dot:  'bg-blue-500',
    Icon: Info,
    iconBg: 'bg-blue-100 text-blue-700',
    text: 'text-gray-800',
    border: 'border-blue-200',
    bg: 'bg-white',
  },
  warning: {
    bar:  'bg-amber-500',
    dot:  'bg-amber-500',
    Icon: AlertTriangle,
    iconBg: 'bg-amber-100 text-amber-700',
    text: 'text-gray-800',
    border: 'border-amber-200',
    bg: 'bg-white',
  },
}

function ToastItem({ toast, onDismiss }) {
  const s = STYLES[toast.type] || STYLES.success
  const TypeIcon = s.Icon
  return (
    <div
      className={`
        relative flex items-start gap-3 px-4 py-3 rounded-2xl shadow-lg border
        ${s.bg} ${s.border}
        animate-slide-in
        min-w-[260px] max-w-[360px]
      `}
      style={{ animation: 'toastSlideIn 0.22s cubic-bezier(.21,1.02,.73,1) forwards' }}
    >
      {/* Icon */}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${s.iconBg}`}>
        <TypeIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
      </div>

      {/* Message */}
      <p className={`flex-1 text-sm font-medium leading-snug ${s.text}`}>{toast.msg}</p>

      {/* Close */}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors mt-0.5 p-0.5 rounded-lg hover:bg-gray-100"
        aria-label="Đóng"
      >
        <X className="w-4 h-4" strokeWidth={2} />
      </button>

      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-0.5 rounded-b-2xl ${s.bar} opacity-60`}
        style={{
          animation: `toastProgress ${toast.duration}ms linear forwards`,
          width: '100%',
        }}
      />
    </div>
  )
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 items-end">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
