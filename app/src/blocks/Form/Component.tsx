'use client'
import type { FormFieldBlock, Form as FormType } from '@payloadcms/plugin-form-builder/types'

import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useForm, FormProvider, type FieldValues } from 'react-hook-form'
import RichText from '@/components/RichText'
import { Button } from '@/components/ui/button'
import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'
import { BadgeCheckIcon, ClockIcon, HeadphonesIcon, SendIcon } from 'lucide-react'

import { fields } from './fields'
import { getClientSideURL } from '@/utilities/getURL'
import { WINGSGROUP_CONTACT_FOCUS_SESSION_KEY } from '@/utilities/wingsGroupConsultation'
import { useSitePublicLocale } from '@/providers/SitePath'
import { useSitePath } from '@/utilities/useSitePath'
import { getCopyLocale } from '@/utilities/locales'
import { getSharedZaloCTA } from '@/utilities/sharedConsultationChannels'
import { TurnstileWidget } from './TurnstileWidget'
import { ProtectedEmailLink } from '@/components/ProtectedEmailLink'
import type { LocalizedCopy } from '@/i18n/publicCopy'
import type { LeadSubmissionContext } from '@/lead-capture/types'
import { readSafeTourEnquiryContext } from '@/tours/enquiryContext'
import type {
  ConsultationChannelKey,
  ConsultationChannelPublicState,
  WingsGroupLeadPublicConfig,
} from '@/lead-capture/types'
import { consultationChannelKeys } from '@/lead-capture/types'
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
  phoneMessage: string
  required: string
  requiredMessage: string
  submit: string
  successDescription: string
  successTitle: string
}

const formCopy = {
  en: {
    asideLabel: 'Consultation support information',
    asideTitle: 'Share your plans; our specialists will guide the next step.',
    asideDescription:
      'The WingsGroup team will review the timing, budget, destination, and service context before recommending the right next step.',
    bullets: [
      'A response during business hours',
      'Advice tailored to your timing and budget',
      'Introduced to the right specialist',
    ],
    fieldLabels: {
      airport: 'Airport',
      brief: 'Needs / budget / timing',
      company: 'Company / traveler group',
      country: 'Country of residence',
      destination: 'Where would you like to go?',
      'departure-date': 'Expected departure',
      email: 'Email',
      'full-name': 'Full name',
      guests: 'Number of travelers',
      'group-size': 'Estimated group size',
      message: 'Message',
      phone: 'Phone number',
      'tour-interest': 'Tour you are interested in',
      'policy-code': 'Tour / contract / policy code if available',
      'service-date': 'Service date',
      'travel-month': 'Preferred travel month/date window',
    } as Record<string, string>,
    required: 'required',
    requiredMessage: 'This field is required',
    phoneMessage: 'Enter a valid phone number',
    loading: 'Sending your request, please wait...',
    submit: 'Send brief',
    successDescription: 'A specialist will review your plans and return with a tailored proposal.',
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
      destination: '¿A dónde quieres viajar?',
      'departure-date': 'Fecha prevista de salida',
      email: 'Email',
      'full-name': 'Nombre completo',
      guests: 'Número de viajeros',
      'group-size': 'Tamaño estimado del grupo',
      message: 'Mensaje',
      phone: 'Teléfono',
      'tour-interest': 'Tour que te interesa',
      'policy-code': 'Código de tour / contrato / póliza si aplica',
      'service-date': 'Fecha del servicio',
      'travel-month': 'Mes o intervalo de fechas preferido',
    } as Record<string, string>,
    required: 'obligatorio',
    requiredMessage: 'Este campo es obligatorio',
    phoneMessage: 'Introduce un número de teléfono válido',
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
      destination: 'Dove vuoi andare?',
      'departure-date': 'Partenza prevista',
      email: 'Email',
      'full-name': 'Nome completo',
      guests: 'Numero di viaggiatori',
      'group-size': 'Dimensione stimata del gruppo',
      message: 'Messaggio',
      phone: 'Telefono',
      'tour-interest': 'Tour di interesse',
      'policy-code': 'Codice tour / contratto / polizza se disponibile',
      'service-date': 'Data del servizio',
      'travel-month': 'Mese o intervallo di date preferito',
    } as Record<string, string>,
    required: 'obbligatorio',
    requiredMessage: 'Questo campo è obbligatorio',
    phoneMessage: 'Inserisci un numero di telefono valido',
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
      destination: 'Para onde quer viajar?',
      'departure-date': 'Partida prevista',
      email: 'Email',
      'full-name': 'Nome completo',
      guests: 'Número de viajantes',
      'group-size': 'Dimensão estimada do grupo',
      message: 'Mensagem',
      phone: 'Telefone',
      'tour-interest': 'Tour de interesse',
      'policy-code': 'Código de tour / contrato / apólice se disponível',
      'service-date': 'Data do serviço',
      'travel-month': 'Mês ou intervalo de datas preferido',
    } as Record<string, string>,
    required: 'obrigatório',
    requiredMessage: 'Este campo é obrigatório',
    phoneMessage: 'Insira um número de telefone válido',
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
      destination: 'Bạn muốn đi đâu?',
      'departure-date': 'Dự kiến khởi hành',
      email: 'Email',
      'full-name': 'Họ và tên',
      guests: 'Số lượng khách',
      'group-size': 'Số khách dự kiến',
      message: 'Lời nhắn',
      phone: 'Số điện thoại',
      'tour-interest': 'Tour bạn quan tâm',
      'policy-code': 'Mã tour / hợp đồng / hồ sơ nếu có',
      'service-date': 'Ngày sử dụng dịch vụ',
      'travel-month': 'Khoảng tháng/ngày dự kiến',
    } as Record<string, string>,
    loading: 'Đang gửi yêu cầu, vui lòng chờ...',
    required: 'bắt buộc',
    requiredMessage: 'Vui lòng điền thông tin này',
    phoneMessage: 'Vui lòng nhập số điện thoại hợp lệ',
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
    policyLink: 'Đọc Chính sách bảo mật',
    preferredChannel: 'Kênh liên hệ ưu tiên (không bắt buộc)',
  },
} as const

