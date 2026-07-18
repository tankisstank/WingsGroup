'use client'
import type { FormFieldBlock, Form as FormType } from '@payloadcms/plugin-form-builder/types'

import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import RichText from '@/components/RichText'
import { Button } from '@/components/ui/button'
import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'
import { BadgeCheckIcon, ClockIcon, HeadphonesIcon, SendIcon } from 'lucide-react'

import { fields } from './fields'
import { getClientSideURL } from '@/utilities/getURL'
import { useSitePublicLocale } from '@/providers/SitePath'
import { useSitePath } from '@/utilities/useSitePath'
import { getCopyLocale } from '@/utilities/locales'
import { TurnstileWidget } from './TurnstileWidget'

export type FormBlockType = {
  blockName?: string
  blockType?: 'formBlock'
  enableIntro: boolean
  form: FormType | null
  introContent?: DefaultTypedEditorState
  presentation?: 'centered-card' | 'minimal' | 'split-contact' | 'support-channels'
}

const formCopy = {
  en: {
    asideLabel: 'Consultation support information',
    asideTitle: 'Send a request, receive the right consultation',
    asideDescription:
      'The WingsGroup team will review the timing, budget, destination, and service context before recommending the right next step.',
    bullets: [
      'Business-hours response',
      'Advice based on real timing and budget',
      'Routed to the right sales or content manager',
    ],
    fieldLabels: {
      airport: 'Airport',
      brief: 'Needs / budget / timing',
      company: 'Company / traveler group',
      email: 'Email',
      'full-name': 'Full name',
      'group-size': 'Estimated group size',
      message: 'Message',
      phone: 'Phone number',
      'policy-code': 'Tour / contract / policy code if available',
      'service-date': 'Service date',
    } as Record<string, string>,
    loading: 'Sending your request, please wait...',
    submit: 'Send brief',
    successDescription:
      'The planning team will review the brief and respond with a suitable proposal direction.',
    successTitle: 'Brief received',
  },
  es: {
    asideLabel: 'Información de apoyo para la planificación',
    asideTitle: 'Envía tu solicitud y recibe una orientación adecuada',
    asideDescription:
      'El equipo revisará fechas, destinos, estilo de viaje y tamaño del grupo antes de recomendar el siguiente paso.',
    bullets: [
      'Respuesta en horario laboral',
      'Asesoría según fechas y necesidades reales',
      'Solicitud dirigida al equipo adecuado',
    ],
    fieldLabels: {
      airport: 'Aeropuerto',
      brief: 'Necesidades / presupuesto / fechas',
      company: 'Empresa / grupo de viajeros',
      email: 'Email',
      'full-name': 'Nombre completo',
      'group-size': 'Tamaño estimado del grupo',
      message: 'Mensaje',
      phone: 'Teléfono',
      'policy-code': 'Código de tour / contrato / póliza si aplica',
      'service-date': 'Fecha del servicio',
    } as Record<string, string>,
    loading: 'Enviando tu solicitud, por favor espera...',
    submit: 'Enviar solicitud',
    successDescription:
      'El equipo revisará el brief y responderá con una dirección de propuesta adecuada.',
    successTitle: 'Solicitud recibida',
  },
  it: {
    asideLabel: 'Informazioni di supporto alla pianificazione',
    asideTitle: 'Invia una richiesta e ricevi il consiglio giusto',
    asideDescription:
      'Il team valuterà periodo, destinazioni, stile di viaggio e dimensione del gruppo prima di suggerire il passo successivo.',
    bullets: [
      'Risposta in orario lavorativo',
      'Consulenza basata su tempi ed esigenze reali',
      'Richiesta indirizzata al team corretto',
    ],
    fieldLabels: {
      airport: 'Aeroporto',
      brief: 'Esigenze / budget / periodo',
      company: 'Azienda / gruppo di viaggiatori',
      email: 'Email',
      'full-name': 'Nome completo',
      'group-size': 'Dimensione stimata del gruppo',
      message: 'Messaggio',
      phone: 'Telefono',
      'policy-code': 'Codice tour / contratto / polizza se disponibile',
      'service-date': 'Data del servizio',
    } as Record<string, string>,
    loading: 'Invio della richiesta in corso...',
    submit: 'Invia richiesta',
    successDescription:
      'Il team leggerà il brief e risponderà con una direzione di proposta adatta.',
    successTitle: 'Richiesta ricevuta',
  },
  pt: {
    asideLabel: 'Informação de apoio ao planeamento',
    asideTitle: 'Envie um pedido e receba a orientação certa',
    asideDescription:
      'A equipa irá rever datas, destinos, estilo de viagem e dimensão do grupo antes de recomendar o próximo passo.',
    bullets: [
      'Resposta em horário útil',
      'Aconselhamento baseado em datas e necessidades reais',
      'Pedido encaminhado para a equipa certa',
    ],
    fieldLabels: {
      airport: 'Aeroporto',
      brief: 'Necessidades / orçamento / datas',
      company: 'Empresa / grupo de viajantes',
      email: 'Email',
      'full-name': 'Nome completo',
      'group-size': 'Dimensão estimada do grupo',
      message: 'Mensagem',
      phone: 'Telefone',
      'policy-code': 'Código de tour / contrato / apólice se disponível',
      'service-date': 'Data do serviço',
    } as Record<string, string>,
    loading: 'A enviar o seu pedido...',
    submit: 'Enviar pedido',
    successDescription:
      'A equipa irá rever o brief e responder com uma direção de proposta adequada.',
    successTitle: 'Pedido recebido',
  },
  vi: {
    asideLabel: 'Thông tin hỗ trợ tư vấn',
    asideTitle: 'Gửi yêu cầu, nhận tư vấn đúng nhu cầu',
    asideDescription:
      'Team WingsGroup sẽ kiểm tra lịch, ngân sách, điểm đến và phản hồi phương án phù hợp để khách không phải tự lọc quá nhiều thông tin.',
    bullets: [
      'Phản hồi theo giờ làm việc',
      'Tư vấn theo lịch và ngân sách thật',
      'Có thể chuyển tiếp cho sales/content manager',
    ],
    fieldLabels: {} as Record<string, string>,
    loading: 'Đang gửi yêu cầu, vui lòng chờ...',
    submit: '',
    successDescription: '',
    successTitle: '',
  },
} as const

