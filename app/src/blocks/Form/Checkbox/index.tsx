import type { CheckboxField } from '@payloadcms/plugin-form-builder/types'
import type { Control, FieldErrorsImpl } from 'react-hook-form'

import { Controller } from 'react-hook-form'

import { Checkbox as CheckboxUi } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import React from 'react'

import { Error } from '../Error'
import { Width } from '../Width'

export const Checkbox: React.FC<
  CheckboxField & {
    control: Control
    errors: Partial<FieldErrorsImpl>
    formID?: number | string
    requiredLabel?: string
    requiredMessage?: string
  }
> = ({
  name,
  control,
  defaultValue,
  errors,
  formID,
  label,
  required,
  requiredLabel = 'required',
  requiredMessage = 'This field is required',
  width,
}) => {
  const fieldID = formID
    ? `${String(formID).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}-${name
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')}`
    : name
  const errorID = `${fieldID}-error`

  return (
    <Width width={width}>
      <div className="flex items-center gap-2">
        <Controller
          control={control}
          defaultValue={Boolean(defaultValue)}
          name={name}
          render={({ field: { onBlur, onChange, value } }) => (
            <CheckboxUi
              aria-describedby={errors[name] ? errorID : undefined}
              aria-invalid={Boolean(errors[name])}
              checked={Boolean(value)}
              id={fieldID}
              name={name}
              onBlur={onBlur}
              onCheckedChange={(checked) => onChange(checked === true)}
            />
          )}
          rules={{
            validate: (value) => !required || value === true || requiredMessage,
          }}
        />
        <Label htmlFor={fieldID}>
          {required && (
            <span className="required">
              * <span className="sr-only">({requiredLabel})</span>
            </span>
          )}
          {label}
        </Label>
      </div>
      {errors[name] && <Error id={errorID} name={name} />}
    </Width>
  )
}