const readLeadSubmissionContext = (
  form: HTMLFormElement | null,
  siteCode?: null | string,
): LeadSubmissionContext | undefined => {
  const serialized = form?.dataset.wsEnquiryContext
  if (serialized) {
    try {
      const context = JSON.parse(serialized) as unknown
      if (context && typeof context === 'object' && !Array.isArray(context)) {
        return context as LeadSubmissionContext
      }
    } catch {
      // Fall back to the validated tour context in the contact-page URL.
    }
  }

  if (siteCode !== 'wings-go' || typeof window === 'undefined') return undefined
  const context = readSafeTourEnquiryContext(new URLSearchParams(window.location.search))
  const leadContext: LeadSubmissionContext = {
    departureDate: context.departureDate || undefined,
    departureId: context.departureId ? String(context.departureId) : undefined,
    discovery: context.discovery,
    guests: context.guests || undefined,
    intent: context.intent,
    source: context.source || undefined,
    tourId: context.tourId ? String(context.tourId) : undefined,
    tourSlug: context.tourSlug || undefined,
  }
  return Object.values(leadContext).some(Boolean) ? leadContext : undefined
}

export const FormBlock: React.FC<
  {
    anchorId?: null | string
    formOdId?: string
    id?: string
    siteCode?: null | string
    publicPathname?: null | string
    registeredOfficeAddress?: null | string
    submitOdId?: string
    travelOfficeAddress?: null | string
  } & FormBlockType