type FormCopyLocale = keyof typeof formCopy

const getFormCopyLocale = (locale?: null | string): FormCopyLocale =>
  locale && locale in formCopy ? (locale as FormCopyLocale) : getCopyLocale(locale)

const getFieldName = (field: FormFieldBlock) =>
  'name' in field && typeof field.name === 'string' ? field.name : null

export const FormBlock: React.FC<
  {
    id?: string
  } & FormBlockType
> = (props) => {
  const { enableIntro, form: formFromProps, introContent, presentation = 'split-contact' } = props
  const {
    id: formID,
    confirmationMessage,
    confirmationType,
    redirect,
    submitButtonLabel,
  } = formFromProps || {}

  const locale = useSitePublicLocale()
  const copyLocale = getFormCopyLocale(locale)
  const copy = formCopy[copyLocale]
  const localizedFields =
    formFromProps?.fields?.map((field) => {
      const fieldName = getFieldName(field)
      const localizedLabel = fieldName ? copy.fieldLabels[fieldName] : undefined

      return localizedLabel
        ? {
            ...field,
            label: localizedLabel,
          }
        : field
    }) || []
  const localizedForm = {
    ...formFromProps,
    fields: localizedFields,
  }

  const formMethods = useForm({
    defaultValues: formFromProps?.fields || [],
  })
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = formMethods

  const [isLoading, setIsLoading] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState<boolean>()
  const [error, setError] = useState<{ message: string; status?: string } | undefined>()
  const [challengeSiteKey, setChallengeSiteKey] = useState<string>()
  const [turnstileToken, setTurnstileToken] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const errorRef = useRef<HTMLDivElement>(null)
  const submittingRef = useRef(false)
  const idempotencyKeyRef = useRef<string | null>(null)
  const router = useRouter()
  const toSitePath = useSitePath()

  useEffect(() => {
    if (error) {
      errorRef.current?.focus()
    }
  }, [error])

  const onSubmit = useCallback(
    (data: FormFieldBlock[]) => {
      if (submittingRef.current) return
      submittingRef.current = true
      idempotencyKeyRef.current ||= crypto.randomUUID()

      const submitForm = async () => {
        setError(undefined)
        setIsLoading(true)

        const dataToSend = Object.entries(data)
          .filter(([name]) => name !== '_website')
          .map(([name, value]) => ({ field: name, value }))

        try {
          const req = await fetch(`${getClientSideURL()}/api/lead-submissions`, {
            body: JSON.stringify({
              formId: formID,
              honeypot,
              idempotencyKey: idempotencyKeyRef.current,
              submissionData: dataToSend,
              turnstileToken: turnstileToken || undefined,
            }),
            headers: {
              'Content-Type': 'application/json',
            },
            method: 'POST',
          })

          const res = await req.json()

          if (req.status >= 400) {
            submittingRef.current = false
            setIsLoading(false)

            if (req.status === 403 && res.challengeRequired && typeof res.siteKey === 'string') {
              setChallengeSiteKey(res.siteKey)
            }

            setError({
              message:
                req.status === 403
                  ? copyLocale === 'en'
                    ? 'Please complete the security verification and submit again.'
                    : 'Vui lòng hoàn tất bước xác minh bảo mật và gửi lại.'
                  : copyLocale === 'en'
                    ? 'We could not submit your request. Please try again.'
                    : 'Chưa thể gửi yêu cầu. Vui lòng thử lại.',
              status: String(req.status),
            })

            return
          }

          setIsLoading(false)
          setHasSubmitted(true)
          idempotencyKeyRef.current = null

          if (confirmationType === 'redirect' && redirect) {
            const { url } = redirect

            const redirectUrl = url ? toSitePath(url) : null

            if (redirectUrl) router.push(redirectUrl)
          }
        } catch (err) {
          console.warn(err)
          submittingRef.current = false
          setIsLoading(false)
          setError({
            message: copyLocale === 'en' ? 'Something went wrong.' : 'Đã có lỗi xảy ra.',
          })
        }
      }

      void submitForm()
    },
    [router, formID, redirect, confirmationType, copyLocale, honeypot, toSitePath, turnstileToken],
  )

  if (!formFromProps || !formID) {
    return (
      <section
        className="container theme-section layout-block layout-block--form"
        id="contact-form"
      >
        <div className="site-lead-form-card theme-card--quiet border p-4 lg:p-6" role="alert">
          <h2>{copy.asideTitle}</h2>
          <p>
            Biểu mẫu liên hệ hiện chưa được cấu hình. Vui lòng thử lại sau hoặc liên hệ trực tiếp
            với WingsGo.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section
      className={`container theme-section layout-block layout-block--form layout-block--${presentation}`}
      data-block-presentation={presentation}
      id="contact-form"
    >
      <div className="site-lead-form-shell layout-form">
        <aside className="site-lead-form-aside" aria-label={copy.asideLabel}>
          <div className="site-panel-icon">
            <HeadphonesIcon aria-hidden="true" className="h-5 w-5" />
          </div>
          <h2>{copy.asideTitle}</h2>
          <p>{copy.asideDescription}</p>
          <ul>
            <li>
              <ClockIcon aria-hidden="true" className="h-4 w-4" />
              {copy.bullets[0]}
            </li>
            <li>
              <BadgeCheckIcon aria-hidden="true" className="h-4 w-4" />
              {copy.bullets[1]}
            </li>
            <li>
              <SendIcon aria-hidden="true" className="h-4 w-4" />
              {copy.bullets[2]}
            </li>
          </ul>
        </aside>

        <div className="site-lead-form-card theme-card--quiet border p-4 lg:p-6">
          {enableIntro && introContent && !hasSubmitted && (
            <RichText className="mb-8 lg:mb-10" data={introContent} enableGutter={false} />
          )}
          <FormProvider {...formMethods}>
            {!isLoading && hasSubmitted && confirmationType === 'message' && (
              <div
                aria-live="polite"
                className="site-form-state site-form-state--success"
                role="status"
              >
                <BadgeCheckIcon aria-hidden="true" className="h-5 w-5" />
                {copy.successTitle ? (
                  <div>
                    <h2>{copy.successTitle}</h2>
                    <p>{copy.successDescription}</p>
                  </div>
                ) : (
                  <RichText data={confirmationMessage} />
                )}
              </div>
            )}
            {isLoading && !hasSubmitted && (
              <p aria-live="polite" className="site-form-state" role="status">
                {copy.loading}
              </p>
            )}
            {error && (
              <div
                className="site-form-state site-form-state--error"
                ref={errorRef}
                role="alert"
                tabIndex={-1}
              >
                {`${error.status || '500'}: ${error.message || ''}`}
              </div>
            )}
            {!hasSubmitted && (
              <form aria-busy={isLoading} id={formID} onSubmit={handleSubmit(onSubmit)}>
                <div aria-hidden="true" className="absolute left-[-10000px]" tabIndex={-1}>
                  <label htmlFor={`${formID}-website`}>Website</label>
                  <input
                    autoComplete="off"
                    id={`${formID}-website`}
                    tabIndex={-1}
                    type="text"
                    onChange={(event) => setHoneypot(event.target.value)}
                    value={honeypot}
                  />
                </div>
                <div className="mb-4 last:mb-0">
                  {localizedForm &&
                    localizedForm.fields &&
                    localizedForm.fields?.map((field, index) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const Field: React.FC<any> = fields?.[field.blockType as keyof typeof fields]
                      if (Field) {
                        return (
                          <div className="mb-6 last:mb-0" key={index}>
                            <Field
                              form={localizedForm}
                              {...field}
                              {...formMethods}
                              control={control}
                              errors={errors}
                              register={register}
                            />
                          </div>
                        )
                      }
                      return null
                    })}
                </div>

                {challengeSiteKey && (
                  <div className="mb-4">
                    <TurnstileWidget onToken={setTurnstileToken} siteKey={challengeSiteKey} />
                  </div>
                )}

                <Button
                  className="site-form-submit"
                  disabled={isLoading}
                  form={formID}
                  type="submit"
                  variant="default"
                >
                  {isLoading ? copy.loading : copy.submit || submitButtonLabel}
                </Button>
              </form>
            )}
          </FormProvider>
        </div>
      </div>
    </section>
  )
}
