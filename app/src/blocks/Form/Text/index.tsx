import type { TextField } from '@payloadcms/plugin-form-builder/types'
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import React from 'react'

import { Error } from '../Error'
import { Width } from '../Width'

export const Text: React.FC<
  TextField & {
    errors: Partial<FieldErrorsImpl>
    formID?: number | string
    register: UseFormRegister<FieldValues>
    phonePattern?: RegExp
    requiredLabel?: string
    requiredMessage?: string
    phoneMessage?: string
  }
> = ({
  name,
  defaultValue,
  errors,
  formID,
  label,
  register,
  phonePattern,
  required,
  requiredLabel = 'required',
  requiredMessage = 'This field is required',
  phoneMessage = 'Enter a valid phone number',
  width,
}) => {
  const fieldID = formID
    ? `${String(formID).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}-${name
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')}`
    : name
  const errorID = `${fieldID}-error`
  const isPhoneField = /(^|[-_])phone$|^tel$/i.test(name)
  const resolvedPhonePattern = phonePattern || /^\+?[0-9\s().-]{8,20}$/u
  const isDepartureDateField = name === 'departure-date'
  const autoComplete = isPhoneField
    ? 'tel'
    : /full[-_]?name|^name$/i.test(name)
      ? 'name'
      : /company|organisation|organization/i.test(name)
        ? 'organization'
        : undefined

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
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        id={fieldID}
        inputMode={isPhoneField ? 'tel' : undefined}
        pattern={isPhoneField ? resolvedPhonePattern.source : undefined}
        required={Boolean(required)}
        type={isDepartureDateField ? 'date' : isPhoneField ? 'tel' : 'text'}
        {...register(name, {
          pattern: isPhoneField
            ? { message: phoneMessage, value: resolvedPhonePattern }
            : undefined,
          required: required ? requiredMessage : false,
        })}
      />
      {errors[name] && <Error id={errorID} name={name} />}
    </Width>
  )
}
