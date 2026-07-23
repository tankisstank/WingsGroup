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
    register: UseFormRegister<FieldValues>
  }
> = ({ name, defaultValue, errors, label, register, required, width }) => {
  const isPhoneField = /(^|[-_])phone$|^tel$/i.test(name)
  const autoComplete = isPhoneField
    ? 'tel'
    : /full[-_]?name|^name$/i.test(name)
      ? 'name'
      : /company|organisation|organization/i.test(name)
        ? 'organization'
        : undefined

  return (
    <Width width={width}>
      <Label htmlFor={name}>
        {label}

        {required && (
          <span className="required">
            * <span className="sr-only">(required)</span>
          </span>
        )}
      </Label>
      <Input
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        aria-invalid={Boolean(errors[name])}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        id={name}
        inputMode={isPhoneField ? 'tel' : undefined}
        type={isPhoneField ? 'tel' : 'text'}
        {...register(name, { required })}
      />
      {errors[name] && <Error name={name} />}
    </Width>
  )
}
