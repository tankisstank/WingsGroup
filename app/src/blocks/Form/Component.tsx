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
import type { LocalizedCopy } from '@/i18n/publicCopy'
import type { LeadSubmissionContext } from '@/lead-capture/types'
import type { ConsultationChannelKey, WingsGroupLeadPublicConfig } from '@/lead-capture/types'
import { getFormSiteCode, WINGSGROUP_SITE_CODE } from '@/lead-capture/wingsGroupV3'

import './form-layout.css'

export type FormBlockType = {
  blockName?: string
  blockType?: 'formBlock'
  enableIntro: boolean
  form: FormType | null
  introContent?: DefaultTypedEditorState
  presentation?: 'centered-card' | 'minimal' | 'split-contact' | 'support-channels'
  wingsGroupV3?: boolean
}

type FormLocalizedCopy = {
  asideDescription: string
  asideLabel: string
  asideTitle: string
  bullets: readonly [string, string, string]
  fieldLabels: Record<string, string>
  loading: string
  required: string
  requiredMessage: string
  submit: string
  successDescription: string
  successTitle: string
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
      country: 'Country of residence',
      email: 'Email',
      'full-name': 'Full name',
      'group-size': 'Estimated group size',
      message: 'Message',
      phone: 'Phone number',
      'policy-code': 'Tour / contract / policy code if available',
      'service-date': 'Service date',
      'travel-month': 'Preferred travel month/date window',
    } as Record<string, string>,
    required: 'required',
    requiredMessage: 'This field is required',
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
      country: 'País de residencia',
      email: 'Email',
      'full-name': 'Nombre completo',
      'group-size': 'Tamaño estimado del grupo',
      message: 'Mensaje',
      phone: 'Teléfono',
      'policy-code': 'Código de tour / contrato / póliza si aplica',
      'service-date': 'Fecha del servicio',
      'travel-month': 'Mes o intervalo de fechas preferido',
    } as Record<string, string>,
    required: 'obligatorio',
    requiredMessage: 'Este campo es obligatorio',
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
      country: 'Paese di residenza',
      email: 'Email',
      'full-name': 'Nome completo',
      'group-size': 'Dimensione stimata del gruppo',
      message: 'Messaggio',
      phone: 'Telefono',
      'policy-code': 'Codice tour / contratto / polizza se disponibile',
      'service-date': 'Data del servizio',
      'travel-month': 'Mese o intervallo di date preferito',
    } as Record<string, string>,
    required: 'obbligatorio',
    requiredMessage: 'Questo campo è obbligatorio',
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
      country: 'País de residência',
      email: 'Email',
      'full-name': 'Nome completo',
      'group-size': 'Dimensão estimada do grupo',
      message: 'Mensagem',
      phone: 'Telefone',
      'policy-code': 'Código de tour / contrato / apólice se disponível',
      'service-date': 'Data do serviço',
      'travel-month': 'Mês ou intervalo de datas preferido',
    } as Record<string, string>,
    required: 'obrigatório',
    requiredMessage: 'Este campo é obrigatório',
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
      'Đội ngũ WingsGroup sẽ kiểm tra lịch, ngân sách, điểm đến và phản hồi phương án phù hợp để khách không phải tự lọc quá nhiều thông tin.',
    bullets: [
      'Phản hồi theo giờ làm việc',
      'Tư vấn theo lịch và ngân sách thật',
      'Chuyển đúng người phụ trách tư vấn hoặc nội dung',
    ],
    fieldLabels: {
      airport: 'Sân bay',
      brief: 'Nhu cầu / ngân sách / thời gian',
      company: 'Công ty / nhóm khách',
      country: 'Quốc gia cư trú',
      email: 'Email',
      'full-name': 'Họ và tên',
      'group-size': 'Số khách dự kiến',
      message: 'Lời nhắn',
      phone: 'Số điện thoại',
      'policy-code': 'Mã tour / hợp đồng / hồ sơ nếu có',
      'service-date': 'Ngày sử dụng dịch vụ',
      'travel-month': 'Khoảng tháng/ngày dự kiến',
    } as Record<string, string>,
    loading: 'Đang gửi yêu cầu, vui lòng chờ...',
    required: 'bắt buộc',
    requiredMessage: 'Vui lòng điền thông tin này',
    submit: 'Gửi yêu cầu',
    successDescription: 'Đội ngũ tư vấn sẽ đọc nội dung và phản hồi với hướng đề xuất phù hợp.',
    successTitle: 'Đã nhận yêu cầu',
  },
} as const satisfies LocalizedCopy<FormLocalizedCopy>