> = (props) => {
  const {
    anchorId,
    enableIntro,
    form: formFromProps,
    formOdId,
    introContent,
    presentation = 'split-contact',
    publicPathname,
    registeredOfficeAddress,
    siteCode,
    submitOdId,
    travelOfficeAddress,
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
    getFormSiteCode(formFromProps) === WINGSGROUP_SITE_CODE
  const hasGovernedConsentField =
    isWingsGroupV3 &&
    Boolean(
      formFromProps?.fields?.some(
        (field) => field.blockType === 'checkbox' && getFieldName(field) === 'consent',
      ),
    )
  const isWingsGoContactPage = siteCode === 'wings-go' && publicPathname === '/lien-he'
  const wingsGoZalo = isWingsGoContactPage ? getSharedZaloCTA(siteCode, locale) : null
  const resolvedSubmitLabel = isWingsGoContactPage
    ? copyLocale === 'en'
      ? '↳ GET ADVICE & A QUOTE'
      : '↳ NHẬN TƯ VẤN & BÁO GIÁ'
    : isWingsGroupV3 && copyLocale === 'vi'
      ? 'Nhận tư vấn phù hợp'
      : copy.submit || submitButtonLabel
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

  const defaultFormValues = Object.fromEntries(
    (formFromProps?.fields || []).flatMap((field) => {
      const fieldName = getFieldName(field)
      return fieldName
        ? [[fieldName, 'defaultValue' in field ? field.defaultValue ?? '' : '']]
        : []
    }),
  )
  const formMethods = useForm<FieldValues>({ defaultValues: defaultFormValues })
  const {
    control,
    formState: { errors },
    getValues,
    handleSubmit,
    register,
    setValue,
  } = formMethods
  const departureDateFieldName = formFromProps?.fields?.some(
    (field) => 'name' in field && field.name === 'departure-date',
  )
    ? 'departure-date'
    : null

  useEffect(() => {
    if (siteCode !== 'wings-go' || typeof window === 'undefined') return

    const context = readSafeTourEnquiryContext(new URLSearchParams(window.location.search))
    const fieldNames = new Set(
      (formFromProps?.fields || []).flatMap((field) => {
        const name = getFieldName(field)
        return name ? [name] : []
      }),
    )
    const tourLabel = context.tourTitle || context.tourSlug || (context.tourId ? `#${context.tourId}` : '')
    const destination = context.discovery?.destination || tourLabel
    const intentLabel =
      context.intent === 'hold-seat'
        ? 'Giữ chỗ'
        : context.intent === 'request-quote'
          ? 'Nhận báo giá'
          : context.intent === 'inquiry'
            ? 'Tư vấn'
            : ''
    const message = [
      tourLabel ? `Tour quan tâm: ${tourLabel}` : '',
      context.departureDate ? `Ngày dự kiến: ${context.departureDate}` : '',
      context.guests ? `Số khách: ${context.guests} khách` : '',
      intentLabel ? `Nhu cầu: ${intentLabel}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const prefill: Record<string, string> = {
      ...(departureDateFieldName && context.departureDate
        ? { [departureDateFieldName]: context.departureDate }
        : {}),
      ...(fieldNames.has('tour-interest') && tourLabel ? { 'tour-interest': tourLabel } : {}),
      ...(fieldNames.has('destination') && destination ? { destination } : {}),
      ...(fieldNames.has('market') && destination ? { market: destination } : {}),
      ...(fieldNames.has('guests') && context.guests ? { guests: String(context.guests) } : {}),
      ...(fieldNames.has('pax') && context.guests ? { pax: String(context.guests) } : {}),
      ...(fieldNames.has('message') && message ? { message } : {}),
    }

    for (const [name, value] of Object.entries(prefill)) {
      if (!getValues(name)) {
        setValue(name, value, { shouldDirty: false, shouldValidate: true })
      }
    }
  }, [departureDateFieldName, formFromProps?.fields, getValues, setValue, siteCode])

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
  const leadChannels =
    leadConfig && leadConfig.enabled && 'available' in leadConfig && leadConfig.available
      ? leadConfig.channels.filter(
          (
            channel,
          ): channel is ConsultationChannelPublicState & { href: string; state: 'approved' } =>
            channel.state === 'approved' &&
            typeof channel.href === 'string' &&
            channel.href.length > 0,
        )
      : []
  const approvedPreferredChannel = leadChannels.some((channel) => channel.key === preferredChannel)
    ? preferredChannel
    : ''

  useEffect(() => {
    if (
      !isWingsGroupV3 ||
      !resolvedAnchorId ||
      window.location.hash !== `#${resolvedAnchorId}` ||
      window.sessionStorage.getItem(WINGSGROUP_CONTACT_FOCUS_SESSION_KEY) !== resolvedAnchorId
    )
      return

    let animationFrame = 0
    let attempts = 0
    const focusWhenReady = () => {
      const target = formRef.current?.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([aria-hidden="true"]):not([disabled]), textarea:not([aria-hidden="true"]):not([disabled]), select:not([aria-hidden="true"]):not([disabled])',
      )

      if (!target && attempts++ < 4) {
        animationFrame = window.requestAnimationFrame(focusWhenReady)
        return
      }
      if (!target) return

      window.sessionStorage.removeItem(WINGSGROUP_CONTACT_FOCUS_SESSION_KEY)
      target.focus({ preventScroll: true })
      target.scrollIntoView?.({ block: 'center' })
    }

    animationFrame = window.requestAnimationFrame(focusWhenReady)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [isWingsGroupV3, resolvedAnchorId])

  useEffect(() => {
    if (!isWingsGroupV3) return
    const channel = new URLSearchParams(window.location.search).get('channel')
    if (channel && consultationChannelKeys.includes(channel as ConsultationChannelKey)) {
      setPreferredChannel(channel as ConsultationChannelKey)
    }
  }, [isWingsGroupV3])

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

    setConsentAccepted(false)
    setConsentError(false)
    setLeadConfig(undefined)
    const controller = new AbortController()
    const requestedLocale = copyLocale
    const loadConfig = async () => {
      try {
        const response = await fetch(
          `${getClientSideURL()}/api/lead-submissions?locale=${encodeURIComponent(requestedLocale)}`,
          {
            cache: 'no-store',
            method: 'GET',
            signal: controller.signal,
          },
        )
        const body = (await response.json()) as WingsGroupLeadPublicConfig
        if (controller.signal.aborted) return
        setLeadConfig(
          response.ok && body?.enabled === true
            ? body
            : { available: false, enabled: true, reason: 'configuration-unavailable' },
        )
      } catch (loadError) {
        if (!controller.signal.aborted && (loadError as { name?: string }).name !== 'AbortError') {
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
  }, [copyLocale, isWingsGroupV3])

  useEffect(() => {
    const syncPreferredChannel = (event: Event) => {
      const channel = (event as CustomEvent<{ channel?: string }>).detail?.channel
      if (
        channel !== 'zalo' &&
        channel !== 'whatsapp' &&
        channel !== 'messenger' &&
        channel !== 'callback'
      )
        return
      setPreferredChannel(channel)
    }

    window.addEventListener('wingsgroup-preferred-channel', syncPreferredChannel)
    return () => window.removeEventListener('wingsgroup-preferred-channel', syncPreferredChannel)
  }, [])

  const onSubmit = useCallback(
    (data: FieldValues) => {
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

        const dataToSend = Object.entries(
          hasGovernedConsentField ? { ...data, consent: consentAccepted } : data,
        )
          .filter(([name]) => name !== '_website')
          .map(([name, value]) => ({ field: name, value }))

        try {
          const req = await fetch(`${getClientSideURL()}/api/lead-submissions`, {
            body: JSON.stringify({
              context: readLeadSubmissionContext(formRef.current, siteCode),
              formId: formID,
              honeypot,
              idempotencyKey: idempotencyKeyRef.current,
              locale: copyLocale,
              ...(isWingsGroupV3 &&
              leadConfig?.enabled &&
              'available' in leadConfig &&
              leadConfig.available
                ? {
                    leadContract: {
                      consent: consentAccepted,
                      consentVersion: leadConfig.consentVersion,
                      ...(approvedPreferredChannel
                        ? { preferredChannel: approvedPreferredChannel }
                        : {}),
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
      hasGovernedConsentField,
      honeypot,
      isWingsGroupV3,
      approvedPreferredChannel,
      leadConfig,
      redirect,
      router,
      siteCode,
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
          <h2>{isWingsGoContactPage ? (copyLocale === 'en' ? 'Contact WingsGo' : 'Liên hệ WingsGo') : copy.asideTitle}</h2>
          <p>{copyLocale === 'en' ? 'The contact form is being configured. Call our team for help.' : 'Biểu mẫu liên hệ hiện chưa được cấu hình. Vui lòng gọi hotline WingsGo để được hỗ trợ.'}</p>
          {isWingsGoContactPage ? (
            <a className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[var(--site-brand)] px-5 font-semibold text-white" href="tel:0912910101">
              0912 910 101
            </a>
          ) : null}
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
      <div className={`site-lead-form-shell layout-form${isWingsGoContactPage ? ' wingsgo-contact-form-shell' : ''}`}>
        <aside
          aria-label={isWingsGoContactPage ? (copyLocale === 'en' ? '24/7 contact information' : 'Thông tin liên hệ 24/7') : copy.asideLabel}
          className={`site-lead-form-aside${isWingsGoContactPage ? ' wingsgo-contact-info order-2 lg:order-2' : ''}`}
        >
          {isWingsGoContactPage ? (
            <>
              <div className="site-panel-icon">
                <HeadphonesIcon aria-hidden="true" className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--site-brand)]">
                {copyLocale === 'en' ? 'Contact WingsGo 24/7' : 'Liên hệ WingsGo 24/7'}
              </p>
              <h2>{copyLocale === 'en' ? 'We are ready to help with your trip.' : 'WingsGo luôn sẵn sàng đồng hành cùng bạn.'}</h2>
              <ul className="wingsgo-contact-benefits">
                <li>✈️ {copyLocale === 'en' ? 'Advice on departure dates that fit your plans' : 'Tư vấn lịch khởi hành phù hợp'}</li>
                <li>🛡️ {copyLocale === 'en' ? 'Fast visa support' : 'Hỗ trợ visa nhanh chóng'}</li>
                <li>💲 {copyLocale === 'en' ? 'Transparent quotes with no hidden costs' : 'Báo giá minh bạch không phát sinh'}</li>
                <li>🎧 {copyLocale === 'en' ? 'Support throughout your trip' : 'Đồng hành trọn chuyến đi'}</li>
              </ul>
              <div className="mt-6 grid gap-3 text-sm">
                <a className="flex min-h-11 items-center gap-2 font-semibold text-[var(--site-brand)]" href="tel:0912910101">
                  <span aria-hidden="true">📞</span> 0912 910 101
                </a>
                {registeredOfficeAddress ? (
                  <p className="flex items-start gap-2 text-muted-foreground">
                    <span aria-hidden="true">📍</span>
                    <span>{copyLocale === 'en' ? 'Head office: ' : 'Trụ sở: '}{registeredOfficeAddress}</span>
                  </p>
                ) : null}
                {travelOfficeAddress ? (
                  <p className="flex items-start gap-2 text-muted-foreground">
                    <span aria-hidden="true">📍</span>
                    <span>{copyLocale === 'en' ? 'Travel office: ' : 'Văn phòng du lịch: '}{travelOfficeAddress}</span>
                  </p>
                ) : null}
                <p className="flex items-center gap-2">
                  <span aria-hidden="true">✉️</span>
                  <ProtectedEmailLink email="info@wingsgo.vn" />
                </p>
                {wingsGoZalo ? (
                  <a className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--site-brand)] px-5 font-semibold text-[var(--site-brand)] no-underline" href={wingsGoZalo.href} rel="noopener noreferrer" target="_blank">
                    {copyLocale === 'en' ? 'Chat on Zalo' : 'Nhắn Zalo'}
                  </a>
                ) : null}
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </aside>

        <div className={`site-lead-form-card theme-card--quiet border p-4 lg:p-6${isWingsGoContactPage ? ' wingsgo-contact-form-card order-1 lg:order-1' : ''}`}>
          {isWingsGoContactPage ? (
            <h2 className="mb-5 text-2xl font-semibold">
              {copyLocale === 'en' ? 'Get advice and a quote' : 'Nhận tư vấn và báo giá'}
            </h2>
          ) : null}
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
                      if (
                        hasGovernedConsentField &&
                        field.blockType === 'checkbox' &&
                        getFieldName(field) === 'consent'
                      )
                        return null
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
                              phonePattern={
                                isWingsGoContactPage ? /^0[0-9]{9}$/ : undefined
                              }
                              requiredLabel={copy.required}
                              requiredMessage={copy.requiredMessage}
                              phoneMessage={copy.phoneMessage}
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
                      {leadChannels.length > 0 && (
                        <fieldset className="site-wingsgroup-channels">
                          <legend>{wingsGroupCopy.channelsTitle}</legend>
                          <ul>
                            {leadChannels.map((channel) => (
                              <li key={channel.key}>
                                <a href={channel.href} rel="noreferrer" target="_blank">
                                  {channel.label}
                                </a>
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
                            {leadChannels.map((channel) => (
                              <option key={channel.key} value={channel.key}>
                                {channel.label}
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
                          aria-required="true"
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
                        <p className="site-wingsgroup-consent__retention">
                          {copyLocale === 'en'
                            ? `Information is retained for up to ${leadConfig.retentionMonths} months under the Privacy Policy.`
                            : `Thông tin được lưu tối đa ${leadConfig.retentionMonths} tháng theo Chính sách bảo mật.`}
                        </p>
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

                {isWingsGoContactPage ? (
                  <p className="mb-4 rounded-xl bg-orange-50 p-3 text-sm font-semibold text-orange-900">
                    {copyLocale === 'en' ? 'NEED HELP URGENTLY? CALL OR MESSAGE US: ' : 'NẾU CẦN GẤP LIÊN HỆ NGAY HOTLINE/ZALO: '}
                    <a className="whitespace-nowrap underline" href="tel:0912910101">0912 910 101</a>
                    {wingsGoZalo ? (
                      <>
                        {' / '}
                        <a className="underline" href={wingsGoZalo.href} rel="noopener noreferrer" target="_blank">Zalo</a>
                      </>
                    ) : null}
                  </p>
                ) : null}

                <Button
                  className={`site-form-submit${isWingsGoContactPage ? ' wingsgo-contact-submit' : ''}`}
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
                {isWingsGoContactPage ? (
                  <p className="mt-4 text-sm font-medium text-muted-foreground">
                    {copyLocale === 'en' ? '🛡️ Your information is kept confidential.' : '🛡️ Thông tin của bạn được bảo mật tuyệt đối!'}
                  </p>
                ) : null}
              </form>
            )}
          </FormProvider>
        </div>
      </div>
    </section>
  )
}
