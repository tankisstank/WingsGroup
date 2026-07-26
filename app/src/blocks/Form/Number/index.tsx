import type { TextField } from '@payloadcms/plugin-form-builder/types'
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import React from 'react'

import { Error } from '../Error'
import { Width } from '../Width'
export const Number: React.FC<
  TextField & {
    errors: Partial<FieldErrorsImpl>
    formID?: number | string
    register: UseFormRegister<FieldValues>
    requiredLabel?: string
    requiredMessage?: string
  }
> = ({
  name,
  defaultValue,
  errors,
  formID,
  label,
  register,
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
      <Label htmlFor={fieldID}>
        {label}

        {required && (
          <span className="required">
            * <span className="sr-only">({requiredLabel})</span>
          </span>
        )}
      </Label>
      <Input
        aria-describedby={errors[name] ? errorID : undefined}
        aria-invalid={Boolean(errors[name])}
        aria-required={required || undefined}
        defaultValue={defaultValue}
        id={fieldID}
        type="number"
        {...register(name, { required: required ? requiredMessage : false })}
      />
      {errors[name] && <Error id={errorID} name={name} />}
    </Width>
  )
}
