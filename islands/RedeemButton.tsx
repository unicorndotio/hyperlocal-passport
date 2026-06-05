import { useSignal } from '@preact/signals'
import { Button } from '@/components/ui/button.tsx'

export default function RedeemButton({ couponId }: { couponId: string }) {
  const loading = useSignal(false)
  const error = useSignal<string | null>(null)

  const handleRedeem = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`/api/coupons/${couponId}/redeem`, {
        method: 'POST',
      })

      if (res.ok) {
        // Redirect to Passaporte on success
        window.location.href = '/passaporte'
      } else {
        const text = await res.text()
        error.value = text || 'Erro ao resgatar cupom.'
      }
    } catch (err) {
      error.value = 'Erro de conexão.'
    } finally {
      loading.value = false
    }
  }

  return (
    <div class='space-y-2'>
      <Button
        onClick={handleRedeem}
        disabled={loading.value}
        className='w-full font-bold py-6 text-base rounded-xl'
      >
        {loading.value ? 'Processando...' : 'Resgatar Agora'}
      </Button>
      {error.value && (
        <p class='text-destructive text-[10px] text-center font-bold bg-destructive/10 py-2 rounded-lg border border-destructive/20 uppercase tracking-tight'>
          {error.value}
        </p>
      )}
    </div>
  )
}
