import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { BarChart3, Receipt, Coffee, Check, Eye, EyeOff } from 'lucide-react'

const ROLES = [
  { key: 'manager', Icon: BarChart3, label: 'Quản lý',  desc: 'Báo cáo, menu, kho',    user: 'manager', pwd: 'manager123' },
  { key: 'cashier', Icon: Receipt,   label: 'Thu ngân', desc: 'Tạo order, thanh toán', user: 'cashier', pwd: 'cashier123' },
  { key: 'barista', Icon: Coffee,    label: 'Barista',  desc: 'Hàng đợi pha chế',     user: 'barista', pwd: 'barista123' },
]

export default function LoginPage() {
  const [form, setForm]           = useState({ username: '', password: '' })
  const [activeRole, setActiveRole] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [showPwd, setShowPwd]     = useState(false)
  const { login }            = useAuth()
  const navigate             = useNavigate()
  const { error: showError } = useToast()

  const selectRole = (role) => {
    setActiveRole(role.key)
    setForm({ username: role.user, password: role.pwd })
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const employee = await login(form.username, form.password)
      const map = { Cashier: '/cashier', Barista: '/barista', Manager: '/manager' }
      navigate(map[employee.role] || '/')
    } catch (err) {
      showError(err.response?.data?.error || 'Tên đăng nhập hoặc mật khẩu không đúng')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel – branding + role quick-select */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-amber-900 via-amber-800 to-amber-700 flex-col justify-center p-10 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <Coffee className="h-10 w-10 text-white" strokeWidth={1.75} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Coffee Shop</h1>
          <p className="text-amber-200 mb-8">Management System</p>

          <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-3">
            Chọn vai trò để điền nhanh
          </p>
          <div className="space-y-2">
            {ROLES.map(role => {
              const RoleIcon = role.Icon
              return (
              <button
                key={role.key}
                type="button"
                onClick={() => selectRole(role)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  activeRole === role.key
                    ? 'bg-white/25 ring-1 ring-white/50'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <RoleIcon className="h-5 w-5 text-white" strokeWidth={2} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{role.label}</p>
                  <p className="text-amber-200 text-xs">{role.desc}</p>
                </div>
                {activeRole === role.key && <Check className="h-5 w-5 shrink-0 text-white" strokeWidth={2.5} />}
              </button>
            )})}
          </div>
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo + role selector */}
          <div className="lg:hidden text-center mb-6">
            <div className="mb-2 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                <Coffee className="h-7 w-7" strokeWidth={1.75} />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Coffee Shop</h1>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(role => {
                const RoleIcon = role.Icon
                return (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => selectRole(role)}
                  className={`p-2.5 rounded-xl border-2 transition-all ${
                    activeRole === role.key
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 bg-white hover:border-amber-300'
                  }`}
                >
                  <div className="mb-1 flex justify-center">
                    <RoleIcon className={`h-6 w-6 ${activeRole === role.key ? 'text-amber-700' : 'text-gray-600'}`} strokeWidth={2} />
                  </div>
                  <div className="text-xs font-semibold text-gray-700">{role.label}</div>
                </button>
              )})}
            </div>
          </div>

          <div className="card shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-1">Đăng nhập</h2>
            <p className="text-gray-500 text-sm mb-6">
              {activeRole
                ? `Vai trò: ${ROLES.find(r => r.key === activeRole)?.label}`
                : 'Nhập thông tin tài khoản'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tên đăng nhập
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Nhập username..."
                  value={form.username}
                  onChange={e => { setForm(f => ({ ...f, username: e.target.value })); setActiveRole(null) }}
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className="input-field pr-10"
                    placeholder="Nhập mật khẩu..."
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
                    aria-label={showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary w-full py-3 text-base mt-2"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Đang đăng nhập...
                  </span>
                ) : 'Đăng nhập'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
