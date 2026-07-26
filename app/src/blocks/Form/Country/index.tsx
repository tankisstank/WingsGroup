import type { CountryField } from '@payloadcms/plugin-form-builder/types'
import type { Control, FieldErrorsImpl } from 'react-hook-form'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import React from 'react'
import { Controller } from 'react-hook-form'

import { Error } from '../Error'
import { Width } from '../Width'
import { countryOptions } from './options'

export const Country: React.FC<
  CountryField & {
    control: Control
    errors: Partial<FieldErrorsImpl>
    formID?: number | string
    requiredLabel?: string
    requiredMessage?: string
  }
> = ({
  name,
  control,
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
      <Label className="" htmlFor={fieldID}>
        {label}

        {required && (
          <span className="required">
            * <span className="sr-only">({requiredLabel})</span>
          </span>
        )}
      </Label>
      <Controller
        control={control}
        defaultValue=""
        name={name}
        render={({ field: { onChange, value } }) => {
          const controlledValue = countryOptions.find((t) => t.value === value)

          return (
            <Select onValueChange={(val) => onChange(val)} value={controlledValue?.value ?? ''}>
              <SelectTrigger
                aria-describedby={errors[name] ? errorID : undefined}
                aria-invalid={Boolean(errors[name])}
                aria-required={required || undefined}
                className="w-full"
                id={fieldID}
              >
                <SelectValue placeholder={label} />
              </SelectTrigger>
              <SelectContent>
                {countryOptions.map(({ label, value }) => {
                  return (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          )
        }}
        rules={{ required: required ? requiredMessage : false }}
      />
      {errors[name] && <Error id={errorID} name={name} />}
    </Width>
  )
}
