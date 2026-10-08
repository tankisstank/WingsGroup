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

import { vietnameseSlugify } from '@/utilities/slugify'

export const normalizeTourSlugInput = (value: string) => {
  return value
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
}

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
        onBlur={() => setValue(vietnameseSlugify(currentValue))}
        onChange={(event) => setValue(normalizeTourSlugInput(event.currentTarget.value))}
        readOnly={readOnly}
        spellCheck={false}
        value={currentValue}
      />
      <p style={{ margin: '0.35rem 0 0', color: 'var(--theme-elevation-600)', fontSize: '0.8rem' }}>
        {field?.admin?.description || 'Slug được chuẩn hóa chữ thường Latin không dấu ngay khi nhập và render tại /tour/<slug>.'}
      </p>
      <FieldError message={errorMessage} path={path} showError={showError} />
    </div>
  )
}
