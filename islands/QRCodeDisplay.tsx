import { useSignal } from '@preact/signals'
import { useEffect } from 'preact/hooks'
import QRCode from 'qrcode'

export default function QRCodeDisplay({ code }: { code: string }) {
  const dataUrl = useSignal<string | null>(null)

  useEffect(() => {
    QRCode.toDataURL(code, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
    .then(url => {
      dataUrl.value = url
    })
    .catch(err => {
      console.error('Failed to generate QR Code', err)
    })
  }, [code])

  if (!dataUrl.value) {
    return (
      <div class="w-48 h-48 bg-muted animate-pulse rounded-2xl border border-border flex items-center justify-center">
        <span class="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Gerando...</span>
      </div>
    )
  }

  return (
    <div class="bg-white p-3 rounded-[2rem] shadow-inner border border-border">
      <img 
        src={dataUrl.value} 
        alt={`QR Code for ${code}`}
        class="w-48 h-48 rounded-2xl"
      />
    </div>
  )
}
