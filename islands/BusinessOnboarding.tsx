import { useEffect, useState } from 'preact/hooks'
import type { Business } from '@/lib/business.ts'

interface Step {
  targetSelector: string | null
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

const STEPS: Step[] = [
  {
    targetSelector: null,
    title: 'Bem-vindo ao Novo Painel!',
    description: 'Redesignamos o painel do lojista para você gerenciar cupons, validar descontos e acompanhar métricas — tudo em um só lugar. Vamos te mostrar as novidades.',
    position: 'center',
  },
  {
    targetSelector: 'a[href="/business/coupons"]',
    title: 'Meus Cupons',
    description: 'Crie e gerencie seus cupons com templates prontos. Escolha entre desconto percentual, valor fixo, Compre X Leve Y ou desconto por item.',
    position: 'bottom',
  },
  {
    targetSelector: 'a[href="/business/checkout"]',
    title: 'Validar Cupom',
    description: 'Valide cupons dos clientes no checkout. Digite o código ou use o leitor de QR code para aplicar o desconto na hora.',
    position: 'bottom',
  },
  {
    targetSelector: 'a[href="/business/analytics"]',
    title: 'Analytics',
    description: 'Acompanhe o desempenho dos seus cupons: visualizações, resgates, validações e histórico completo de transações.',
    position: 'bottom',
  },
  {
    targetSelector: 'a[href="/business/profile"]',
    title: 'Meu Perfil',
    description: 'Mantenha os dados da sua empresa atualizados: horários, redes sociais, logo e informações de contato.',
    position: 'bottom',
  },
  {
    targetSelector: null,
    title: 'Tudo Pronto!',
    description: 'Você já conhece as principais funcionalidades. Comece criando seu primeiro cupom ou validando um desconto. Boas vendas!',
    position: 'center',
  },
]

interface TargetRect {
  top: number
  left: number
  width: number
  height: number
}

interface Props {
  business: Business
  businessId: string
}

export default function BusinessOnboarding({ business, businessId }: Props) {
  const [isActive, setIsActive] = useState(!business.hasSeenMerchantOnboarding)
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
  const [tooltipStyle, setTooltipStyle] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isActive) return

    const step = STEPS[currentStep]
    if (!step.targetSelector) {
      setTargetRect(null)
      setTooltipStyle({})
      return
    }

    const el = document.querySelector(step.targetSelector) as HTMLElement | null
    if (!el) {
      setTargetRect(null)
      setTooltipStyle({})
      return
    }

    const rect = el.getBoundingClientRect()
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    })

    const padding = 8
    const gap = 12
    const tooltipW = 300
    let top = 0
    let left = 0

    switch (step.position) {
      case 'top':
        top = rect.top - gap
        left = rect.left + rect.width / 2 - tooltipW / 2
        break
      case 'bottom':
        top = rect.bottom + gap
        left = rect.left + rect.width / 2 - tooltipW / 2
        break
      case 'left':
        top = rect.top + rect.height / 2
        left = rect.left - gap - tooltipW
        break
      case 'right':
        top = rect.top + rect.height / 2
        left = rect.right + gap
        break
    }

    const viewportW = window.innerWidth
    const viewportH = window.innerHeight
    left = Math.max(padding, Math.min(left, viewportW - tooltipW - padding))
    top = Math.max(padding, Math.min(top, viewportH - 200 - padding))

    setTooltipStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: '1001',
    })
  }, [currentStep, isActive])

  function handleNext() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  function handlePrev() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  async function handleDismiss() {
    await markOnboardingComplete()
    setIsActive(false)
  }

  async function handleFinish() {
    await markOnboardingComplete()
    setIsActive(false)
  }

  async function markOnboardingComplete() {
    try {
      await fetch(`/api/businesses/${businessId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasSeenMerchantOnboarding: true }),
      })
    } catch {
      // silently fail — walkthrough already shown
    }
  }

  if (!isActive) return null

  const step = STEPS[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === STEPS.length - 1
  const totalSteps = STEPS.length

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: '0',
          zIndex: '999',
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}
        onClick={handleDismiss}
      />

      {/* Spotlight hole */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: `${targetRect.top - 8}px`,
            left: `${targetRect.left - 8}px`,
            width: `${targetRect.width + 16}px`,
            height: `${targetRect.height + 16}px`,
            zIndex: '1000',
            borderRadius: '8px',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        style={{
          ...tooltipStyle,
          width: '300px',
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }}
      >
        {/* Progress */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '16px',
        }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                flex: '1',
                height: '4px',
                borderRadius: '2px',
                backgroundColor: i <= currentStep ? '#2563eb' : '#e2e8f0',
                transition: 'background-color 0.3s',
              }}
            />
          ))}
        </div>

        <p style={{
          fontSize: '11px',
          fontWeight: '700',
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '8px',
        }}>
          Passo {currentStep + 1} de {totalSteps}
        </p>

        <h3 style={{
          fontSize: '18px',
          fontWeight: '700',
          color: '#0f172a',
          margin: '0 0 8px 0',
        }}>
          {step.title}
        </h3>

        <p style={{
          fontSize: '14px',
          color: '#475569',
          lineHeight: '1.5',
          margin: '0 0 20px 0',
        }}>
          {step.description}
        </p>

        {/* Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          {!isFirst
            ? (
              <button
                onClick={handlePrev}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#475569',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Anterior
              </button>
            )
            : <div />
          }

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleDismiss}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '600',
                color: '#94a3b8',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Pular
            </button>

            {isLast
              ? (
                <button
                  onClick={handleFinish}
                  style={{
                    padding: '8px 20px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'white',
                    backgroundColor: '#2563eb',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  Finalizar
                </button>
              )
              : (
                <button
                  onClick={handleNext}
                  style={{
                    padding: '8px 20px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'white',
                    backgroundColor: '#2563eb',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  Próximo
                </button>
              )}
          </div>
        </div>
      </div>
    </>
  )
}