type FormCopyLocale = keyof typeof formCopy

const getFormCopyLocale = (locale?: null | string): FormCopyLocale =>
  locale && locale in formCopy ? (locale as FormCopyLocale) : getCopyLocale(locale)

const getFieldName = (field: FormFieldBlock) =>
  'name' in field && typeof field.name === 'string' ? field.name : null

const sanitizeFormControlSegment = (value?: null | string) =>
  String(value || 'field')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'field'

const getFieldControlID = (formID: string | number, fieldName: string) =>
  `${sanitizeFormControlSegment(String(formID))}-${sanitizeFormControlSegment(fieldName)}`

const wingsGroupLeadCopy = {
  en: {
    channelsTitle: 'Optional consultation channels',
    configLoading: 'Preparing the secure consultation form…',
    configUnavailable:
      'The consultation form is temporarily unavailable. Your details have not been submitted. Please try again later.',
    consentRequired: 'Please confirm your consent before submitting this request.',
    noPreference: 'No preference — use the contact form',
    pending: 'Pending update',
    policyLink: 'Read the Privacy Policy',
    preferredChannel: 'Preferred contact channel (optional)',
  },
  vi: {
    channelsTitle: 'Kênh tư vấn tùy chọn',
    configLoading: 'Đang chuẩn bị biểu mẫu tư vấn bảo mật…',
    configUnavailable:
      'Biểu mẫu tư vấn đang tạm thời không khả dụng. Thông tin của bạn chưa được gửi. Vui lòng thử lại sau.',
    consentRequired: 'Vui lòng xác nhận đồng ý trước khi gửi yêu cầu.',
    noPreference: 'Không ưu tiên — sử dụng biểu mẫu liên hệ',
    pending: 'Chờ cập nhật',
    policyLink: 'Đọc Chính sách bảo mật',
    preferredChannel: 'Kênh liên hệ ưu tiên (không bắt buộc)',
  },
} as const

const readLeadSubmissionContext = (
  form: HTMLFormElement | null,
): LeadSubmissionContext | undefined => {
  const serialized = form?.dataset.wsEnquiryContext
  if (!serialized) return undefined

  try {
    const context = JSON.parse(serialized) as unknown
    return context && typeof context === 'object' && !Array.isArray(context)
      ? (context as LeadSubmissionContext)
      : undefined
  } catch {
    return undefined
  }
}

export const FormBlock: React.FC<
  {
    anchorId?: null | string
    formOdId?: string
    id?: string
    siteCode?: null | string
    submitOdId?: string
  } & FormBlockType
