import { useEffect, useState } from 'preact/hooks'
import { Button } from '../components/ui/button.tsx'
import { Badge } from '../components/ui/badge.tsx'

interface CouponData {
  id: string
  businessId: string
  businessName: string
  title: string
  description?: string
  behavior: {
    type: string
    [key: string]: unknown
  }
  isActive: boolean
  createdAt: string
}

interface CouponsResponse {
  coupons: CouponData[]
  total: number
}

const BEHAVIOR_LABELS: Record<string, string> = {
  percentage_discount: 'Percentage Discount',
  fixed_amount: 'Fixed Amount',
  bogo: 'BOGO',
  item_specific: 'Item Specific',
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<CouponData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filterBusinessId, setFilterBusinessId] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const [editingCoupon, setEditingCoupon] = useState<CouponData | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  useEffect(() => {
    fetchCoupons()
  }, [])

  async function fetchCoupons() {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (filterBusinessId) params.set('businessId', filterBusinessId)
      if (filterStatus !== 'all') params.set('status', filterStatus)

      const query = params.toString()
      const url = `/api/admin/coupons${query ? `?${query}` : ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load coupons')
      const data: CouponsResponse = await res.json()
      setCoupons(data.coupons)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  function handleFilterChange() {
    fetchCoupons()
  }

  function openEdit(coupon: CouponData) {
    setEditingCoupon(coupon)
    setEditTitle(coupon.title)
    setEditIsActive(coupon.isActive)
  }

  function closeEdit() {
    setEditingCoupon(null)
    setEditTitle('')
    setEditIsActive(true)
  }

  async function handleSave() {
    if (!editingCoupon) return
    try {
      setSaving(true)
      const res = await fetch(
        `/api/admin/coupons/${editingCoupon.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: editTitle,
            isActive: editIsActive,
          }),
        },
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update coupon')
      }
      await fetchCoupons()
      closeEdit()
    } catch (err) {
      alert(
        err instanceof Error ? err.message : 'Error updating coupon',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(coupon: CouponData) {
    if (
      !confirm(
        `Are you sure you want to delete "${coupon.title}"? This action cannot be undone.`,
      )
    ) {
      return
    }

    try {
      setActionLoadingId(coupon.id)
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete coupon')
      }
      setCoupons((prev) => prev.filter((c) => c.id !== coupon.id))
    } catch (err) {
      alert(
        err instanceof Error ? err.message : 'Error deleting coupon',
      )
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <div className='space-y-4'>
      {/* Filters */}
      <div className='flex flex-wrap items-center gap-4 p-4 bg-white border rounded-lg'>
        <div className='flex items-center gap-2'>
          <label
            htmlFor='filter-business'
            className='text-sm font-medium text-slate-700'
          >
            Business ID:
          </label>
          <input
            id='filter-business'
            type='text'
            value={filterBusinessId}
            onInput={(e) =>
              setFilterBusinessId(
                (e.target as HTMLInputElement).value,
              )}
            placeholder='Filter by business ID'
            className='px-3 py-1.5 text-sm border rounded-md'
          />
        </div>

        <div className='flex items-center gap-2'>
          <label
            htmlFor='filter-status'
            className='text-sm font-medium text-slate-700'
          >
            Status:
          </label>
          <select
            id='filter-status'
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(
                (e.target as HTMLSelectElement).value,
              )}
            className='px-3 py-1.5 text-sm border rounded-md'
          >
            <option value='all'>All</option>
            <option value='active'>Active</option>
            <option value='inactive'>Inactive</option>
          </select>
        </div>

        <Button variant='default' size='sm' onClick={handleFilterChange}>
          Apply Filters
        </Button>
      </div>

      {/* Coupon Table */}
      {loading
        ? (
          <div className='p-8 text-center text-slate-500'>
            Loading coupons...
          </div>
        )
        : error
        ? (
          <div className='p-8 text-center text-red-500'>
            Error: {error}
          </div>
        )
        : coupons.length === 0
        ? (
          <div className='p-12 text-center border-2 border-dashed rounded-lg bg-slate-50'>
            <p className='text-slate-500'>No coupons found.</p>
          </div>
        )
        : (
          <div className='overflow-x-auto border rounded-lg'>
            <table className='w-full text-sm text-left'>
              <thead className='bg-slate-50 border-b'>
                <tr>
                  <th className='px-4 py-3 font-medium text-slate-700'>
                    Business
                  </th>
                  <th className='px-4 py-3 font-medium text-slate-700'>
                    Title
                  </th>
                  <th className='px-4 py-3 font-medium text-slate-700'>
                    Behavior Type
                  </th>
                  <th className='px-4 py-3 font-medium text-slate-700'>
                    Status
                  </th>
                  <th className='px-4 py-3 font-medium text-slate-700'>
                    Created
                  </th>
                  <th className='px-4 py-3 font-medium text-slate-700 text-right'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y'>
                {coupons.map((coupon) => (
                  <tr
                    key={coupon.id}
                    className='hover:bg-slate-50 transition-colors'
                  >
                    <td className='px-4 py-4 text-slate-900'>
                      {coupon.businessName}
                    </td>
                    <td className='px-4 py-4 font-medium text-slate-900'>
                      {coupon.title}
                    </td>
                    <td className='px-4 py-4'>
                      <Badge variant='outline'>
                        {BEHAVIOR_LABELS[coupon.behavior.type] ||
                          coupon.behavior.type}
                      </Badge>
                    </td>
                    <td className='px-4 py-4'>
                      <Badge
                        variant={
                          coupon.isActive ? 'default' : 'secondary'
                        }
                      >
                        {coupon.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className='px-4 py-4 text-slate-600'>
                      {formatDate(coupon.createdAt)}
                    </td>
                    <td className='px-4 py-4 text-right space-x-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => openEdit(coupon)}
                        disabled={!!actionLoadingId}
                      >
                        Edit
                      </Button>
                      <Button
                        variant='destructive'
                        size='sm'
                        onClick={() => handleDelete(coupon)}
                        disabled={actionLoadingId === coupon.id}
                      >
                        {actionLoadingId === coupon.id
                          ? '...'
                          : 'Delete'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* Edit Modal */}
      {editingCoupon && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
          <div className='bg-white rounded-xl max-w-lg w-full p-6 relative shadow-2xl'>
            <button
              type='button'
              onClick={closeEdit}
              className='absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl'
            >
              x
            </button>
            <h3 className='text-xl font-bold mb-6'>Edit Coupon</h3>

            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-1'>
                  Title
                </label>
                <input
                  type='text'
                  value={editTitle}
                  onInput={(e) =>
                    setEditTitle(
                      (e.target as HTMLInputElement).value,
                    )}
                  className='w-full px-3 py-2 border rounded-md text-sm'
                />
              </div>

              <div className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  id='edit-is-active'
                  checked={editIsActive}
                  onChange={(e) =>
                    setEditIsActive(
                      (e.target as HTMLInputElement).checked,
                    )}
                  className='rounded'
                />
                <label
                  htmlFor='edit-is-active'
                  className='text-sm font-medium text-slate-700'
                >
                  Active
                </label>
              </div>

              <div className='pt-2 text-xs text-slate-500'>
                <p>
                  <strong>Behavior:</strong>{' '}
                  {BEHAVIOR_LABELS[
                    editingCoupon.behavior.type
                  ] || editingCoupon.behavior.type}
                </p>
                <p>
                  <strong>Business:</strong>{' '}
                  {editingCoupon.businessName}
                </p>
              </div>

              <div className='flex justify-end gap-3 pt-4'>
                <Button variant='outline' onClick={closeEdit}>
                  Cancel
                </Button>
                <Button
                  variant='default'
                  onClick={handleSave}
                  disabled={saving || !editTitle.trim()}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
