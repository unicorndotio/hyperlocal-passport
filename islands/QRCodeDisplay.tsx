import { useSignal } from '@preact/signals'
import { useEffect } from 'preact/hooks'
import qrcode from 'qrcode-generator'

export default function QRCodeDisplay({ code }: { code: string }) {
  const dataUrl = useSignal<string | null>(null)

  useEffect(() => {
    try {
      const qr = qrcode(0, 'M')
      qr.addData(code)
      qr.make()

      const size = qr.getModuleCount()
      const margin = 2
      const cellSize = Math.floor(400 / (size + margin * 2))
      const canvasSize = size * cellSize + margin * 2 * cellSize

      const canvas = document.createElement('canvas')
      canvas.width = canvasSize
      canvas.height = canvasSize

      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvasSize, canvasSize)

      ctx.fillStyle = '#000000'
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (qr.isDark(r, c)) {
            ctx.fillRect(
              c * cellSize + margin * cellSize,
              r * cellSize + margin * cellSize,
              cellSize,
              cellSize,
            )
          }
        }
      }

      dataUrl.value = canvas.toDataURL()
    } catch (err) {
      console.error('Failed to generate QR Code', err)
    }
  }, [code])

  if (!dataUrl.value) {
    return (
      <div class='w-48 h-48 bg-muted animate-pulse rounded-2xl border border-border flex items-center justify-center'>
        <span class='text-[10px] font-black text-muted-foreground uppercase tracking-widest'>
          Gerando...
        </span>
      </div>
    )
  }

  return (
    <div class='bg-white p-3 rounded-[2rem] shadow-inner border border-border'>
      <img
        src={dataUrl.value}
        alt={`QR Code for ${code}`}
        class='w-48 h-48 rounded-2xl'
      />
    </div>
  )
}
