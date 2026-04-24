/**
 * Skeleton loading components — thay spinner bằng placeholder đúng shape.
 * Dùng shimmer animation từ index.css.
 *
 * Export:
 *   SkeletonTableGrid   – lưới card bàn (CashierPage)
 *   SkeletonMenuList    – danh sách món (MenuDisplay)
 *   SkeletonOrderCards  – hàng đợi barista (BaristaPage)
 *   SkeletonKPICards    – 4 KPI card (ManagerPage dashboard)
 *   SkeletonBillList    – danh sách bill (PaymentPanel)
 *   SkeletonTableRows   – bảng dữ liệu (InventoryTab, OrderHistoryTab)
 */

function Bone({ className = '', style = {} }) {
  return (
    <div
      className={`skeleton-bone ${className}`}
      style={style}
    />
  )
}

/* ── Table grid (Cashier) ── */
export function SkeletonTableGrid({ count = 8 }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-100 p-3 flex flex-col gap-2">
          <Bone className="h-3 w-8 rounded" />
          <Bone className="h-5 w-full rounded-lg" />
          <Bone className="h-2 w-12 rounded" />
        </div>
      ))}
    </div>
  )
}

/* ── Menu item list (MenuDisplay) ── */
export function SkeletonMenuList({ count = 6 }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-3 py-3 rounded-xl border border-gray-100">
          <div className="flex flex-col gap-1.5 flex-1">
            <Bone className="h-3 rounded" style={{ width: `${50 + (i % 3) * 20}%` }} />
            <Bone className="h-2 w-16 rounded" />
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Bone className="h-3 w-14 rounded" />
            <Bone className="h-6 w-6 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Order cards (Barista) ── */
export function SkeletonOrderCards({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
          <div className="bg-gray-100 px-4 py-3">
            <Bone className="h-5 w-16 rounded mb-1" />
            <Bone className="h-3 w-24 rounded" />
          </div>
          <div className="p-4 flex flex-col gap-3">
            {Array.from({ length: 2 + (i % 2) }).map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <Bone className="h-7 w-7 rounded-full shrink-0" />
                <Bone className="h-3 rounded flex-1" style={{ width: `${55 + j * 15}%` }} />
              </div>
            ))}
            <Bone className="h-9 w-full rounded-xl mt-2" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── KPI cards (Manager dashboard) ── */
export function SkeletonKPICards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card flex flex-col gap-2">
          <Bone className="h-2.5 w-24 rounded" />
          <Bone className="h-7 w-20 rounded" />
          <Bone className="h-2 w-16 rounded" />
        </div>
      ))}
    </div>
  )
}

/* ── Bill list (PaymentPanel) ── */
export function SkeletonBillList({ count = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <Bone className="h-4 w-16 rounded" />
            <Bone className="h-2.5 w-28 rounded" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Bone className="h-5 w-20 rounded" />
            <Bone className="h-2.5 w-16 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Table rows (Inventory / OrderHistory) ── */
export function SkeletonTableRows({ rows = 5, cols = 4 }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-b border-gray-50">
              {Array.from({ length: cols }).map((_, j) => (
                <td key={j} className="px-4 py-3">
                  <Bone className="h-3 rounded" style={{ width: `${40 + ((i + j) % 4) * 15}%` }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