> = (props) => {
  const {
    anchorId,
    enableIntro,
    form: formFromProps,
    formOdId,
    introContent,
    presentation = 'split-contact',
    siteCode,
    submitOdId,
    wingsGroupV3 = false,
  } = props
  const resolvedAnchorId = anchorId === undefined ? 'contact-form' : anchorId || undefined
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
  const wingsGroupCopy = wingsGroupLeadCopy[copyLocale === 'en' ? 'en' : 'vi']
  const isWingsGroupV3 =
    wingsGroupV3 ||
    siteCode === WINGSGROUP_SITE_CODE ||
    getFormSiteCode(formFromProps) === WINGSGROUP_SITE_CODE ||
    (typeof document !== 'undefined' && document.body.dataset.siteCode === WINGSGROUP_SITE_CODE)
  const resolvedSubmitLabel =
    isWingsGroupV3 && copyLocale === 'vi' ? 'Nhận tư vấn phù hợp' : copy.submit || submitButtonLabel
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
  const [leadConfig, setLeadConfig] = useState<WingsGroupLeadPublicConfig | undefined>(
    isWingsGroupV3 ? undefined : { enabled: false },
  )
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [consentError, setConsentError] = useState(false)
  const [preferredChannel, setPreferredChannel] = useState<ConsultationChannelKey | ''>('')
  const errorRef = useRef<HTMLDivElement>(null)
  const consentRef = useRef<HTMLButtonElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const handlingNativeInvalidRef = useRef(false)
  const submittingRef = useRef(false)
  const idempotencyKeyRef = useRef<string | null>(null)
  const router = useRouter()
  const toSitePath = useSitePath()

  useEffect(() => {
    if (error) {
      errorRef.current?.focus()
    }
  }, [error])

  useEffect(() => {
    if (!isWingsGroupV3) {
      setLeadConfig({ enabled: false })
      return
    }

    const controller = new AbortController()
    const loadConfig = async () => {
      try {
        const response = await fetch(`${getClientSideURL()}/api/lead-submissions`, {
          cache: 'no-store',
          method: 'GET',
          signal: controller.signal,
        })
        const body = (await response.json()) as WingsGroupLeadPublicConfig
        setLeadConfig(
          response.ok && body?.enabled === true
            ? body
            : { available: false, enabled: true, reason: 'configuration-unavailable' },
        )
      } catch (loadError) {
        if ((loadError as { name?: string }).name !== 'AbortError') {
          setLeadConfig({
            available: false,
            enabled: true,
            reason: 'configuration-unavailable',
          })
        }
      }
    }

    void loadConfig()
    return () => controller.abort()
  }, [isWingsGroupV3])

  useEffect(() => {
    const syncPreferredChannel = (event: Event) => {
      const channel = (event as CustomEvent<{ channel?: string }>).detail?.channel
      if (channel !== 'zalo' && channel !== 'whatsapp' && channel !== 'messenger') return
      setPreferredChannel(channel)
    }

    window.addEventListener('wingsgroup-preferred-channel', syncPreferredChannel)
    return () => window.removeEventListener('wingsgroup-preferred-channel', syncPreferredChannel)
  }, [])

  const onSubmit = useCallback(
    (data: FormFieldBlock[]) => {
      if (submittingRef.current) return

      if (isWingsGroupV3) {
        if (
          !leadConfig ||
          !leadConfig.enabled ||
          !('available' in leadConfig) ||
          !leadConfig.available
        ) {
          setError({ message: wingsGroupCopy.configUnavailable, status: '503' })
          return
        }
        if (!consentAccepted) {
          setConsentError(true)
          queueMicrotask(() => consentRef.current?.focus())
          return
        }
      }

      const externalValidation = formRef.current?.dispatchEvent(
        new CustomEvent('ws-plan-validate', { bubbles: true, cancelable: true }),
      )
      if (externalValidation === false) return

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
              context: readLeadSubmissionContext(formRef.current),
              formId: formID,
              honeypot,
              idempotencyKey: idempotencyKeyRef.current,
              ...(isWingsGroupV3 &&
              leadConfig?.enabled &&
              'available' in leadConfig &&
              leadConfig.available
                ? {
                    leadContract: {
                      consent: consentAccepted,
                      consentVersion: leadConfig.consentVersion,
                      ...(preferredChannel ? { preferredChannel } : {}),
                    },
                  }
                : {}),
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
    [
      consentAccepted,
      confirmationType,
      copyLocale,
      formID,
      honeypot,
      isWingsGroupV3,
      leadConfig,
      preferredChannel,
      redirect,
      router,
      toSitePath,
      turnstileToken,
      wingsGroupCopy.configUnavailable,
    ],
  )

  const onInvalid = useCallback(
    (formErrors: typeof errors) => {
      const [firstInvalidName] = Object.keys(formErrors)

      if (!firstInvalidName || !formID) return

      const form = formRef.current
      const target = form?.ownerDocument.getElementById(getFieldControlID(formID, firstInvalidName))

      if (form && target && form.contains(target)) {
        target.focus()
      }
    },
    [formID],
  )

  const onNativeInvalid = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (handlingNativeInvalidRef.current) return

      handlingNativeInvalidRef.current = true
      void handleSubmit(onSubmit, onInvalid)()
      queueMicrotask(() => {
        handlingNativeInvalidRef.current = false
      })
    },
    [handleSubmit, onInvalid, onSubmit],
  )

  if (!formFromProps || !formID) {
    return (
      <section
        className="container theme-section layout-block layout-block--form"
        id={resolvedAnchorId}
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
      id={resolvedAnchorId}
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
              <form
                aria-busy={isLoading}
                data-od-id={formOdId}
                ref={formRef}
                id={formID}
                onInvalidCapture={onNativeInvalid}
                onSubmit={handleSubmit(onSubmit, onInvalid)}
              >
                <div aria-hidden="true" className="absolute left-[-10000px]" tabIndex={-1}>
                  <input
                    aria-hidden="true"
                    autoComplete="off"
                    id={`${formID}-website`}
                    name="_website"
                    role="presentation"
                    tabIndex={-1}
                    type="text"
                    onChange={(event) => setHoneypot(event.target.value)}
                    value={honeypot}
                  />
                </div>
                <div className="site-form-fields mb-4 last:mb-0">
                  {localizedForm &&
                    localizedForm.fields &&
                    localizedForm.fields?.map((field, index) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const Field: React.FC<any> = fields?.[field.blockType as keyof typeof fields]
                      if (Field) {
                        return (
                          <div
                            className="site-form-field mb-6 last:mb-0"
                            data-form-field-type={field.blockType}
                            key={index}
                          >
                            <Field
                              form={localizedForm}
                              {...field}
                              {...formMethods}
                              control={control}
                              errors={errors}
                              formID={formID}
                              register={register}
                              requiredLabel={copy.required}
                              requiredMessage={copy.requiredMessage}
                            />
                          </div>
                        )
                      }
                      return null
                    })}
                </div>

                {isWingsGroupV3 && !leadConfig && (
                  <p aria-live="polite" className="site-form-state" role="status">
                    {wingsGroupCopy.configLoading}
                  </p>
                )}

                {isWingsGroupV3 &&
                  leadConfig?.enabled &&
                  'available' in leadConfig &&
                  !leadConfig.available && (
                    <div className="site-form-state site-form-state--error" role="alert">
                      {wingsGroupCopy.configUnavailable}
                    </div>
                  )}

                {isWingsGroupV3 &&
                  leadConfig?.enabled &&
                  'available' in leadConfig &&
                  leadConfig.available && (
                    <div className="site-wingsgroup-lead-contract">
                      {leadConfig.channels.length > 0 && (
                        <fieldset className="site-wingsgroup-channels">
                          <legend>{wingsGroupCopy.channelsTitle}</legend>
                          <ul>
                            {leadConfig.channels.map((channel) => (
                              <li key={channel.key}>
                                {channel.state === 'approved' && channel.href ? (
                                  <a href={channel.href} rel="noreferrer" target="_blank">
                                    {channel.label}
                                  </a>
                                ) : (
                                  <span aria-disabled="true">
                                    {channel.label} — {wingsGroupCopy.pending}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                          <label htmlFor={`${formID}-preferred-channel`}>
                            {wingsGroupCopy.preferredChannel}
                          </label>
                          <select
                            id={`${formID}-preferred-channel`}
                            onChange={(event) =>
                              setPreferredChannel(event.target.value as ConsultationChannelKey | '')
                            }
                            value={preferredChannel}
                          >
                            <option value="">{wingsGroupCopy.noPreference}</option>
                            {leadConfig.channels.map((channel) => (
                              <option key={channel.key} value={channel.key}>
                                {channel.label}
                                {channel.state === 'pending-update'
                                  ? ` — ${wingsGroupCopy.pending}`
                                  : ''}
                              </option>
                            ))}
                          </select>
                        </fieldset>
                      )}

                      <div className="site-wingsgroup-consent">
                        <button
                          aria-describedby={
                            consentError ? `${formID}-wingsgroup-consent-error` : undefined
                          }
                          aria-invalid={consentError || undefined}
                          aria-checked={consentAccepted}
                          className="site-wingsgroup-consent__control"
                          id={`${formID}-wingsgroup-consent`}
                          onClick={() => {
                            setConsentAccepted((current) => !current)
                            setConsentError(false)
                          }}
                          ref={consentRef}
                          role="checkbox"
                          type="button"
                        >
                          <span aria-hidden="true">{consentAccepted ? '✓' : ''}</span>
                          <span>{leadConfig.consentCopy}</span>
                        </button>
                        <a href={leadConfig.policyHref}>{wingsGroupCopy.policyLink}</a>
                        {consentError && (
                          <p id={`${formID}-wingsgroup-consent-error`} role="alert">
                            {wingsGroupCopy.consentRequired}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                {challengeSiteKey && (
                  <div className="mb-4">
                    <TurnstileWidget onToken={setTurnstileToken} siteKey={challengeSiteKey} />
                  </div>
                )}

                <Button
                  className="site-form-submit"
                  data-od-id={submitOdId}
                  disabled={
                    isLoading ||
                    (isWingsGroupV3 &&
                      (!leadConfig ||
                        !leadConfig.enabled ||
                        !('available' in leadConfig) ||
                        !leadConfig.available))
                  }
                  form={formID}
                  type="submit"
                  variant="default"
                >
                  {isLoading ? copy.loading : resolvedSubmitLabel}
                </Button>
              </form>
            )}
          </FormProvider>
        </div>
      </div>
    </section>
  )
}
