'use client'

import React, { useId } from 'react'
import { FieldError, FieldLabel, useField } from '@payloadcms/ui'

import './index.scss'

type Props = {
  field?: {
    admin?: {
      description?: string
    }
    label?: string
    required?: boolean
  }
  path: string
}

const fallbackColor = '#000000'
const hexPattern = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

const toPickerValue = (value?: unknown) => {
  const stringValue = typeof value === 'string' ? value : ''

  if (/^#[0-9a-fA-F]{6}$/.test(stringValue)) {
    return stringValue
  }

  if (/^#[0-9a-fA-F]{3}$/.test(stringValue)) {
    const [, r, g, b] = stringValue
    return `#${r}${r}${g}${g}${b}${b}`
  }

  return fallbackColor
}

export default function ThemeColorField({ field, path }: Props) {
  const id = useId()
  const { errorMessage, setValue, showError, value } = useField<string>({ path })
  const currentValue = typeof value === 'string' ? value : ''
  const description = field?.admin?.description || 'Chọn màu bằng UI hoặc nhập mã hex.'

  return (
    <div className="theme-preset-color-field">
      <FieldLabel htmlFor={id} label={field?.label} path={path} required={field?.required} />
      <div className="theme-preset-color-field__control">
        <input
          aria-label={`${field?.label || path} picker`}
          className="theme-preset-color-field__picker"
          onChange={(event) => setValue(event.target.value.toUpperCase())}
          type="color"
          value={toPickerValue(currentValue)}
        />
        <input
          aria-invalid={showError || undefined}
          className="theme-preset-color-field__text"
          id={id}
          onChange={(event) => setValue(event.target.value.trim())}
          placeholder="#0F766E"
          spellCheck={false}
          value={currentValue}
        />
      </div>
      <p className="theme-preset-color-field__help">
        {description}
        {currentValue && !hexPattern.test(currentValue) ? ' Mã hiện tại chưa hợp lệ.' : ''}
      </p>
      <FieldError message={errorMessage} path={path} showError={showError} />
    </div>
  )
}
