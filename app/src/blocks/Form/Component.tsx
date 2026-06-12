'use client'
import type { FormFieldBlock, Form as FormType } from '@payloadcms/plugin-form-builder/types'

import { usePathname, useRouter } from 'next/navigation'
import React, { useCallback, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import RichText from '@/components/RichText'
import { Button } from '@/components/ui/button'
import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'
import { BadgeCheckIcon, ClockIcon, HeadphonesIcon, SendIcon } from 'lucide-react'

import { fields } from './fields'
import { getClientSideURL } from '@/utilities/getURL'
import { getLocaleFromPathname } from '@/utilities/sitePaths'

export type FormBlockType = {
  blockName?: string
  blockType?: 'formBlock'
  enableIntro: boolean
  form: FormType
  introContent?: DefaultTypedEditorState
}

const formCopy = {
  en: {
    asideLabel: 'Consultation support information',
    asideTitle: 'Send a request, receive the right consultation',
    asideDescription:
      'The WingsTravel team will review the timing, budget, destination, and service context before recommending the right next step.',
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
      'The WingsPlus team will review the private or MICE brief and respond with a suitable proposal direction.',
    successTitle: 'Brief received',
  },
  vi: {
    asideLabel: 'Thông tin hỗ trợ tư vấn',
    asideTitle: 'Gửi yêu cầu, nhận tư vấn đúng nhu cầu',
    asideDescription:
      'Team WingsTravel sẽ kiểm tra lịch, ngân sách, điểm đến và phản hồi phương án phù hợp để khách không phải tự lọc quá nhiều thông tin.',
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

const getFieldName = (field: FormFieldBlock) =>
  'name' in field && typeof field.name === 'string' ? field.name : null

export const FormBlock: React.FC<
  {
    id?: string
  } & FormBlockType
> = (props) => {
  const {
    enableIntro,
    form: formFromProps,
    form: { id: formID, confirmationMessage, confirmationType, redirect, submitButtonLabel } = {},
    introContent,
  } = props

  const pathname = usePathname()
  const locale = getLocaleFromPathname(pathname) || 'vi'
  const copy = formCopy[locale]
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
    defaultValues: formFromProps.fields,
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
  const router = useRouter()

  const onSubmit = useCallback(
    (data: FormFieldBlock[]) => {
      let loadingTimerID: ReturnType<typeof setTimeout>
      const submitForm = async () => {
        setError(undefined)

        const dataToSend = Object.entries(data).map(([name, value]) => ({
          field: name,
          value,
        }))

        // delay loading indicator by 1s
        loadingTimerID = setTimeout(() => {
          setIsLoading(true)
        }, 1000)

        try {
          const req = await fetch(`${getClientSideURL()}/api/form-submissions`, {
            body: JSON.stringify({
              form: formID,
              submissionData: dataToSend,
            }),
            headers: {
              'Content-Type': 'application/json',
            },
            method: 'POST',
          })

          const res = await req.json()

          clearTimeout(loadingTimerID)

          if (req.status >= 400) {
            setIsLoading(false)

            setError({
              message: res.errors?.[0]?.message || 'Internal Server Error',
              status: res.status,
            })

            return
          }

          setIsLoading(false)
          setHasSubmitted(true)

          if (confirmationType === 'redirect' && redirect) {
            const { url } = redirect

            const redirectUrl = url

            if (redirectUrl) router.push(redirectUrl)
          }
        } catch (err) {
          console.warn(err)
          setIsLoading(false)
          setError({
            message: locale === 'en' ? 'Something went wrong.' : 'Đã có lỗi xảy ra.',
          })
        }
      }

      void submitForm()
    },
    [router, formID, redirect, confirmationType, locale],
  )

  return (
    <section className="container theme-section">
      <div className="site-lead-form-shell">
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
            <div className="site-form-state site-form-state--success">
              <BadgeCheckIcon aria-hidden="true" className="h-5 w-5" />
              {locale === 'en' ? (
                <div>
                  <h2>{copy.successTitle}</h2>
                  <p>{copy.successDescription}</p>
                </div>
              ) : (
                <RichText data={confirmationMessage} />
              )}
            </div>
          )}
          {isLoading && !hasSubmitted && <p className="site-form-state">{copy.loading}</p>}
          {error && <div className="site-form-state site-form-state--error">{`${error.status || '500'}: ${error.message || ''}`}</div>}
          {!hasSubmitted && (
            <form id={formID} onSubmit={handleSubmit(onSubmit)}>
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

              <Button className="site-form-submit" form={formID} type="submit" variant="default">
                {locale === 'en' ? copy.submit : submitButtonLabel}
              </Button>
            </form>
          )}
        </FormProvider>
        </div>
      </div>
    </section>
  )
}
