import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Navbar from '../components/Navbar'
import { SkeletonKPICards } from '../components/Skeleton'
import { useToast } from '../context/ToastContext'
import api from '../services/api'
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  Bell,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  CreditCard,
  FolderOpen,
  History,
  Home,
  Inbox,
  Loader2,
  Package,
  Pause,
  Pencil,
  Play,
  Plus,
  Receipt,
  RefreshCw,
  Save,
  Search,
  Send,
  Smartphone,
  Trash2,
  TrendingUp,
  Trophy,
  UtensilsCrossed,
  Wallet,
  X,
  Users,
  UserPlus,
  UserX,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Star,
  Phone,
  Mail,
  Award,
  Gift,
  Download,
} from 'lucide-react'

function fmt(n) {
  return new Intl.NumberFormat('vi-VN').format(n) + '₫'
}

/** YYYY-MM-DD theo giờ trình duyệt — tránh lệch ngày so với `toISOString()` (UTC). */
function localDateISO(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Ô tìm kiếm dùng chung
function SearchBox({ value, onChange, placeholder = 'Tìm kiếm...' }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" strokeWidth={2} />
      <input
        type="text"
        className="input-field pl-8 pr-3"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  UC8: Manage Menu
// ══════════════════════════════════════════════════════════
function MenuTab() {
  const [items, setItems]           = useState([])
  const [search, setSearch]         = useState('')
  const [filterCat, setFilterCat]   = useState('all')
  const [filterAvail, setFilterAvail] = useState('all')
  const [form, setForm]             = useState({ name: '', price: '', category: '', is_available: true })
  const [editing, setEditing]       = useState(null)
  const [showForm, setShowForm]     = useState(false)
  const [errors, setErrors]         = useState({})
  // Nguyên liệu
  const [inventory, setInventory]   = useState([])           // danh sách kho để chọn
  const [ingRows, setIngRows]       = useState([])           // [{ inventory_id, quantity_used, _key }]
  const [ingLoading, setIngLoading] = useState(false)
  const { toast: showToast } = useToast()

  const load = async () => { const r = await api.get('/menu/all'); setItems(r.data) }
  const loadInventory = async () => {
    try { const r = await api.get('/inventory'); setInventory(r.data) } catch {}
  }
  useEffect(() => { load(); loadInventory() }, [])

  // Tất cả category từ dữ liệu
  const allCategories = useMemo(() => [...new Set(items.map(i => i.category || 'Khác'))], [items])

  // Lọc + tìm kiếm
  const filtered = useMemo(() => {
    return items.filter(item => {
      const matchSearch = !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.category || '').toLowerCase().includes(search.toLowerCase())
      const matchCat = filterCat === 'all' || (item.category || 'Khác') === filterCat
      const matchAvail =
        filterAvail === 'all' ||
        (filterAvail === 'available'   &&  item.is_available) ||
        (filterAvail === 'unavailable' && !item.is_available)
      return matchSearch && matchCat && matchAvail
    })
  }, [items, search, filterCat, filterAvail])

  // Nhóm theo category sau khi filter
  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach(item => {
      const cat = item.category || 'Khác'
      if (!map[cat]) map[cat] = []
      map[cat].push(item)
    })
    return map
  }, [filtered])

  const validate = () => {
    const e = {}
    if (!form.name.trim())        e.name  = 'Tên món không được trống'
    if (!form.price || +form.price <= 0) e.price = 'Giá phải lớn hơn 0'
    // Validate ingredient rows: mỗi dòng phải chọn nguyên liệu và số lượng > 0
    ingRows.forEach((row, idx) => {
      if (!row.inventory_id) e[`ing_id_${idx}`] = 'Chọn nguyên liệu'
      if (!row.quantity_used || +row.quantity_used <= 0) e[`ing_qty_${idx}`] = 'Nhập số lượng'
    })
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = async ev => {
    ev.preventDefault()
    if (!validate()) return
    try {
      let menuItemId = editing
      if (editing) {
        await api.put(`/menu/${editing}`, { ...form, price: parseFloat(form.price) })
        showToast('Cập nhật món thành công')
      } else {
        const res = await api.post('/menu', { ...form, price: parseFloat(form.price) })
        menuItemId = res.data.menu_item_id
        showToast('Thêm món mới thành công')
      }
      // Lưu nguyên liệu (dù có hay không có dòng nào)
      await api.put(`/menu/${menuItemId}/ingredients`, {
        ingredients: ingRows
          .filter(r => r.inventory_id && +r.quantity_used > 0)
          .map(r => ({ inventory_id: +r.inventory_id, quantity_used: +r.quantity_used })),
      })
      setForm({ name: '', price: '', category: '', is_available: true })
      setIngRows([])
      setErrors({})
      setShowForm(false)
      setEditing(null)
      load()
    } catch (err) {
      showToast(err.response?.data?.error || 'Lỗi', 'error')
    }
  }

  const handleEdit = async item => {
    setForm({ name: item.name, price: item.price, category: item.category || '', is_available: item.is_available })
    setEditing(item.menu_item_id)
    setErrors({})
    setShowForm(true)
    // Tải nguyên liệu hiện tại của món
    setIngLoading(true)
    try {
      const res = await api.get(`/menu/${item.menu_item_id}/ingredients`)
      setIngRows((res.data.ingredients || []).map((ing, i) => ({
        inventory_id:  ing.inventory_id,
        quantity_used: ing.quantity_used,
        _key: Date.now() + i,
      })))
    } catch {
      setIngRows([])
    } finally {
      setIngLoading(false)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleToggle = async item => {
    await api.put(`/menu/${item.menu_item_id}`, { is_available: !item.is_available })
    showToast(item.is_available ? `"${item.name}" tạm ngưng` : `"${item.name}" đã mở lại`)
    load()
  }

  const handleDelete = async id => {
    if (!confirm('Xác nhận xoá món này?')) return
    await api.delete(`/menu/${id}`)
    showToast('Đã xoá')
    load()
  }

  // ── Ingredient row helpers ──────────────────────────────────────────────
  const addIngRow = () =>
    setIngRows(rows => [...rows, { inventory_id: '', quantity_used: '', _key: Date.now() }])

  const removeIngRow = key =>
    setIngRows(rows => rows.filter(r => r._key !== key))

  const updateIngRow = (key, field, value) =>
    setIngRows(rows => rows.map(r => r._key === key ? { ...r, [field]: value } : r))

  // Các nguyên liệu đã chọn trong form (tránh chọn trùng)
  const usedInventoryIds = new Set(ingRows.map(r => String(r.inventory_id)).filter(Boolean))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-800">
          Menu
          <span className="ml-2 text-sm font-normal text-gray-400">
            ({filtered.length}/{items.length} món)
          </span>
        </h2>
        <button
          onClick={() => {
            setShowForm(!showForm)
            setEditing(null)
            setErrors({})
            setForm({ name: '', price: '', category: '', is_available: true })
          }}
          className="btn-primary text-sm"
        >
          {showForm ? (
            <span className="inline-flex items-center gap-1"><X className="h-4 w-4" strokeWidth={2} /> Đóng</span>
          ) : (
            <span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" strokeWidth={2} /> Thêm món</span>
          )}
        </button>
      </div>

      {/* Form thêm/sửa */}
      {showForm && (
        <div className="card mb-4 border-2 border-amber-200">
          <h3 className="font-bold text-gray-800 mb-4">
            {editing ? (
              <span className="inline-flex items-center gap-2"><Pencil className="h-5 w-5" strokeWidth={2} /> Sửa món</span>
            ) : (
              <span className="inline-flex items-center gap-2"><Plus className="h-5 w-5" strokeWidth={2} /> Thêm món mới</span>
            )}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ── Thông tin cơ bản ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Tên món *</label>
                <input
                  className={`input-field ${errors.name ? 'border-red-400' : ''}`}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="VD: Cà phê đen"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Giá (VNĐ) *</label>
                <input
                  type="number" min="0" step="1000"
                  className={`input-field ${errors.price ? 'border-red-400' : ''}`}
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="VD: 30000"
                />
                {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Danh mục</label>
                <input
                  className="input-field" list="cats-suggest"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="Cà Phê, Trà, Đồ Ăn..."
                />
                <datalist id="cats-suggest">
                  {allCategories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox" id="avail-check"
                  checked={form.is_available}
                  onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))}
                  className="w-4 h-4 accent-amber-600"
                />
                <label htmlFor="avail-check" className="text-sm text-gray-700 font-medium">
                  Đang bán
                </label>
              </div>
            </div>

            {/* ── Nguyên liệu ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Nguyên liệu thành phần
                </label>
                <button
                  type="button"
                  onClick={addIngRow}
                  className="text-xs inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> Thêm nguyên liệu
                </button>
              </div>

              {ingLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> Đang tải...
                </div>
              ) : ingRows.length === 0 ? (
                <div
                  className="border-2 border-dashed border-gray-200 rounded-xl py-4 text-center cursor-pointer hover:border-amber-300 hover:bg-amber-50 transition-colors"
                  onClick={addIngRow}
                >
                  <Package className="h-7 w-7 text-gray-300 mx-auto mb-1" strokeWidth={1.5} />
                  <p className="text-xs text-gray-400">Nhấn để thêm nguyên liệu</p>
                  <p className="text-xs text-gray-300 mt-0.5">Bỏ qua nếu món không cần quản lý kho</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {ingRows.map((row, idx) => {
                    const selInv = inventory.find(i => String(i.inventory_id) === String(row.inventory_id))
                    return (
                      <div key={row._key} className="flex items-start gap-2">
                        {/* Chọn nguyên liệu */}
                        <div className="flex-1 min-w-0">
                          <select
                            className={`input-field text-sm ${errors[`ing_id_${idx}`] ? 'border-red-400' : ''}`}
                            value={row.inventory_id}
                            onChange={e => updateIngRow(row._key, 'inventory_id', e.target.value)}
                          >
                            <option value="">-- Chọn nguyên liệu --</option>
                            {inventory.map(inv => (
                              <option
                                key={inv.inventory_id}
                                value={inv.inventory_id}
                                disabled={usedInventoryIds.has(String(inv.inventory_id)) && String(inv.inventory_id) !== String(row.inventory_id)}
                              >
                                {inv.ingredient_name} (tồn: {inv.quantity} {inv.unit || ''})
                              </option>
                            ))}
                          </select>
                          {errors[`ing_id_${idx}`] && (
                            <p className="text-red-500 text-xs mt-0.5">{errors[`ing_id_${idx}`]}</p>
                          )}
                        </div>
                        {/* Số lượng + đơn vị */}
                        <div className="w-32 shrink-0">
                          <div className="flex items-center gap-1">
                            <input
                              type="number" min="0" step="any"
                              className={`input-field text-sm text-center ${errors[`ing_qty_${idx}`] ? 'border-red-400' : ''}`}
                              value={row.quantity_used}
                              onChange={e => updateIngRow(row._key, 'quantity_used', e.target.value)}
                              placeholder="SL"
                            />
                            {selInv?.unit && (
                              <span className="text-xs text-gray-500 font-medium whitespace-nowrap shrink-0">
                                {selInv.unit}
                              </span>
                            )}
                          </div>
                          {errors[`ing_qty_${idx}`] && (
                            <p className="text-red-500 text-xs mt-0.5">{errors[`ing_qty_${idx}`]}</p>
                          )}
                        </div>
                        {/* Xóa dòng */}
                        <button
                          type="button"
                          onClick={() => removeIngRow(row._key)}
                          className="text-gray-300 hover:text-red-400 transition-colors mt-2 shrink-0"
                        >
                          <X className="h-4 w-4" strokeWidth={2} />
                        </button>
                      </div>
                    )
                  })}
                  <button
                    type="button"
                    onClick={addIngRow}
                    className="text-xs text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-1 mt-1"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> Thêm dòng
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); setIngRows([]) }} className="btn-secondary flex-1">Hủy</button>
              <button type="submit" className="btn-primary flex-1">{editing ? 'Lưu thay đổi' : 'Thêm mới'}</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Thanh tìm kiếm & lọc ── */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Tìm kiếm */}
        <div className="flex-1 min-w-[200px]">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Tìm tên món, danh mục..."
          />
        </div>

        {/* Lọc theo danh mục */}
        <select
          className="input-field w-auto min-w-[130px]"
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
        >
          <option value="all">Tất cả danh mục</option>
          {allCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Lọc theo trạng thái */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 text-sm">
          {[
            { key: 'all',          label: 'Tất cả' },
            { key: 'available',    label: <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" strokeWidth={2.5} /> Đang bán</span> },
            { key: 'unavailable',  label: <span className="inline-flex items-center gap-1"><Pause className="h-3.5 w-3.5" strokeWidth={2} /> Tạm ngưng</span> },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterAvail(f.key)}
              className={`px-3 py-2 font-medium transition-colors border-r last:border-r-0 border-gray-200 ${
                filterAvail === f.key
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Kết quả tìm kiếm */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <div className="flex justify-center mb-2">
            <Search className="h-10 w-10 opacity-50" strokeWidth={1.25} />
          </div>
          <p className="font-medium">Không tìm thấy món nào</p>
          <button onClick={() => { setSearch(''); setFilterCat('all'); setFilterAvail('all') }}
            className="text-amber-600 text-sm mt-2 hover:underline">
            Xoá bộ lọc
          </button>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{cat}</p>
              <span className="text-xs text-gray-300">({catItems.length})</span>
            </div>
            <div className="space-y-2">
              {catItems.map(item => (
                <div
                  key={item.menu_item_id}
                  className={`card flex items-center gap-3 transition-opacity ${!item.is_available ? 'opacity-50' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800">{item.name}</p>
                      <span className={
                        item.is_available
                          ? 'bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full'
                          : 'bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full'
                      }>
                        {item.is_available ? 'Đang bán' : 'Tạm ngưng'}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-amber-700 mt-0.5">{fmt(item.price)}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                    <button
                      onClick={() => handleToggle(item)}
                      className={`text-xs py-1.5 px-3 rounded-lg border font-semibold transition-colors ${
                        item.is_available
                          ? 'border-orange-200 text-orange-700 hover:bg-orange-50'
                          : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {item.is_available ? (
                        <span className="inline-flex items-center gap-1"><Pause className="h-3.5 w-3.5" strokeWidth={2} /> Ngưng</span>
                      ) : (
                        <span className="inline-flex items-center gap-1"><Play className="h-3.5 w-3.5" strokeWidth={2} /> Mở lại</span>
                      )}
                    </button>
                    <button onClick={() => handleEdit(item)} className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1">
                      <Pencil className="h-3.5 w-3.5" strokeWidth={2} /> Sửa
                    </button>
                    <button onClick={() => handleDelete(item.menu_item_id)} className="btn-danger text-xs py-1.5 px-3 inline-flex items-center gap-1">
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  UC9: Manage Inventory
// ══════════════════════════════════════════════════════════
function InventoryTab() {
  const [items, setItems]       = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [transactions, setTransactions] = useState([])
  const [search, setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'low' | 'ok'
  const [inputs, setInputs]     = useState({})  // { id: { value, mode } }
  const [form, setForm]         = useState({ ingredient_name: '', quantity: '', unit: '', min_quantity: '' })
  const [supplierForm, setSupplierForm] = useState({ supplier_name: '', phone: '', email: '', address: '' })
  const [selectedSupplierId, setSelectedSupplierId] = useState(null)
  const [supplierEditForm, setSupplierEditForm] = useState({ supplier_name: '', phone: '', email: '', address: '', status: 'Active' })
  const [supplierTransactions, setSupplierTransactions] = useState([])
  const [supplierTxForm, setSupplierTxForm] = useState({ inventory_id: '', quantity: '', note: '' })
  const [showForm, setShowForm] = useState(false)
  const [txTypeFilter, setTxTypeFilter] = useState('all') // all | IN | ADJUST
  const [txDateRange, setTxDateRange] = useState({ from: '', to: '' })
  const { toast: showToast } = useToast()

  const load = async () => {
    const [invRes, supRes, txRes] = await Promise.all([
      api.get('/inventory'),
      api.get('/inventory/suppliers'),
      api.get('/inventory/transactions?limit=20'),
    ])
    setItems(invRes.data || [])
    setSuppliers(supRes.data || [])
    setTransactions(txRes.data || [])
  }
  useEffect(() => { load() }, [])

  // Lọc + tìm kiếm kho
  const filtered = useMemo(() => {
    return items.filter(item => {
      const matchSearch = !search ||
        item.ingredient_name.toLowerCase().includes(search.toLowerCase()) ||
        (item.unit || '').toLowerCase().includes(search.toLowerCase())
      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'low' &&  item.is_low) ||
        (filterStatus === 'ok'  && !item.is_low)
      return matchSearch && matchStatus
    })
  }, [items, search, filterStatus])

  const lowCount = items.filter(i => i.is_low).length
  const selectedSupplier = useMemo(
    () => suppliers.find(s => String(s.supplier_id) === String(selectedSupplierId)) || null,
    [suppliers, selectedSupplierId],
  )
  const filteredTransactions = useMemo(() => (
    txTypeFilter === 'all' ? transactions : transactions.filter(t => t.type === txTypeFilter)
  ), [transactions, txTypeFilter])

  const parseDate = (isoString) => {
    if (!isoString) return null
    const d = new Date(isoString)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const inDateRange = (isoString, range) => {
    const d = parseDate(isoString)
    if (!d) return false
    const from = range.from ? new Date(`${range.from}T00:00:00`) : null
    const to = range.to ? new Date(`${range.to}T23:59:59`) : null
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  }
  const filteredTransactionsByDate = useMemo(
    () => filteredTransactions.filter(t => inDateRange(t.created_at, txDateRange)),
    [filteredTransactions, txDateRange],
  )

  const toCsv = (rows) => rows.map(row =>
    row.map((cell) => {
      const val = cell == null ? '' : String(cell)
      if (val.includes(',') || val.includes('"') || val.includes('\n')) return `"${val.replace(/"/g, '""')}"`
      return val
    }).join(','),
  ).join('\n')

  const downloadCsv = (filename, rows) => {
    const csv = '\ufeff' + toCsv(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const exportTransactionsCsv = () => {
    const rows = [
      ['MaGD', 'NguyenLieu', 'Loai', 'SoLuong', 'DonVi', 'NhaCungCap', 'GhiChu', 'ThoiGian'],
      ...filteredTransactionsByDate.map(t => [
        t.transaction_id, t.ingredient_name, t.type, t.quantity, t.unit || '', t.supplier_name || '', t.note || '', t.created_at || '',
      ]),
    ]
    downloadCsv('lich-su-kho.csv', rows)
  }

  const handleUpdate = async (item) => {
    const inp = inputs[item.inventory_id]
    if (!inp || inp.value === '') return
    const val = parseFloat(inp.value)
    if (isNaN(val) || val < 0) { showToast('Số lượng không hợp lệ', 'error'); return }
    const newQty = item.quantity + val
    try {
      await api.put(`/inventory/${item.inventory_id}`, { quantity: newQty })
      showToast(`Nhập thêm ${val} ${item.unit} — Tồn mới: ${newQty} ${item.unit}`)
      setInputs(prev => { const n = { ...prev }; delete n[item.inventory_id]; return n })
      load()
    } catch (err) {
      showToast(err.response?.data?.error || 'Lỗi', 'error')
    }
  }

  const handleCreateSupplier = async (e) => {
    e.preventDefault()
    try {
      await api.post('/inventory/suppliers', supplierForm)
      setSupplierForm({ supplier_name: '', phone: '', email: '', address: '' })
      showToast('Đã thêm nhà cung cấp')
      load()
    } catch (err) {
      showToast(err.response?.data?.error || 'Không thêm được nhà cung cấp', 'error')
    }
  }

  const selectSupplier = async (supplier) => {
    setSelectedSupplierId(supplier.supplier_id)
    setSupplierEditForm({
      supplier_name: supplier.supplier_name || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      status: supplier.status || 'Active',
    })
    try {
      const res = await api.get(`/inventory/suppliers/${supplier.supplier_id}/transactions?limit=50`)
      setSupplierTransactions(res.data || [])
    } catch (err) {
      setSupplierTransactions([])
      showToast(err.response?.data?.error || 'Không tải được lịch sử giao dịch NCC', 'error')
    }
  }

  const handleUpdateSupplier = async (e) => {
    e.preventDefault()
    if (!selectedSupplierId) return
    try {
      await api.put(`/inventory/suppliers/${selectedSupplierId}`, supplierEditForm)
      showToast('Đã cập nhật nhà cung cấp')
      load()
    } catch (err) {
      showToast(err.response?.data?.error || 'Không cập nhật được nhà cung cấp', 'error')
    }
  }

  const handleDeleteSupplier = async () => {
    if (!selectedSupplierId) return
    if (!window.confirm('Xóa nhà cung cấp này? (sẽ chuyển trạng thái Inactive)')) return
    try {
      await api.delete(`/inventory/suppliers/${selectedSupplierId}`)
      showToast('Đã xóa nhà cung cấp')
      setSelectedSupplierId(null)
      setSupplierTransactions([])
      load()
    } catch (err) {
      showToast(err.response?.data?.error || 'Không xóa được nhà cung cấp', 'error')
    }
  }

  const handleCreateSupplierTransaction = async (e) => {
    e.preventDefault()
    if (!selectedSupplierId) return
    if (!supplierTxForm.inventory_id || !supplierTxForm.quantity) {
      showToast('Cần chọn nguyên liệu và số lượng', 'error')
      return
    }
    try {
      await api.post(`/inventory/suppliers/${selectedSupplierId}/transactions`, {
        inventory_id: Number(supplierTxForm.inventory_id),
        quantity: Number(supplierTxForm.quantity),
        note: supplierTxForm.note,
      })
      setSupplierTxForm({ inventory_id: '', quantity: '', note: '' })
      showToast('Đã tạo giao dịch nhập kho')
      await load()
      const res = await api.get(`/inventory/suppliers/${selectedSupplierId}/transactions?limit=50`)
      setSupplierTransactions(res.data || [])
    } catch (err) {
      showToast(err.response?.data?.error || 'Không tạo được giao dịch', 'error')
    }
  }

  const handleCreate = async e => {
    e.preventDefault()
    try {
      await api.post('/inventory', {
        ...form,
        quantity:     parseFloat(form.quantity),
        min_quantity: parseFloat(form.min_quantity || 0),
      })
      setForm({ ingredient_name: '', quantity: '', unit: '', min_quantity: '' })
      setShowForm(false)
      showToast('Thêm nguyên liệu thành công')
      load()
    } catch (err) {
      showToast(err.response?.data?.error || 'Lỗi', 'error')
    }
  }

  return (
    <div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-gray-800">
            Kho Nguyên Liệu
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({filtered.length}/{items.length})
            </span>
          </h2>
          {lowCount > 0 && (
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
              {lowCount} sắp hết
            </span>
          )}
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          {showForm ? (
            <span className="inline-flex items-center gap-1"><X className="h-4 w-4" strokeWidth={2} /> Đóng</span>
          ) : (
            <span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" strokeWidth={2} /> Thêm nguyên liệu</span>
          )}
        </button>
      </div>

      {/* Form thêm nguyên liệu */}
      {showForm && (
        <form onSubmit={handleCreate} className="card mb-4 border-2 border-amber-200">
          <h3 className="font-bold text-gray-800 mb-3">Thêm nguyên liệu mới</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Tên nguyên liệu *</label>
              <input className="input-field" value={form.ingredient_name}
                onChange={e => setForm(f => ({ ...f, ingredient_name: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Số lượng ban đầu</label>
              <input type="number" min="0" className="input-field" value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Đơn vị</label>
              <input className="input-field" list="units-suggest" placeholder="g, ml, cái..."
                value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
              <datalist id="units-suggest">
                {['g', 'kg', 'ml', 'l', 'cái', 'miếng', 'hộp'].map(u => <option key={u} value={u} />)}
              </datalist>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Ngưỡng cảnh báo</label>
              <input type="number" min="0" className="input-field" value={form.min_quantity}
                onChange={e => setForm(f => ({ ...f, min_quantity: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Hủy</button>
            <button type="submit" className="btn-primary flex-1">Thêm mới</button>
          </div>
        </form>
      )}

      {/* ── Tìm kiếm & lọc kho ── */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex-1 min-w-[200px]">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Tìm nguyên liệu, đơn vị..."
          />
        </div>
        <div className="flex rounded-xl overflow-hidden border border-gray-200 text-sm">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'low', label: <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} /> Sắp hết ({lowCount})</span> },
            { key: 'ok',  label: <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" strokeWidth={2.5} /> Bình thường</span> },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-3 py-2 font-medium transition-colors border-r last:border-r-0 border-gray-200 ${
                filterStatus === f.key
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <div className="flex justify-center mb-2">
            <Search className="h-10 w-10 opacity-50" strokeWidth={1.25} />
          </div>
          <p className="font-medium">Không tìm thấy nguyên liệu nào</p>
          <button onClick={() => { setSearch(''); setFilterStatus('all') }}
            className="text-amber-600 text-sm mt-2 hover:underline">Xoá bộ lọc</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const inp   = inputs[item.inventory_id]
            const pct   = item.min_quantity > 0
              ? Math.min(100, Math.round((item.quantity / (item.min_quantity * 2)) * 100))
              : 100

            return (
              <div key={item.inventory_id} className={`card ${item.is_low ? 'border-red-200 bg-red-50' : ''}`}>
                <div className="flex items-start gap-3">
                  {/* Thông tin nguyên liệu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800">{item.ingredient_name}</p>
                      {item.is_low && (
                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" strokeWidth={2} />
                          Sắp hết
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className={`text-sm font-bold ${item.is_low ? 'text-red-600' : 'text-gray-700'}`}>
                        {item.quantity} {item.unit}
                      </p>
                      <span className="text-xs text-gray-400">
                        / ngưỡng: {item.min_quantity} {item.unit}
                      </span>
                    </div>
                    {/* Progress bar tồn kho */}
                    <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden w-36">
                      <div
                        className={`h-full rounded-full transition-all ${item.is_low ? 'bg-red-400' : 'bg-emerald-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Nhập hàng */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {/* Input + nút lưu */}
                    <div className="flex gap-1.5">
                      <input
                        type="number" min="0"
                        className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm
                                   focus:outline-none focus:ring-2 focus:ring-amber-400"
                        placeholder="Số nhập"
                        value={inp?.value ?? ''}
                        onChange={e => setInputs(p => ({
                          ...p,
                          [item.inventory_id]: { value: e.target.value }
                        }))}
                        onKeyDown={e => e.key === 'Enter' && handleUpdate(item)}
                      />
                      <button
                        onClick={() => handleUpdate(item)}
                        disabled={!inp?.value}
                        className="btn-primary text-xs py-1.5 px-2.5 disabled:opacity-40"
                      >
                        Lưu
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="card mt-5">
          <h3 className="font-bold text-gray-800 mb-2">Nhà cung cấp</h3>
          <form onSubmit={handleCreateSupplier} className="grid grid-cols-2 gap-2 mb-3">
            <input className="input-field col-span-2" placeholder="Tên nhà cung cấp *" value={supplierForm.supplier_name}
              onChange={e => setSupplierForm(f => ({ ...f, supplier_name: e.target.value }))} required />
            <input className="input-field" placeholder="SĐT" value={supplierForm.phone}
              onChange={e => setSupplierForm(f => ({ ...f, phone: e.target.value }))} />
            <input className="input-field" placeholder="Email" value={supplierForm.email}
              onChange={e => setSupplierForm(f => ({ ...f, email: e.target.value }))} />
            <input className="input-field col-span-2" placeholder="Địa chỉ" value={supplierForm.address}
              onChange={e => setSupplierForm(f => ({ ...f, address: e.target.value }))} />
            <button type="submit" className="btn-primary col-span-2 text-sm">Thêm nhà cung cấp</button>
          </form>
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {suppliers.map(s => (
              <button
                key={s.supplier_id}
                type="button"
                onClick={() => selectSupplier(s)}
                className={`w-full text-left border rounded-lg px-3 py-2 text-sm transition-colors ${
                  String(selectedSupplierId) === String(s.supplier_id)
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-gray-100 hover:bg-gray-50'
                }`}
              >
                <p className="font-semibold text-gray-800">{s.supplier_name}</p>
                <p className="text-xs text-gray-500">{s.phone || '—'} {s.email ? `· ${s.email}` : ''}</p>
                <p className="text-[11px] text-gray-400 mt-1">{s.status}</p>
              </button>
            ))}
          </div>

          {selectedSupplier && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <h4 className="font-semibold text-gray-800 mb-2">Chi tiết: {selectedSupplier.supplier_name}</h4>
              <form onSubmit={handleUpdateSupplier} className="grid grid-cols-2 gap-2 mb-3">
                <input className="input-field col-span-2" value={supplierEditForm.supplier_name}
                  onChange={e => setSupplierEditForm(f => ({ ...f, supplier_name: e.target.value }))} required />
                <input className="input-field" value={supplierEditForm.phone}
                  onChange={e => setSupplierEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="SĐT" />
                <input className="input-field" value={supplierEditForm.email}
                  onChange={e => setSupplierEditForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" />
                <input className="input-field col-span-2" value={supplierEditForm.address}
                  onChange={e => setSupplierEditForm(f => ({ ...f, address: e.target.value }))} placeholder="Địa chỉ" />
                <select className="input-field col-span-2" value={supplierEditForm.status}
                  onChange={e => setSupplierEditForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <button type="submit" className="btn-primary text-sm">Lưu chỉnh sửa</button>
                <button type="button" onClick={handleDeleteSupplier} className="btn-danger text-sm">Xóa NCC</button>
              </form>

              <div className="border border-gray-100 rounded-lg p-2">
                <p className="text-sm font-semibold text-gray-700 mb-2">Tạo lịch sử giao dịch nhập kho</p>
                <form onSubmit={handleCreateSupplierTransaction} className="grid grid-cols-2 gap-2 mb-2">
                  <select className="input-field col-span-2" value={supplierTxForm.inventory_id}
                    onChange={e => setSupplierTxForm(f => ({ ...f, inventory_id: e.target.value }))} required>
                    <option value="">Chọn nguyên liệu</option>
                    {items.map(i => (
                      <option key={i.inventory_id} value={i.inventory_id}>
                        {i.ingredient_name} (tồn {i.quantity} {i.unit || ''})
                      </option>
                    ))}
                  </select>
                  <input type="number" min="0.01" step="0.01" className="input-field" placeholder="Số lượng nhập"
                    value={supplierTxForm.quantity}
                    onChange={e => setSupplierTxForm(f => ({ ...f, quantity: e.target.value }))} required />
                  <input className="input-field" placeholder="Ghi chú"
                    value={supplierTxForm.note}
                    onChange={e => setSupplierTxForm(f => ({ ...f, note: e.target.value }))} />
                  <button type="submit" className="btn-primary col-span-2 text-sm">Tạo giao dịch</button>
                </form>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {supplierTransactions.length === 0 ? (
                    <p className="text-xs text-gray-400">Chưa có giao dịch cho nhà cung cấp này.</p>
                  ) : supplierTransactions.map(t => (
                    <div key={t.transaction_id} className="border-b border-gray-100 py-1 text-xs last:border-0">
                      <p className="font-semibold text-gray-700">{t.ingredient_name} · +{t.quantity} {t.unit || ''}</p>
                      <p className="text-gray-500">{t.note || 'Nhap kho'}</p>
                      <p className="text-gray-400">{t.created_at ? new Date(t.created_at).toLocaleString('vi-VN') : ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
      </div>

      <div className="card mt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-gray-800">Lịch sử nhập kho</h3>
          <button type="button" onClick={exportTransactionsCsv} className="btn-secondary text-xs inline-flex items-center gap-1.5">
            <Save className="h-3.5 w-3.5" strokeWidth={2} />Export CSV
          </button>
        </div>
        <div className="flex gap-2 mb-2">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'IN', label: 'IN' },
            { key: 'ADJUST', label: 'ADJUST' },
          ].map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setTxTypeFilter(opt.key)}
              className={`px-2.5 py-1 text-xs rounded-lg border ${txTypeFilter === opt.key ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2 mb-2">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Từ ngày</label>
            <input type="date" className="input-field text-sm" value={txDateRange.from}
              onChange={e => setTxDateRange(r => ({ ...r, from: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Đến ngày</label>
            <input type="date" className="input-field text-sm" value={txDateRange.to}
              onChange={e => setTxDateRange(r => ({ ...r, to: e.target.value }))} />
          </div>
          <button type="button" onClick={() => setTxDateRange({ from: '', to: '' })} className="btn-ghost text-xs">Xóa ngày</button>
        </div>
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {filteredTransactionsByDate.map(t => (
            <div key={t.transaction_id} className="flex items-center justify-between border-b border-gray-100 py-1.5 text-sm last:border-0">
              <div>
                <p className="font-medium text-gray-700">{t.ingredient_name}</p>
                <p className="text-xs text-gray-400">{t.note || 'Cap nhat kho'}{t.supplier_name ? ` · ${t.supplier_name}` : ''}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${t.type === 'IN' ? 'text-emerald-700' : t.type === 'OUT' ? 'text-red-600' : 'text-blue-700'}`}>
                  {t.type === 'IN' ? '+' : t.type === 'OUT' ? '-' : '='} {t.quantity} {t.unit || ''}
                </p>
                <p className="text-[11px] text-gray-400">{t.created_at ? new Date(t.created_at).toLocaleString('vi-VN') : ''}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  UC10: View Order History
// ══════════════════════════════════════════════════════════
function OrderHistoryTab() {
  const [bills, setBills]       = useState([])
  const [loading, setLoading]   = useState(false)
  const [searched, setSearched] = useState(false)
  const [search, setSearch]     = useState('')
  const [form, setForm]         = useState({ from: '', to: '' })
  const [selected, setSelected] = useState(null)

  const today = new Date().toISOString().split('T')[0]

  const handleSearch = async e => {
    e?.preventDefault()
    setLoading(true)
    setSearched(false)
    setSelected(null)
    try {
      const res = await api.get(`/payment/bills/history?from=${form.from}&to=${form.to}`)
      setBills(res.data)
    } catch {
      setBills([])
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }

  const filtered = useMemo(() => {
    if (!search) return bills
    const q = search.toLowerCase()
    return bills.filter(b =>
      String(b.table_number).includes(q) ||
      String(b.bill_id).includes(q) ||
      (b.method || '').toLowerCase().includes(q)
    )
  }, [bills, search])

  const totalRevenue = filtered.reduce((s, b) => s + b.amount, 0)

  return (
    <div>
      <h2 className="font-bold text-gray-800 mb-4">Lịch Sử Đơn Hàng</h2>

      {/* Bộ lọc ngày */}
      <form onSubmit={handleSearch} className="card mb-4 border-amber-200">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
          Chọn khoảng thời gian
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Từ ngày</label>
            <input type="date" className="input-field" value={form.from} max={today}
              onChange={e => setForm(f => ({ ...f, from: e.target.value }))} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Đến ngày</label>
            <input type="date" className="input-field" value={form.to} max={today}
              onChange={e => setForm(f => ({ ...f, to: e.target.value }))} required />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'Hôm nay',
              from: today, to: today },
            { label: '7 ngày',
              from: new Date(Date.now() - 6*864e5).toISOString().split('T')[0], to: today },
            { label: '30 ngày',
              from: new Date(Date.now() - 29*864e5).toISOString().split('T')[0], to: today },
          ].map(p => (
            <button key={p.label} type="button"
              onClick={() => { setForm({ from: p.from, to: p.to }) }}
              className="btn-ghost text-xs py-1 px-3 border border-gray-200 rounded-lg">
              {p.label}
            </button>
          ))}
          <button type="submit" className="btn-primary text-sm ml-auto inline-flex items-center gap-2" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Search className="h-4 w-4" strokeWidth={2} />}
            Tìm kiếm
          </button>
        </div>
      </form>

      {searched && (
        bills.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="flex justify-center mb-2">
              <Inbox className="h-10 w-10 opacity-50" strokeWidth={1.25} />
            </div>
            <p className="font-medium">Không có đơn hàng trong khoảng thời gian này</p>
          </div>
        ) : (
          <div>
            {/* Tóm tắt */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="card text-center">
                <p className="text-2xl font-bold text-blue-700">{filtered.length}</p>
                <p className="text-xs text-gray-500">Hóa đơn</p>
              </div>
              <div className="card text-center col-span-2">
                <p className="text-2xl font-bold text-amber-700">{fmt(totalRevenue)}</p>
                <p className="text-xs text-gray-500">Tổng doanh thu</p>
              </div>
            </div>

            {/* Tìm kiếm trong kết quả */}
            <div className="mb-3">
              <SearchBox
                value={search}
                onChange={setSearch}
                placeholder="Tìm theo bàn, bill ID, phương thức..."
              />
            </div>

            <div className="space-y-2">
              {filtered.map(bill => (
                <button key={bill.bill_id}
                  onClick={() => setSelected(selected?.bill_id === bill.bill_id ? null : bill)}
                  className="card-hover w-full text-left">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-800">
                        Bàn {bill.table_number} &nbsp;—&nbsp; Bill #{bill.bill_id}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {bill.payment_date
                          ? new Date(bill.payment_date).toLocaleString('vi-VN')
                          : ''}&nbsp;•&nbsp;
                        {bill.method === 'Cash' ? (
                          <span className="inline-flex items-center gap-1"><Banknote className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> Tiền mặt</span>
                        ) : bill.method === 'E-wallet' ? (
                          <span className="inline-flex items-center gap-1"><Smartphone className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> Chuyển khoản</span>
                        ) : (
                          <span className="inline-flex items-center gap-1"><CreditCard className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> Thẻ</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-amber-700">{fmt(bill.amount)}</p>
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        Đã TT
                      </span>
                    </div>
                  </div>
                  {selected?.bill_id === bill.bill_id && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-left">
                      {bill.orders?.map(order => (
                        <div key={order.order_id} className="mb-2">
                          <p className="text-xs font-bold text-gray-400 mb-1">Order #{order.order_id}</p>
                          {order.items?.map(item => (
                            <div key={item.order_item_id} className="flex justify-between text-sm text-gray-600 py-0.5">
                              <span>{item.name} × {item.quantity}</span>
                              <span>{fmt(item.subtotal)}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  UC11: View Report
// ══════════════════════════════════════════════════════════
function ReportsTab() {
  const today = localDateISO()
  const monthStart = localDateISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

  const [summary, setSummary]   = useState(null)
  const [daily, setDaily]       = useState([])
  const [hourly, setHourly]     = useState([])
  const [topItems, setTopItems] = useState([])
  const [catRev, setCatRev]     = useState([])
  const [form, setForm]         = useState(() => ({
    from: localDateISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    to: localDateISO(),
  }))
  const [loading, setLoading]   = useState(true)
  const [reports, setReports]   = useState([])
  const [genForm, setGenForm]   = useState(() => ({
    type_report: '',
    period_start: localDateISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    period_end: localDateISO(),
  }))
  /** Báo cáo đang xem chi tiết (modal) */
  const [savedDetail, setSavedDetail] = useState(null)
  const { toast: showToast } = useToast()

  const loadAll = async (f = form) => {
    setLoading(true)
    try {
      const qs = `?from=${encodeURIComponent(f.from)}&to=${encodeURIComponent(f.to)}`
      const settled = await Promise.allSettled([
        api.get('/reports/summary'),
        api.get(`/reports/revenue/daily${qs}`),
        api.get(`/reports/revenue/hourly${qs}`),
        api.get(`/reports/top-items${qs}&limit=8`),
        api.get(`/reports/revenue/category${qs}`),
        api.get('/reports'),
      ])
      const pick = (i) => settled[i].status === 'fulfilled' ? settled[i].value : null
      const s = pick(0), d = pick(1), h = pick(2), t = pick(3), c = pick(4), r = pick(5)

      const sum = s?.data
      setSummary(sum && typeof sum === 'object' ? sum : null)
      setDaily(Array.isArray(d?.data) ? d.data : [])
      setHourly(Array.isArray(h?.data) ? h.data : [])
      setTopItems(Array.isArray(t?.data) ? t.data : [])
      setCatRev(Array.isArray(c?.data) ? c.data : [])
      setReports(Array.isArray(r?.data) ? r.data : [])

      const nFail = settled.filter((p) => p.status === 'rejected').length
      if (nFail === settled.length) {
        showToast('Lỗi tải báo cáo — kiểm tra backend đang chạy và quyền Manager', 'error')
      } else if (nFail > 0) {
        showToast('Một phần dữ liệu báo cáo không tải được (xem tab Network)', 'warning')
      }
    } catch {
      showToast('Lỗi tải báo cáo', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  // ── Xuất báo cáo ra file HTML ──────────────────────────
  const exportReportHTML = (report, chartData = {}) => {
    const { type_report, period_start, period_end, total_revenue, total_orders, created_at } = report
    const fmtDate = d => d ? new Date(d).toLocaleDateString('vi-VN') : ''
    const fmtMoney = v => Number(v || 0).toLocaleString('vi-VN') + ' ₫'

    // ── helper: tạo bar chart HTML thuần ──
    const buildBarChart = ({ data, labelKey, valueKey, color, formatVal, title, icon }) => {
      if (!data || data.length === 0) return ''
      const maxVal = Math.max(...data.map(d => d[valueKey] || 0), 1)
      const bars = data.map(d => {
        const pct = Math.max(2, Math.round(((d[valueKey] || 0) / maxVal) * 100))
        const label = String(d[labelKey] || '').substring(0, 12)
        return `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <span style="font-size:11px;color:#6b7280;width:90px;flex-shrink:0;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${d[labelKey]}">${label}</span>
            <div style="flex:1;background:#f3f4f6;border-radius:99px;height:22px;overflow:hidden;position:relative">
              <div style="width:${pct}%;background:${color};height:100%;border-radius:99px;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;box-sizing:border-box;transition:width .3s">
                <span style="font-size:11px;color:#fff;font-weight:600;white-space:nowrap">${formatVal(d[valueKey] || 0)}</span>
              </div>
            </div>
          </div>`
      }).join('')
      return `
        <section>
          <h2>${icon} ${title}</h2>
          <div style="margin-top:8px">${bars}</div>
        </section>`
    }

    // ── biểu đồ doanh thu theo ngày ──
    const dailyChartHTML = buildBarChart({
      data: chartData.daily || [],
      labelKey: 'day',
      valueKey: 'revenue',
      color: 'linear-gradient(90deg,#d97706,#f59e0b)',
      formatVal: v => fmtMoney(v),
      title: 'Doanh thu theo ngày',
      icon: '📅',
    })

    // ── biểu đồ món bán chạy ──
    const topItemsChartHTML = buildBarChart({
      data: chartData.topItems || [],
      labelKey: 'name',
      valueKey: 'qty_sold',
      color: 'linear-gradient(90deg,#2563eb,#60a5fa)',
      formatVal: v => `${v} ly`,
      title: 'Món bán chạy nhất',
      icon: '🏆',
    })

    // ── biểu đồ doanh thu theo danh mục ──
    const catChartHTML = buildBarChart({
      data: chartData.catRev || [],
      labelKey: 'category',
      valueKey: 'revenue',
      color: 'linear-gradient(90deg,#7c3aed,#a78bfa)',
      formatVal: v => fmtMoney(v),
      title: 'Doanh thu theo danh mục',
      icon: '📂',
    })

    // ── biểu đồ giờ cao điểm ──
    const hourlyChartHTML = buildBarChart({
      data: chartData.hourly || [],
      labelKey: 'label',
      valueKey: 'orders',
      color: 'linear-gradient(90deg,#059669,#34d399)',
      formatVal: v => `${v} đơn`,
      title: 'Giờ cao điểm',
      icon: '🕐',
    })

    // ── bảng dữ liệu chi tiết ──
    const topItemsRows = (chartData.topItems || []).map((item, i) => `
      <tr style="background:${i%2===0?'#fffbeb':'#ffffff'}">
        <td style="padding:6px 12px;font-weight:600">${i+1}. ${item.name || item.item_name || ''}</td>
        <td style="padding:6px 12px;text-align:right">${item.qty_sold ?? item.total_sold ?? item.quantity ?? ''}</td>
        <td style="padding:6px 12px;text-align:right;color:#b45309">${fmtMoney(item.revenue || item.total_revenue)}</td>
      </tr>`).join('')

    const dailyRows = (chartData.daily || []).map((d, i) => `
      <tr style="background:${i%2===0?'#f0fdf4':'#ffffff'}">
        <td style="padding:6px 12px">${d.date || d.day || ''}</td>
        <td style="padding:6px 12px;text-align:right">${d.bills ?? d.orders ?? ''}</td>
        <td style="padding:6px 12px;text-align:right;color:#b45309;font-weight:600">${fmtMoney(d.revenue)}</td>
      </tr>`).join('')

    const catRows = (chartData.catRev || []).map((c, i) => `
      <tr style="background:${i%2===0?'#eff6ff':'#ffffff'}">
        <td style="padding:6px 12px">${c.category || ''}</td>
        <td style="padding:6px 12px;text-align:right">${c.qty_sold ?? ''}</td>
        <td style="padding:6px 12px;text-align:right;font-weight:600;color:#1d4ed8">${fmtMoney(c.revenue)}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo cáo: ${type_report}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 32px; color: #1f2937; background: #f9fafb }
    .header { background: linear-gradient(135deg,#92400e,#d97706); color: #fff; border-radius: 12px; padding: 24px 32px; margin-bottom: 24px }
    .header h1 { margin:0 0 4px; font-size: 22px }
    .header p  { margin:0; opacity: 0.85; font-size: 13px }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px }
    .kpi { background:#fff; border-radius:10px; padding:18px; box-shadow:0 1px 4px rgba(0,0,0,.07); text-align:center }
    .kpi .val { font-size: 22px; font-weight: 700; color: #b45309 }
    .kpi .lbl { font-size: 12px; color: #6b7280; margin-top: 4px }
    .section-title { font-size:13px;font-weight:700;color:#374151;letter-spacing:.03em;margin:28px 0 12px;padding-bottom:6px;border-bottom:2px solid #e5e7eb;display:flex;align-items:center;gap:6px }
    section { background:#fff; border-radius:10px; padding:20px; box-shadow:0 1px 4px rgba(0,0,0,.07); margin-bottom:20px }
    section h2 { font-size:14px; font-weight:700; color:#374151; margin:0 0 14px; border-bottom:2px solid #fcd34d; padding-bottom:6px }
    table { width:100%; border-collapse:collapse; font-size:13px }
    th { background:#fef3c7; color:#78350f; padding:8px 12px; text-align:left; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.04em }
    .charts-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px }
    .charts-grid section { margin-bottom:0 }
    .footer { text-align:center; color:#9ca3af; font-size:11px; margin-top:24px }
    @media print { body{padding:16px} .charts-grid{grid-template-columns:1fr} }
    @media (max-width:640px) { .kpi-grid{grid-template-columns:1fr 1fr} .charts-grid{grid-template-columns:1fr} }
  </style>
</head>
<body>
  <div class="header">
    <h1>☕ Báo cáo: ${type_report}</h1>
    <p>Kỳ: ${fmtDate(period_start)} — ${fmtDate(period_end)} &nbsp;|&nbsp; Xuất lúc: ${new Date(created_at || Date.now()).toLocaleString('vi-VN')}</p>
  </div>

  <div class="kpi-grid">
    <div class="kpi"><div class="val">${fmtMoney(total_revenue)}</div><div class="lbl">Tổng doanh thu</div></div>
    <div class="kpi"><div class="val">${total_orders ?? 0}</div><div class="lbl">Số đơn hàng</div></div>
    <div class="kpi"><div class="val">${total_revenue && total_orders ? fmtMoney(Math.round(total_revenue / total_orders)) : '—'}</div><div class="lbl">Trung bình / đơn</div></div>
  </div>

  ${dailyChartHTML ? `<div>${dailyChartHTML}</div>` : ''}

  ${(topItemsChartHTML || catChartHTML) ? `<div class="charts-grid">${topItemsChartHTML}${catChartHTML}</div>` : ''}

  ${hourlyChartHTML ? `<div>${hourlyChartHTML}</div>` : ''}

  ${dailyRows ? `<section>
    <h2>📅 Chi tiết doanh thu theo ngày</h2>
    <table><thead><tr><th>Ngày</th><th style="text-align:right">Đơn</th><th style="text-align:right">Doanh thu</th></tr></thead>
    <tbody>${dailyRows}</tbody></table>
  </section>` : ''}

  ${topItemsRows ? `<section>
    <h2>🏆 Chi tiết món bán chạy nhất</h2>
    <table><thead><tr><th>Món</th><th style="text-align:right">Số lượng</th><th style="text-align:right">Doanh thu</th></tr></thead>
    <tbody>${topItemsRows}</tbody></table>
  </section>` : ''}

  ${catRows ? `<section>
    <h2>📂 Chi tiết doanh thu theo danh mục</h2>
    <table><thead><tr><th>Danh mục</th><th style="text-align:right">Phần</th><th style="text-align:right">Doanh thu</th></tr></thead>
    <tbody>${catRows}</tbody></table>
  </section>` : ''}

  <div class="footer">Coffee Shop Management — báo cáo tự động</div>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    const safeName = (type_report || 'baocao').replace(/[^a-zA-Z0-9À-ỹ ]/g, '').replace(/\s+/g, '_')
    a.href     = url
    a.download = `BaoCao_${safeName}_${String(period_start).slice(0,10)}.html`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  const handleGenerate = async e => {
    e.preventDefault()
    try {
      const res = await api.post('/reports', genForm)
      const saved = res.data   // backend trả về object vừa tạo
      showToast('Đã lưu báo cáo — đang xuất file...')
      await loadAll()
      // xuất file kèm dữ liệu biểu đồ hiện tại
      exportReportHTML(
        saved || { ...genForm, total_revenue: daily.reduce((s,d)=>s+d.revenue,0), total_orders: daily.reduce((s,d)=>s+(d.bills||0),0), created_at: new Date().toISOString() },
        { daily, topItems, catRev, hourly }
      )
    } catch(err) { showToast(err.response?.data?.error || 'Lỗi', 'error') }
  }

  const handleDeleteReport = async (reportId) => {
    if (!confirm('Xác nhận xoá báo cáo này?')) return
    try {
      await api.delete(`/reports/${reportId}`)
      showToast('Đã xoá báo cáo')
      setSavedDetail(null)
      await loadAll()
    } catch(err) {
      showToast(err.response?.data?.error || 'Lỗi khi xoá báo cáo', 'error')
    }
  }

  // Simple bar chart using divs
  const BarChart = ({ data, labelKey, valueKey, color='bg-amber-500', formatVal=v=>v }) => {
    const max = Math.max(...data.map(d=>d[valueKey]), 1)
    return (
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-16 shrink-0 text-right">{d[labelKey]}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div className={`h-full ${color} rounded-full flex items-center justify-end pr-1 transition-all`}
                style={{ width:`${Math.max(2,(d[valueKey]/max)*100)}%` }}>
                <span className="text-xs text-white font-semibold truncate">{formatVal(d[valueKey])}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const totalRevenue = daily.reduce((s,d)=>s+d.revenue,0)
  const totalOrders  = daily.reduce((s,d)=>s+d.bills,0)
  const peakHour     = hourly.reduce((a,b)=>b.orders>a.orders?b:a, {hour:0,orders:0})

  return (
    <div>
      <h2 className="font-bold text-gray-800 mb-4">Báo Cáo & Thống Kê</h2>

      {/* Today summary */}
      {summary && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label:'Doanh thu hôm nay', v:fmt(summary.revenue_today), Icon: Wallet, c:'text-amber-700' },
            { label:'Bill đã TT hôm nay', v:summary.bills_paid_today,  Icon: Receipt, c:'text-blue-700'  },
            { label:'Orders hôm nay',     v:summary.orders_today,       Icon: ClipboardList, c:'text-emerald-700' },
          ].map(s => {
            const KpiIcon = s.Icon
            return (
            <div key={s.label} className="card text-center">
              <div className="flex justify-center mb-1">
                <KpiIcon className={`h-6 w-6 ${s.c}`} strokeWidth={2} />
              </div>
              <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
            )
          })}
        </div>
      )}

      {/* Date range filter */}
      <div className="card mb-6 border-amber-200">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Chọn kỳ phân tích</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Từ ngày</label>
            <input type="date" className="input-field" value={form.from} max={today}
              onChange={e => setForm(f=>({...f,from:e.target.value}))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Đến ngày</label>
            <input type="date" className="input-field" value={form.to} max={today}
              onChange={e => setForm(f=>({...f,to:e.target.value}))} />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { label:'Tháng này', from: monthStart, to: today },
            { label:'7 ngày',   from: localDateISO(new Date(Date.now() - 6 * 86400000)), to: today },
            { label:'30 ngày',  from: localDateISO(new Date(Date.now() - 29 * 86400000)), to: today },
          ].map(p=>(
            <button key={p.label} type="button"
              onClick={() => { setForm({from:p.from,to:p.to}); loadAll({from:p.from,to:p.to}) }}
              className="btn-ghost text-xs py-1 px-3 border border-gray-200 rounded-lg">{p.label}</button>
          ))}
          <button onClick={() => loadAll(form)} disabled={loading}
            className="btn-primary text-sm ml-auto inline-flex items-center gap-2">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin shrink-0" strokeWidth={2} /> Đang tải...</> : <><BarChart3 className="h-4 w-4 shrink-0" strokeWidth={2} /> Xem báo cáo</>}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin shrink-0" strokeWidth={2} />
            Đang tải dữ liệu...
          </span>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Period summary */}
          {daily.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="card text-center">
                <p className="text-xl font-bold text-amber-700">{fmt(totalRevenue)}</p>
                <p className="text-xs text-gray-500">Tổng doanh thu</p>
              </div>
              <div className="card text-center">
                <p className="text-xl font-bold text-blue-700">{totalOrders}</p>
                <p className="text-xs text-gray-500">Tổng bill</p>
              </div>
              <div className="card text-center">
                <p className="text-xl font-bold text-emerald-700">{peakHour.label||`${peakHour.hour}:00`}</p>
                <p className="text-xs text-gray-500">Giờ cao điểm</p>
              </div>
            </div>
          )}

          {/* Daily revenue chart */}
          {daily.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 inline-flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-600 shrink-0" strokeWidth={2} />
                Doanh thu theo ngày
              </h3>
              <BarChart data={daily} labelKey="day" valueKey="revenue"
                color="bg-amber-500" formatVal={v=>fmt(v)} />
            </div>
          )}

          {/* Two-col: top items + category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topItems.length > 0 && (
              <div className="card">
                <h3 className="font-bold text-gray-800 mb-4 inline-flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-600 shrink-0" strokeWidth={2} />
                  Món bán chạy
                </h3>
                <BarChart data={topItems} labelKey="name" valueKey="qty_sold"
                  color="bg-blue-500" formatVal={v=>`${v} ly`} />
              </div>
            )}

            {catRev.length > 0 && (
              <div className="card">
                <h3 className="font-bold text-gray-800 mb-4 inline-flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-amber-600 shrink-0" strokeWidth={2} />
                  Doanh thu theo danh mục
                </h3>
                <div className="space-y-2">
                  {catRev.map((c,i) => (
                    <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{c.category}</p>
                        <p className="text-xs text-gray-500">{c.qty_sold} phần</p>
                      </div>
                      <p className="font-bold text-amber-700 text-sm">{fmt(c.revenue)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Peak time chart */}
          {hourly.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 inline-flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600 shrink-0" strokeWidth={2} />
                Giờ cao điểm
              </h3>
              <BarChart data={hourly} labelKey="label" valueKey="orders"
                color="bg-emerald-500" formatVal={v=>`${v} đơn`} />
            </div>
          )}

          {/* No data message */}
          {daily.length === 0 && topItems.length === 0 && (
            <div className="text-center py-10 text-gray-400 card">
              <div className="flex justify-center mb-2">
                <BarChart3 className="h-10 w-10 opacity-40" strokeWidth={1.25} />
              </div>
              <p className="font-medium">Chưa có dữ liệu trong khoảng thời gian này</p>
              <p className="text-xs mt-1">Hãy chọn khoảng thời gian khác hoặc tạo thêm đơn hàng</p>
            </div>
          )}
        </div>
      )}

      {/* Generate & save report */}
      <div className="card mt-6 border-amber-200">
        <h3 className="font-bold text-gray-800 mb-3 inline-flex items-center gap-2">
          <Save className="h-5 w-5 text-amber-700 shrink-0" strokeWidth={2} />
          Tạo & Lưu Báo Cáo
        </h3>
        <form onSubmit={handleGenerate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Từ ngày</label>
              <input type="date" className="input-field" value={genForm.period_start} max={today}
                onChange={e=>setGenForm(f=>({...f,period_start:e.target.value}))} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Đến ngày</label>
              <input type="date" className="input-field" value={genForm.period_end} max={today}
                onChange={e=>setGenForm(f=>({...f,period_end:e.target.value}))} required />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Tên báo cáo</label>
            <input className="input-field" value={genForm.type_report}
              onChange={e=>setGenForm(f=>({...f,type_report:e.target.value}))}
              placeholder="VD: Tháng 4/2026" required />
          </div>
          <button type="submit" className="btn-primary w-full inline-flex items-center justify-center gap-2">
            <Download className="h-4 w-4 shrink-0" strokeWidth={2} />
            Lưu & Xuất file báo cáo
          </button>
        </form>
      </div>

      {/* Saved reports list */}
      {reports.length > 0 && (
        <div className="mt-4">
          <h3 className="font-bold text-gray-700 mb-1">Báo cáo đã lưu</h3>
          <p className="text-xs text-gray-400 mb-2">Nhấn vào một dòng để xem lại chi tiết</p>
          <div className="space-y-2">
            {reports.map(r=>(
              <div
                key={r.report_id}
                className="card flex justify-between items-center gap-3 hover:ring-2 hover:ring-amber-300 hover:bg-amber-50/40 transition-all"
              >
                <button
                  type="button"
                  onClick={() => setSavedDetail(r)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="font-semibold text-gray-800 truncate">{r.type_report}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(r.period_start).toLocaleDateString('vi-VN')} →{' '}
                    {new Date(r.period_end).toLocaleDateString('vi-VN')} •{' '}
                    Tạo {new Date(r.created_at).toLocaleString('vi-VN')}
                  </p>
                </button>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="font-bold text-amber-700">{fmt(r.total_revenue)}</p>
                    <p className="text-xs text-gray-500">{r.total_orders} orders</p>
                  </div>
                  <button
                    type="button"
                    title="Tải xuống báo cáo"
                    onClick={() => exportReportHTML(r, {})}
                    className="p-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors border border-amber-200"
                  >
                    <Download className="h-4 w-4" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    title="Xoá báo cáo"
                    onClick={e => { e.stopPropagation(); handleDeleteReport(r.report_id) }}
                    className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-200"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chi tiết báo cáo đã lưu */}
      {savedDetail && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/45"
          onClick={() => setSavedDetail(null)}
          role="presentation"
        >
          <div
            className="card max-w-md w-full shadow-2xl border border-amber-100"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">Báo cáo đã lưu</p>
            <h3 className="font-bold text-lg text-gray-900 mb-3">{savedDetail.type_report}</h3>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4 border-b border-gray-100 pb-2">
                <dt className="text-gray-500">Kỳ báo cáo</dt>
                <dd className="font-medium text-gray-800 text-right">
                  {new Date(savedDetail.period_start).toLocaleDateString('vi-VN')}
                  {' — '}
                  {new Date(savedDetail.period_end).toLocaleDateString('vi-VN')}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-gray-100 pb-2">
                <dt className="text-gray-500">Tổng doanh thu</dt>
                <dd className="font-bold text-amber-700">{fmt(savedDetail.total_revenue)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-gray-100 pb-2">
                <dt className="text-gray-500">Tổng số order (ước tính)</dt>
                <dd className="font-semibold text-gray-800">{savedDetail.total_orders}</dd>
              </div>
              <div className="flex justify-between gap-4 pt-1">
                <dt className="text-gray-500">Thời điểm tạo</dt>
                <dd className="text-gray-700 text-right">
                  {new Date(savedDetail.created_at).toLocaleString('vi-VN')}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col sm:flex-row gap-2 mt-5">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setSavedDetail(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn-secondary flex-1 inline-flex items-center justify-center gap-2"
                onClick={() => exportReportHTML(savedDetail, {})}
              >
                <Download className="h-4 w-4" strokeWidth={2} />
                Tải xuống
              </button>
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 font-semibold hover:bg-red-100 transition-colors text-sm"
                onClick={() => handleDeleteReport(savedDetail.report_id)}
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
                Xoá
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={() => {
                  const from = String(savedDetail.period_start).slice(0, 10)
                  const to = String(savedDetail.period_end).slice(0, 10)
                  setForm({ from, to })
                  setGenForm(f => ({ ...f, period_start: from, period_end: to }))
                  loadAll({ from, to })
                  setSavedDetail(null)
                }}
              >
                Xem biểu đồ theo kỳ này
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  DashboardTab — KPI hôm nay + live feed
// ══════════════════════════════════════════════════════════
function DashboardTab() {
  const [summary, setSummary]   = useState(null)
  const [recent, setRecent]     = useState([])
  const [lowStockCount, setLowStockCount] = useState(0)
  const [loading, setLoading]   = useState(true)
  const { error: toastError } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const today = localDateISO()
      const [s, h, inv] = await Promise.all([
        api.get('/reports/summary'),
        api.get(`/orders/history?from=${today}&to=${today}`),
        api.get('/inventory/alerts'),
      ])
      const sum = s.data
      setSummary(sum && typeof sum === 'object' ? sum : null)
      const hist = h.data
      if (Array.isArray(hist)) {
        const sorted = [...hist].sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
        )
        setRecent(sorted.slice(0, 5))
      } else {
        setRecent([])
      }
      const alerts = inv.data
      setLowStockCount(Array.isArray(alerts) ? alerts.length : 0)
    } catch {
      toastError('Không thể tải dashboard')
    } finally {
      setLoading(false)
    }
  }, [toastError])

  useEffect(() => { load() }, [load])

  if (loading) return <SkeletonKPICards />

  return (
    <div>
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <p className="section-title">Doanh thu hôm nay</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {new Intl.NumberFormat('vi-VN').format(summary?.revenue_today || 0)}₫
          </p>
          <p className="text-xs text-gray-400 mt-1">{summary?.bills_paid_today || 0} bill đã thanh toán</p>
        </div>
        <div className="card">
          <p className="section-title">Orders hôm nay</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{summary?.orders_today || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Tổng số order tạo ra</p>
        </div>
        <div className="card">
          <p className="section-title">Ngày báo cáo</p>
          <p className="text-base font-bold text-gray-700 mt-1">
            {summary?.date ? new Date(summary.date).toLocaleDateString('vi-VN') : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Dữ liệu realtime</p>
        </div>
        <div className={`card ${lowStockCount > 0 ? 'border-amber-200 bg-amber-50' : ''}`}>
          <p className="section-title" style={lowStockCount > 0 ? { color: '#B45309' } : {}}>
            Kho cảnh báo
          </p>
          <p className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
            {lowStockCount > 0 ? lowStockCount : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Xem tab Kho để chi tiết</p>
        </div>
      </div>

      {/* Live feed */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-700">5 Order gần nhất hôm nay</h3>
          <button onClick={load} className="btn-ghost text-xs py-1 px-2 inline-flex items-center gap-1">
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
            Làm mới
          </button>
        </div>
        {recent.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
            <div className="flex justify-center mb-2">
              <Inbox className="h-9 w-9 opacity-50" strokeWidth={1.25} />
            </div>
            <p className="text-sm">Chưa có order nào hôm nay</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map(order => {
              const itemsSub =
                order.items?.reduce((s, i) => s + (Number(i.subtotal) || 0), 0) || 0
              const amount =
                typeof order.bill_amount === 'number' && order.bill_amount > 0
                  ? order.bill_amount
                  : itemsSub
              return (
              <div key={order.order_id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-gray-800 text-sm">
                    {order.table_number === 0 ? (
                      <span className="inline-flex items-center gap-1"><Package className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> Mang đi</span>
                    ) : (
                      `Bàn ${order.table_number}`
                    )}
                  </span>
                  <span className="text-xs text-gray-400 ml-2 hidden sm:inline">
                    {order.items?.slice(0, 2).map(i => `${i.name} ×${i.quantity}`).join(' · ')}
                    {(order.items?.length || 0) > 2 ? ` +${order.items.length - 2}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {amount > 0 && (
                    <span className="text-sm font-bold text-amber-700">
                      {new Intl.NumberFormat('vi-VN').format(amount)}₫
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    order.status === 'Completed' ? 'badge-completed' :
                    order.status === 'Preparing' ? 'badge-preparing' : 'badge-unpaid'
                  }`}>
                    {order.status === 'Completed' ? 'Xong' :
                     order.status === 'Preparing' ? 'Đang pha' : order.status}
                  </span>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  AI Assistant Tab — chat UI (POST /ai/chat)
// ══════════════════════════════════════════════════════════
function AiTab({ alerts = [], onRefreshAlerts }) {
  const QUICK = [
    'Hôm nay bán được bao nhiêu?',
    'Kho có gì sắp hết không?',
    'Món nào bán chậm nhất tuần này?',
    'Tình trạng bàn và order hiện tại?',
    'Giờ nào đông khách nhất?',
    'Đề xuất nhập hàng tuần tới?',
    'So sánh doanh thu 7 ngày gần nhất?',
    'Danh mục nào đóng góp doanh thu nhiều nhất?',
  ]

  const AGENTS = [
    { label: 'Report',     color: 'bg-blue-100 text-blue-700'  },
    { label: 'Inventory',  color: 'bg-amber-100 text-amber-700' },
    { label: 'Menu',       color: 'bg-green-100 text-green-700' },
    { label: 'Operations', color: 'bg-teal-100 text-teal-700'},
  ]

  const [messages, setMessages] = useState(() => ([{
    id: 'sys-1', role: 'assistant',
    content: `Xin chào! Tôi là AI Assistant — có thể truy cập dữ liệu thực từ hệ thống.
Hỏi tôi về doanh thu, kho hàng, menu, hoặc vận hành quán nhé.`,
  }]))
  const [text, setText]       = useState('')
  const [sending, setSending] = useState(false)
  const { toast: showToast }  = useToast()
  const bottomRef             = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const send = async (override) => {
    const content = (override || text).trim()
    if (!content || sending) return
    const userMsg = { id: `u-${Date.now()}`, role: 'user', content }
    setMessages(prev => [...prev, userMsg])
    setText('')
    setSending(true)
    try {
      const res = await api.post('/ai/chat', {
        message: content,
        history: messages
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .map(m => ({ role: m.role, content: m.content })),
      })
      const reply =
        res?.data?.reply ??
        res?.data?.message ??
        (typeof res?.data === 'string' ? res.data : '')
      if (!reply) throw new Error('Empty AI response')
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: String(reply) }])
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'AI Assistant không phản hồi'
      showToast(errMsg, 'error')
      setMessages(prev => [...prev, {
        id: `e-${Date.now()}`, role: 'assistant',
        content: `Lỗi: ${errMsg}

Kiểm tra:
• Backend Flask đang chạy ở port 5000
• GEMINI_API_KEY đã cấu hình trong file backend/.env`,
      }])
    } finally {
      setSending(false)
    }
  }

  const reset = () => {
    setMessages([{ id: 'sys-1', role: 'assistant', content: 'Xin chào! Tôi là AI Assistant — có thể truy cập dữ liệu thực từ hệ thống. Hỏi tôi về doanh thu, kho hàng, menu, hoặc vận hành quán nhé.' }]),
    setText('')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-600" strokeWidth={2} />
            AI Assistant
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Truy cập dữ liệu thực từ hệ thống — hỏi bằng tiếng Việt tự nhiên
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Agent badges */}
          <div className="hidden sm:flex gap-1.5">
            {AGENTS.map(a => (
              <span key={a.label} className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.color}`}>
                {a.label}
              </span>
            ))}
          </div>
          {alerts.filter(a => !a.read).length > 0 && (
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors"
              onClick={onRefreshAlerts}
            >
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
              {alerts.filter(a => !a.read).length} cảnh báo mới
            </button>
          )}
          <button type="button" className="btn-secondary text-sm" onClick={reset}>
            <RefreshCw className="h-3.5 w-3.5 mr-1 inline" strokeWidth={2} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-2">
        {QUICK.map(q => (
          <button
            key={q}
            type="button"
            onClick={() => send(q)}
            disabled={sending}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800 transition-colors disabled:opacity-40"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat window */}
      <div className="card flex flex-col" style={{ minHeight: 420 }}>
        <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ maxHeight: 480 }}>
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role !== 'user' && (
                <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-purple-600" strokeWidth={2} />
                </div>
              )}
              <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === 'user'
                  ? 'bg-amber-700 text-white rounded-tr-sm'
                  : 'bg-gray-100 text-gray-800 rounded-tl-sm'
              }`}>
                {m.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-purple-600" strokeWidth={2} />
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 p-3 flex gap-2">
          <input
            className="input-field flex-1"
            placeholder="Nhập câu hỏi… (Enter để gửi)"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            disabled={sending}
          />
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2 shrink-0"
            onClick={() => send()}
            disabled={sending || !text.trim()}
          >
            <Send className="h-4 w-4" strokeWidth={2} />
            Gửi
          </button>
        </div>
        <p className="text-xs text-gray-400 px-3 pb-2">
          AI kết nối trực tiếp hệ thống — dữ liệu phản ánh thực tế theo thời gian thực
        </p>
      </div>
    </div>
  )
}
// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
//  EmployeesTab — Quản lý tài khoản nhân viên
// ══════════════════════════════════════════════════════════
const EMPTY_FORM = { name: '', username: '', password: '', role: 'Cashier', phone: '' }

function EmployeesTab() {
  const [employees, setEmployees]   = useState([])
  const [search, setSearch]         = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('Active')
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [editId, setEditId]         = useState(null)
  const [editData, setEditData]     = useState({})
  const [showPwd, setShowPwd]       = useState(false)
  const [tempPwd, setTempPwd]       = useState(null)   // { username, temp_password }
  const { toast: showToast } = useToast()

  const load = async () => {
    try {
      const params = {}
      if (filterStatus !== 'all') params.status = filterStatus
      const r = await api.get('/employees', { params })
      setEmployees(r.data)
    } catch {
      showToast('Không tải được danh sách nhân viên', 'error')
    }
  }

  useEffect(() => { load() }, [filterStatus])

  const filtered = useMemo(() => {
    return employees.filter(e => {
      const matchSearch = !search ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.username.toLowerCase().includes(search.toLowerCase())
      const matchRole = filterRole === 'all' || e.role === filterRole
      return matchSearch && matchRole
    })
  }, [employees, search, filterRole])

  // ── Validate form tạo mới ──
  const validate = () => {
    const errs = {}
    if (!form.name.trim())     errs.name = 'Bắt buộc'
    if (!form.username.trim()) errs.username = 'Bắt buộc'
    if (form.password.length < 8) errs.password = 'Tối thiểu 8 ký tự'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Tạo nhân viên mới ──
  const handleCreate = async () => {
    if (!validate()) return
    try {
      await api.post('/employees', form)
      showToast(`Đã tạo tài khoản ${form.username}`)
      setForm(EMPTY_FORM)
      setShowForm(false)
      load()
    } catch (err) {
      showToast(err.response?.data?.error || 'Lỗi tạo tài khoản', 'error')
    }
  }

  // ── Lưu chỉnh sửa inline ──
  const handleSaveEdit = async (emp) => {
    try {
      await api.put(`/employees/${emp.employee_id}`, editData)
      showToast('Đã cập nhật thông tin')
      setEditId(null)
      load()
    } catch (err) {
      showToast(err.response?.data?.error || 'Lỗi cập nhật', 'error')
    }
  }

  // ── Khóa tài khoản ──
  const handleDeactivate = async (emp) => {
    if (!window.confirm(`Khóa tài khoản "${emp.username}"?`)) return
    try {
      await api.delete(`/employees/${emp.employee_id}`)
      showToast(`Đã khóa tài khoản ${emp.username}`)
      load()
    } catch (err) {
      showToast(err.response?.data?.error || 'Lỗi khóa tài khoản', 'error')
    }
  }

  // ── Kích hoạt lại ──
  const handleActivate = async (emp) => {
    try {
      await api.put(`/employees/${emp.employee_id}`, { status: 'Active' })
      showToast(`Đã kích hoạt lại ${emp.username}`)
      load()
    } catch (err) {
      showToast(err.response?.data?.error || 'Lỗi kích hoạt', 'error')
    }
  }

  // ── Reset mật khẩu ──
  const handleResetPwd = async (emp) => {
    if (!window.confirm(`Reset mật khẩu cho "${emp.username}"? Mật khẩu mới sẽ hiện ngay.`)) return
    try {
      const r = await api.put(`/employees/${emp.employee_id}/reset-password`)
      setTempPwd(r.data)
    } catch (err) {
      showToast(err.response?.data?.error || 'Lỗi reset mật khẩu', 'error')
    }
  }

  const ROLE_BADGE = {
    Manager:  'bg-purple-100 text-purple-700',
    Cashier:  'bg-blue-100 text-blue-700',
    Barista:  'bg-amber-100 text-amber-700',
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-800">
          Quản Lý Nhân Viên
          <span className="ml-2 text-sm font-normal text-gray-400">({filtered.length})</span>
        </h2>
        <button onClick={() => { setShowForm(!showForm); setFormErrors({}) }} className="btn-primary text-sm">
          {showForm
            ? <span className="inline-flex items-center gap-1"><X className="h-4 w-4" strokeWidth={2} /> Đóng</span>
            : <span className="inline-flex items-center gap-1"><UserPlus className="h-4 w-4" strokeWidth={2} /> Thêm nhân viên</span>
          }
        </button>
      </div>

      {/* ── Form tạo mới ── */}
      {showForm && (
        <div className="card mb-4 border-2 border-amber-200">
          <h3 className="font-bold text-gray-800 mb-3">Tạo tài khoản mới</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Họ tên *</label>
              <input className={`input-field ${formErrors.name ? 'border-red-400' : ''}`}
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              {formErrors.name && <p className="text-xs text-red-500 mt-0.5">{formErrors.name}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Username *</label>
              <input className={`input-field ${formErrors.username ? 'border-red-400' : ''}`}
                value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
              {formErrors.username && <p className="text-xs text-red-500 mt-0.5">{formErrors.username}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Mật khẩu * (≥8 ký tự)</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  className={`input-field pr-9 ${formErrors.password ? 'border-red-400' : ''}`}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formErrors.password && <p className="text-xs text-red-500 mt-0.5">{formErrors.password}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Role *</label>
              <select className="input-field" value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option>Cashier</option>
                <option>Barista</option>
                <option>Manager</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Số điện thoại</label>
              <input className="input-field" placeholder="Tùy chọn"
                value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Hủy</button>
            <button onClick={handleCreate} className="btn-primary flex-1">Tạo tài khoản</button>
          </div>
        </div>
      )}

      {/* ── Popup mật khẩu tạm ── */}
      {tempPwd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="h-5 w-5 text-amber-600" strokeWidth={2} />
              <h3 className="font-bold text-gray-800">Mật khẩu tạm thời</h3>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Thông báo mật khẩu này cho nhân viên <span className="font-bold text-gray-700">{tempPwd.username}</span>:
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-center">
              <span className="font-mono font-bold text-lg text-amber-800 tracking-wider">{tempPwd.temp_password}</span>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">Nhân viên nên đổi mật khẩu sau khi đăng nhập</p>
            <button onClick={() => setTempPwd(null)} className="btn-primary w-full mt-4">Đã thông báo xong</button>
          </div>
        </div>
      )}

      {/* ── Bộ lọc ── */}
      <div className="flex flex-wrap gap-2 mb-4">
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm theo tên, username..." />
        <select className="input-field w-auto" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="all">Tất cả role</option>
          <option value="Manager">Manager</option>
          <option value="Cashier">Cashier</option>
          <option value="Barista">Barista</option>
        </select>
        <select className="input-field w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="Active">Đang hoạt động</option>
          <option value="Inactive">Đã khóa</option>
          <option value="all">Tất cả</option>
        </select>
      </div>

      {/* ── Danh sách ── */}
      {filtered.length === 0 ? (
        <div className="card text-center text-gray-400 py-10">
          <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" strokeWidth={1.5} />
          <p className="text-sm">Không có nhân viên nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(emp => (
            <div key={emp.employee_id} className={`card flex flex-col gap-2 md:flex-row md:items-center md:gap-4 ${emp.status === 'Inactive' ? 'opacity-60' : ''}`}>

              {/* ── Avatar + tên ── */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0 font-bold text-amber-700 text-sm">
                  {emp.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  {editId === emp.employee_id ? (
                    <input className="input-field text-sm py-0.5"
                      value={editData.name ?? emp.name}
                      onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} />
                  ) : (
                    <p className="font-semibold text-gray-800 text-sm truncate">{emp.name}</p>
                  )}
                  <p className="text-xs text-gray-400 truncate">@{emp.username}</p>
                </div>
              </div>

              {/* ── Role ── */}
              <div className="shrink-0">
                {editId === emp.employee_id ? (
                  <select className="input-field text-sm py-0.5 w-28"
                    value={editData.role ?? emp.role}
                    onChange={e => setEditData(d => ({ ...d, role: e.target.value }))}>
                    <option>Cashier</option>
                    <option>Barista</option>
                    <option>Manager</option>
                  </select>
                ) : (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_BADGE[emp.role] || 'bg-gray-100 text-gray-600'}`}>
                    {emp.role}
                  </span>
                )}
              </div>

              {/* ── Phone ── */}
              <div className="text-xs text-gray-400 shrink-0 w-28">
                {editId === emp.employee_id ? (
                  <input className="input-field text-sm py-0.5"
                    placeholder="SĐT"
                    value={editData.phone ?? (emp.phone || '')}
                    onChange={e => setEditData(d => ({ ...d, phone: e.target.value }))} />
                ) : (
                  emp.phone || <span className="italic">—</span>
                )}
              </div>

              {/* ── Status badge ── */}
              <div className="shrink-0">
                {emp.status === 'Active'
                  ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><ShieldCheck className="h-3 w-3" />Active</span>
                  : <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full"><UserX className="h-3 w-3" />Inactive</span>
                }
              </div>

              {/* ── Actions ── */}
              <div className="flex gap-1.5 shrink-0">
                {editId === emp.employee_id ? (
                  <>
                    <button onClick={() => setEditId(null)} title="Hủy"
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" strokeWidth={2} /></button>
                    <button onClick={() => handleSaveEdit(emp)} title="Lưu"
                      className="p-1.5 rounded-lg text-green-600 hover:bg-green-50"><Save className="h-4 w-4" strokeWidth={2} /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditId(emp.employee_id); setEditData({}) }} title="Chỉnh sửa"
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-600">
                      <Pencil className="h-4 w-4" strokeWidth={2} />
                    </button>
                    <button onClick={() => handleResetPwd(emp)} title="Reset mật khẩu"
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                      <KeyRound className="h-4 w-4" strokeWidth={2} />
                    </button>
                    {emp.status === 'Active'
                      ? <button onClick={() => handleDeactivate(emp)} title="Khóa tài khoản"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600">
                          <UserX className="h-4 w-4" strokeWidth={2} />
                        </button>
                      : <button onClick={() => handleActivate(emp)} title="Kích hoạt lại"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-green-50 hover:text-green-600">
                          <Play className="h-4 w-4" strokeWidth={2} />
                        </button>
                    }
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


// ══════════════════════════════════════════════════════════
//  ManagerPage — sidebar dọc + content area
// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
//  CustomersTab — Quản lý hội viên
// ══════════════════════════════════════════════════════════

const MEMBER_LEVEL = {
  Gold:   { bg: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-800', icon: '🥇' },
  Silver: { bg: 'bg-gray-50  border-gray-200',    badge: 'bg-gray-100  text-gray-700',    icon: '🥈' },
  Normal: { bg: 'bg-blue-50  border-blue-100',    badge: 'bg-blue-100  text-blue-700',    icon: '⭐' },
}

function CustomerDetailModal({ customer, onClose, onUpdated }) {
  const [editMode, setEditMode] = useState(false)
  const [form, setForm]         = useState({ name: customer.name, email: customer.email || '' })
  const [saving, setSaving]     = useState(false)
  const { toast: showToast }    = useToast()

  const save = async () => {
    setSaving(true)
    try {
      await api.put(`/customers/${customer.customer_id}`, form)
      showToast('Đã cập nhật thông tin hội viên')
      onUpdated()
      onClose()
    } catch (e) {
      showToast(e.response?.data?.error || 'Lỗi cập nhật', 'error')
    } finally {
      setSaving(false)
    }
  }

  const deactivate = async () => {
    if (!window.confirm(`Vô hiệu hóa hội viên "${customer.name}"?`)) return
    try {
      await api.delete(`/customers/${customer.customer_id}`)
      showToast(`Đã vô hiệu hóa ${customer.name}`)
      onUpdated()
      onClose()
    } catch (e) {
      showToast(e.response?.data?.error || 'Lỗi', 'error')
    }
  }

  const lvl = MEMBER_LEVEL[customer.member_level] || MEMBER_LEVEL.Normal

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`p-5 rounded-t-2xl border-b ${lvl.bg}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-2xl shadow-sm">
                {lvl.icon}
              </div>
              <div>
                <p className="font-bold text-gray-800 text-lg">{customer.name}</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${lvl.badge}`}>
                  {customer.member_level}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>

          {/* điểm + ngưỡng lên hạng */}
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="bg-white/70 rounded-xl py-2">
              <p className="text-lg font-bold text-purple-700">{customer.points.toLocaleString('vi-VN')}</p>
              <p className="text-xs text-gray-500">Điểm hiện có</p>
            </div>
            <div className="bg-white/70 rounded-xl py-2">
              <p className="text-lg font-bold text-gray-700">
                {customer.member_level === 'Gold' ? '∞'
                  : customer.member_level === 'Silver' ? `${Math.max(0, 200 - customer.points)}`
                  : `${Math.max(0, 50 - customer.points)}`}
              </p>
              <p className="text-xs text-gray-500">
                {customer.member_level === 'Gold' ? 'Đã đạt cao nhất'
                  : customer.member_level === 'Silver' ? 'Điểm lên Gold'
                  : 'Điểm lên Silver'}
              </p>
            </div>
            <div className="bg-white/70 rounded-xl py-2">
              <p className="text-lg font-bold text-gray-700">{customer.bills?.length || 0}</p>
              <p className="text-xs text-gray-500">Lần mua</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Thông tin */}
          <div>
            <h4 className="section-title mb-2">Thông tin liên lạc</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-400 shrink-0" strokeWidth={2} />
                <span className="text-gray-700 font-medium">{customer.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400 shrink-0" strokeWidth={2} />
                {editMode ? (
                  <input
                    className="input-field flex-1 py-1"
                    placeholder="Email (tuỳ chọn)"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                ) : (
                  <span className="text-gray-600">{customer.email || <em className="text-gray-400">Chưa có</em>}</span>
                )}
              </div>
              {editMode && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-gray-400 shrink-0" strokeWidth={2} />
                  <input
                    className="input-field flex-1 py-1"
                    placeholder="Họ và tên"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {editMode ? (
              <div className="flex gap-2 mt-3">
                <button onClick={() => setEditMode(false)} className="btn-secondary flex-1 text-sm">Hủy</button>
                <button onClick={save} disabled={saving} className="btn-primary flex-1 text-sm disabled:opacity-50">
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            ) : (
              <button onClick={() => setEditMode(true)} className="btn-ghost text-xs mt-2 inline-flex items-center gap-1">
                <Pencil className="h-3.5 w-3.5" strokeWidth={2} />Chỉnh sửa
              </button>
            )}
          </div>

          {/* Lịch sử mua hàng */}
          {Array.isArray(customer.bills) && customer.bills.length > 0 && (
            <div>
              <h4 className="section-title mb-2">10 lần mua gần nhất</h4>
              <div className="space-y-1.5">
                {customer.bills.map(b => (
                  <div key={b.bill_id} className="flex justify-between items-center text-sm py-1.5 border-b border-gray-50 last:border-0">
                    <div>
                      <span className="font-medium text-gray-700">Bill #{b.bill_id}</span>
                      <span className="text-xs text-gray-400 ml-2">
                        {b.payment_date ? new Date(b.payment_date).toLocaleDateString('vi-VN') : '—'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-amber-700">{fmt(b.amount)}</span>
                      <span className="text-xs text-purple-600 ml-2">
                        +{Math.floor(b.amount / 10_000)}đ
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vô hiệu hóa */}
          {customer.status === 'Active' && (
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={deactivate}
                className="w-full text-sm text-red-500 hover:text-red-700 hover:bg-red-50 py-2 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <UserX className="h-4 w-4" strokeWidth={2} />
                Vô hiệu hóa hội viên
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CustomersTab() {
  const [stats,      setStats]      = useState(null)
  const [customers,  setCustomers]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [filterLvl,  setFilterLvl]  = useState('all')   // all | Gold | Silver | Normal
  const [filterSt,   setFilterSt]   = useState('Active')
  const [selected,   setSelected]   = useState(null)    // customer đang xem chi tiết
  const [detailData, setDetailData] = useState(null)    // customer với bills
  const [detailLoading, setDetailLoading] = useState(false)
  const [campaignLevel, setCampaignLevel] = useState('Gold')
  const [campaignNote, setCampaignNote] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [sendingCampaign, setSendingCampaign] = useState(false)
  const [campaignSmtpTopErrors, setCampaignSmtpTopErrors] = useState([])
  const { toast: showToast } = useToast()

  const campaignPresets = useMemo(() => ({
    Gold: 'Uu dai dac quyen cho hoi vien Gold. Moi ban ghe quan de nhan quyen loi moi!',
    Silver: 'Tang uu dai cho hoi vien Silver. Tich diem va nang hang de nhan them dac quyen.',
    Normal: 'Uu dai chao mung hoi vien moi. Don dau tien trong ky se duoc giam gia.',
  }), [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterLvl !== 'all') params.level  = filterLvl
      if (filterSt  !== 'all') params.status = filterSt
      if (search.trim())       params.search  = search.trim()

      const [listRes, statsRes] = await Promise.all([
        api.get('/customers', { params }),
        api.get('/customers/stats'),
      ])
      setCustomers(listRes.data)
      setStats(statsRes.data)
    } catch {
      showToast('Không tải được danh sách hội viên', 'error')
    } finally {
      setLoading(false)
    }
  }, [filterLvl, filterSt, search, showToast])

  useEffect(() => { load() }, [load])

  const openDetail = async (c) => {
    setSelected(c)
    setDetailLoading(true)
    try {
      const r = await api.get(`/customers/${c.customer_id}`)
      setDetailData(r.data)
    } catch {
      setDetailData(c) // fallback
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => { setSelected(null); setDetailData(null) }

  const sendTierCampaign = async () => {
    setSendingCampaign(true)
    setCampaignSmtpTopErrors([])
    try {
      const res = await api.post('/customers/campaigns/send-voucher', {
        member_level: campaignLevel,
        note: campaignNote.trim(),
        send_email: sendEmail,
        error_limit: 5,
      })
      const data = res.data || {}
      setCampaignSmtpTopErrors(data.smtp_error_top || [])
      showToast(
        `Da gui uu dai ${campaignLevel}: ${data.inapp_sent || 0} thong bao, ${data.email_sent || 0} email, loi SMTP: ${data.email_failed || 0}.`,
      )
      load()
    } catch (e) {
      showToast(e.response?.data?.error || 'Khong gui duoc uu dai', 'error')
    } finally {
      setSendingCampaign(false)
    }
  }

  return (
    <div>
      {/* ── Stats KPI ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="card">
            <p className="section-title">Tổng hội viên</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.total.toLocaleString('vi-VN')}</p>
            <p className="text-xs text-gray-400 mt-1">đang hoạt động</p>
          </div>
          <div className="card border-yellow-200">
            <p className="section-title" style={{ color: '#B45309' }}>Hạng Gold 🥇</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.gold}</p>
            <p className="text-xs text-gray-400 mt-1">≥ 200 điểm</p>
          </div>
          <div className="card border-gray-300">
            <p className="section-title">Hạng Silver 🥈</p>
            <p className="text-2xl font-bold text-gray-600 mt-1">{stats.silver}</p>
            <p className="text-xs text-gray-400 mt-1">≥ 50 điểm</p>
          </div>
          <div className="card border-blue-200">
            <p className="section-title" style={{ color: '#1D4ED8' }}>Hạng Normal ⭐</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.normal}</p>
            <p className="text-xs text-gray-400 mt-1">{'< 50 điểm'}</p>
          </div>
        </div>
      )}

      {/* ── Top members ── */}
      {stats?.top_members?.length > 0 && (
        <div className="card mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-4 w-4 text-amber-600" strokeWidth={2} />
            <h3 className="font-bold text-gray-700 text-sm">Top 5 hội viên nhiều điểm nhất</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.top_members.map((m, i) => {
              const lvl = MEMBER_LEVEL[m.member_level] || MEMBER_LEVEL.Normal
              return (
                <button
                  key={m.customer_id}
                  onClick={() => openDetail(m)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm hover:shadow-sm transition-all ${lvl.bg}`}
                >
                  <span className="font-bold text-gray-400 text-xs w-4">#{i + 1}</span>
                  <span>{lvl.icon}</span>
                  <span className="font-semibold text-gray-700">{m.name}</span>
                  <span className="text-purple-600 font-bold text-xs">{m.points.toLocaleString('vi-VN')}đ</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Header + bộ lọc ── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-800">
          Danh sách hội viên
          <span className="ml-2 text-sm font-normal text-gray-400">({customers.length})</span>
        </h2>
        <button onClick={load} className="btn-ghost text-xs inline-flex items-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />Làm mới
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Tìm theo tên, SĐT..."
        />
        <select className="input-field w-auto" value={filterLvl} onChange={e => setFilterLvl(e.target.value)}>
          <option value="all">Tất cả hạng</option>
          <option value="Gold">🥇 Gold</option>
          <option value="Silver">🥈 Silver</option>
          <option value="Normal">⭐ Normal</option>
        </select>
        <select className="input-field w-auto" value={filterSt} onChange={e => setFilterSt(e.target.value)}>
          <option value="Active">Đang hoạt động</option>
          <option value="Inactive">Đã vô hiệu</option>
          <option value="all">Tất cả</option>
        </select>
      </div>

      <div className="card mb-4 border-purple-200 bg-purple-50/50">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="h-4 w-4 text-purple-600" strokeWidth={2} />
          <h3 className="font-bold text-gray-800 text-sm">Gui uu dai theo hang hoi vien</h3>
        </div>
        <div className="grid md:grid-cols-4 gap-2">
          <select
            className="input-field"
            value={campaignLevel}
            onChange={(e) => {
              const next = e.target.value
              setCampaignLevel(next)
              setCampaignNote(campaignPresets[next] || '')
            }}
          >
            <option value="Gold">🥇 Gold</option>
            <option value="Silver">🥈 Silver</option>
            <option value="Normal">⭐ Normal</option>
          </select>
          <input
            className="input-field md:col-span-2"
            value={campaignNote}
            onChange={(e) => setCampaignNote(e.target.value)}
            placeholder="Noi dung bo sung cho thong bao/email..."
          />
          <button
            type="button"
            onClick={sendTierCampaign}
            disabled={sendingCampaign}
            className="btn-primary inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {sendingCampaign ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Send className="h-4 w-4" strokeWidth={2} />}
            Gui ngay
          </button>
        </div>
        <label className="mt-2 inline-flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
          />
          Dong thoi gui email cho hoi vien co dia chi email
        </label>
        {campaignSmtpTopErrors.length > 0 && (
          <div className="mt-3 border border-red-200 bg-red-50 rounded-xl p-3">
            <p className="text-sm font-semibold text-red-700 mb-2">Top lỗi SMTP</p>
            <div className="space-y-2">
              {campaignSmtpTopErrors.map((e, idx) => (
                <div key={`${e.error}-${idx}`} className="text-xs text-red-700">
                  <p className="font-semibold">#{idx + 1} · {e.count} lần</p>
                  <p>{e.error}</p>
                  {e.sample_recipients?.length > 0 && (
                    <p className="text-red-600">Ví dụ: {e.sample_recipients.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Danh sách ── */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="card animate-pulse flex gap-3 items-center">
              <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-32" />
                <div className="h-3 bg-gray-100 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="card text-center py-10 text-gray-400">
          <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" strokeWidth={1.5} />
          <p className="text-sm">Không tìm thấy hội viên nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map(c => {
            const lvl = MEMBER_LEVEL[c.member_level] || MEMBER_LEVEL.Normal
            return (
              <button
                key={c.customer_id}
                onClick={() => openDetail(c)}
                className={`card-hover w-full text-left flex items-center gap-3 ${c.status === 'Inactive' ? 'opacity-50' : ''}`}
              >
                {/* avatar */}
                <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 text-lg ${lvl.bg}`}>
                  {lvl.icon}
                </div>

                {/* info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800 text-sm">{c.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${lvl.badge}`}>
                      {c.member_level}
                    </span>
                    {c.status === 'Inactive' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">Vô hiệu</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{c.phone}{c.email ? ` · ${c.email}` : ''}</p>
                </div>

                {/* điểm */}
                <div className="text-right shrink-0">
                  <p className="font-bold text-purple-700 text-sm inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5" strokeWidth={2} />
                    {c.points.toLocaleString('vi-VN')}
                  </p>
                  <p className="text-xs text-gray-400">điểm</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Detail Modal ── */}
      {selected && (
        detailLoading ? (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 flex items-center gap-3 shadow-xl">
              <Loader2 className="h-6 w-6 text-amber-600 animate-spin" strokeWidth={2} />
              <span className="text-gray-700 font-medium">Đang tải...</span>
            </div>
          </div>
        ) : detailData ? (
          <CustomerDetailModal
            customer={detailData}
            onClose={closeDetail}
            onUpdated={load}
          />
        ) : null
      )}
    </div>
  )
}


const TABS = [
  { key: 'dashboard', Icon: Home,            label: 'Dashboard'    },
  { key: 'menu',      Icon: UtensilsCrossed, label: 'Menu'         },
  { key: 'inventory', Icon: Package,         label: 'Kho'          },
  { key: 'history',   Icon: History,         label: 'Lịch Sử'     },
  { key: 'reports',   Icon: BarChart3,       label: 'Báo Cáo'     },
  { key: 'customers', Icon: Star,            label: 'Hội Viên'    },
  { key: 'employees', Icon: Users,           label: 'Nhân Viên'   },
  { key: 'ai',        Icon: Bot,             label: 'AI Assistant' },
]

const LEVEL_STYLE = {
  critical: { bg: 'bg-red-50 border-red-200',    dot: 'bg-red-500',    text: 'text-red-700'    },
  warning:  { bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500', text: 'text-amber-700'  },
  info:     { bg: 'bg-blue-50 border-blue-200',   dot: 'bg-blue-400',  text: 'text-blue-700'   },
}

export default function ManagerPage() {
  const [activeTab,   setActiveTab]   = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [alerts,      setAlerts]      = useState([])
  const [showAlerts,  setShowAlerts]  = useState(false)
  const unreadCount = alerts.filter(a => !a.read).length

  // Poll alerts từ Alert Agent mỗi 60 giây
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await api.get('/ai/alerts')
      setAlerts(res.data?.alerts || [])
    } catch { /* silent fail */ }
  }, [])

  useEffect(() => {
    fetchAlerts()
    const id = setInterval(fetchAlerts, 60_000)
    return () => clearInterval(id)
  }, [fetchAlerts])

  const markAllRead = async () => {
    try {
      await api.put('/ai/alerts/read', {})
      setAlerts(prev => prev.map(a => ({ ...a, read: true })))
    } catch { /* silent */ }
  }

  const markOneRead = async (alertId) => {
    try {
      await api.put('/ai/alerts/read', { id: alertId })
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, read: true } : a))
    } catch { /* silent */ }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar title="Quản Lý" />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <aside
          className={`${sidebarOpen ? 'w-44' : 'w-12'} transition-all duration-200 bg-white border-r border-gray-100 shadow-sm flex flex-col shrink-0`}
          style={{ minHeight: 'calc(100vh - 3.5rem)' }}
        >
          {/* Toggle */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="flex items-center justify-center h-9 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors border-b border-gray-100 text-xs"
            title={sidebarOpen ? 'Thu gọn' : 'Mở rộng'}
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" strokeWidth={2} /> : <ChevronRight className="h-4 w-4" strokeWidth={2} />}
          </button>

          {/* Nav items */}
          <nav className="flex-1 py-1">
            {TABS.map(tab => {
              const TabIcon = tab.Icon
              const isAi    = tab.key === 'ai'
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  title={tab.label}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                    activeTab === tab.key
                      ? 'bg-amber-50 text-amber-800 border-r-2 border-amber-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                >
                  <span className="relative shrink-0">
                    <TabIcon className="h-[1.1rem] w-[1.1rem] text-current" strokeWidth={2} />
                    {isAi && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </span>
                  {sidebarOpen && (
                    <span className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                      {tab.label}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Alert bell in sidebar footer */}
          {sidebarOpen && (
            <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-300">Coffee Shop v1.0</p>
              <button
                onClick={() => { setShowAlerts(v => !v); if (!showAlerts) fetchAlerts() }}
                className="relative text-gray-400 hover:text-gray-600 transition-colors"
                title="Cảnh báo hệ thống"
              >
                <Bell className="h-4 w-4" strokeWidth={2} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                )}
              </button>
            </div>
          )}
        </aside>

        {/* ── Content ── */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-5xl mx-auto">
            {/* ── Alert Panel (collapsible) ── */}
            {showAlerts && (
              <div className="mb-4 card border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                    <Bell className="h-4 w-4 text-amber-600" strokeWidth={2} />
                    Cảnh báo hệ thống
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                        {unreadCount} mới
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-gray-500 hover:text-gray-700 underline">
                        Đọc tất cả
                      </button>
                    )}
                    <button onClick={() => setShowAlerts(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                </div>

                {alerts.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Không có cảnh báo nào — hệ thống hoạt động bình thường ✓</p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                    {alerts.slice(0, 20).map(a => {
                      const s = LEVEL_STYLE[a.level] || LEVEL_STYLE.info
                      return (
                        <div
                          key={a.id}
                          onClick={() => markOneRead(a.id)}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-opacity ${s.bg} ${a.read ? 'opacity-50' : ''}`}
                        >
                          <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${s.dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs font-semibold ${s.text}`}>{a.category}</span>
                              <span className="text-xs font-medium text-gray-700">{a.title}</span>
                              {!a.read && (
                                <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">MỚI</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{a.detail}</p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {new Date(a.timestamp).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'menu'      && <MenuTab />}
            {activeTab === 'inventory' && <InventoryTab />}
            {activeTab === 'history'   && <OrderHistoryTab />}
            {activeTab === 'reports'   && <ReportsTab />}
            {activeTab === 'customers' && <CustomersTab />}
            {activeTab === 'employees' && <EmployeesTab />}
            {activeTab === 'ai'        && <AiTab alerts={alerts} onRefreshAlerts={fetchAlerts} />}
          </div>
        </main>
      </div>
    </div>
  )
}
