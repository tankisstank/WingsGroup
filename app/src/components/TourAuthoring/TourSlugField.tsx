'use client'

import { FieldError, FieldLabel, useField } from '@payloadcms/ui'

type Props = {
  field?: {
    admin?: { description?: string }
    label?: string
    required?: boolean
  }
  path: string
  readOnly?: boolean
}

export const normalizeTourSlugInput = (value: string) => value.toLowerCase()

export default function TourSlugField({ field, path, readOnly }: Props) {
  const { errorMessage, setValue, showError, value } = useField<string>({ path })
  const label = field?.label || 'Đường dẫn tour'
  const currentValue = typeof value === 'string' ? value : ''

  return (
    <div id={`field-${path}`}>
      <FieldLabel htmlFor={path} label={label} path={path} required={field?.required} />
      <input
        aria-invalid={showError || undefined}
        autoComplete="off"
        id={path}
        onChange={(event) => setValue(normalizeTourSlugInput(event.currentTarget.value))}
        readOnly={readOnly}
        spellCheck={false}
        value={currentValue}
      />
      <p style={{ margin: '0.35rem 0 0', color: 'var(--theme-elevation-600)', fontSize: '0.8rem' }}>
        {field?.admin?.description || 'Slug được chuẩn hóa chữ thường ngay khi nhập và render tại /tour/<slug>.'}
      </p>
      <FieldError message={errorMessage} path={path} showError={showError} />
    </div>
  )
}
