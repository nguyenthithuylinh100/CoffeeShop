import { useState, useMemo } from 'react'
import { Search, X, UtensilsCrossed } from 'lucide-react'

function fmt(n) {
  return new Intl.NumberFormat('vi-VN').format(n) + '₫'
}

/**
 * FIX: Added search bar + category filter tabs.
 * Cashier can now find items instantly without scrolling.
 */
export default function MenuDisplay({ menuItems, onAddItem }) {
  const [search, setSearch]   = useState('')
  const [activeCat, setActiveCat] = useState('Tất cả')

  const categories = useMemo(() => {
    const cats = [...new Set(menuItems.map(i => i.category || 'Khác'))]
    return ['Tất cả', ...cats]
  }, [menuItems])

  const filtered = useMemo(() => {
    return menuItems.filter(item => {
      const matchCat = activeCat === 'Tất cả' || (item.category || 'Khác') === activeCat
      const matchQ   = !search || item.name.toLowerCase().includes(search.toLowerCase())
      return matchCat && matchQ
    })
  }, [menuItems, activeCat, search])

  if (menuItems.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <div className="mb-2 flex justify-center">
          <UtensilsCrossed className="h-10 w-10 text-gray-300" strokeWidth={1.5} />
        </div>
        <p className="text-sm">Không có món nào khả dụng</p>
      </div>
    )
  }

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" strokeWidth={2} />
        <input
          type="text"
          className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-amber-400 bg-gray-50"
          placeholder="Tìm tên món..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-lg hover:bg-gray-100"
            aria-label="Xóa tìm kiếm"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCat(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeCat === cat
                ? 'bg-amber-700 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Item list */}
      {filtered.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm">
          Không tìm thấy món nào
          <button onClick={() => { setSearch(''); setActiveCat('Tất cả') }}
            className="block mx-auto mt-1 text-amber-600 hover:underline text-xs">
            Xoá bộ lọc
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-1.5">
          {filtered.map(item => (
            <button
              key={item.menu_item_id}
              onClick={() => onAddItem(item)}
              className="flex items-center justify-between px-3 py-2.5 bg-gray-50
                         hover:bg-amber-50 rounded-xl border border-transparent
                         hover:border-amber-200 transition-all text-left group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-amber-800 truncate">
                  {item.name}
                </p>
                <p className="text-xs text-gray-400">{item.category}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-sm font-bold text-amber-700">{fmt(item.price)}</span>
                <div className="w-6 h-6 rounded-full bg-amber-100 group-hover:bg-amber-600
                                flex items-center justify-center transition-colors">
                  <span className="text-amber-600 group-hover:text-white font-bold text-base leading-none">+</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
