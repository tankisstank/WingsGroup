'use client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchIcon } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { useDebounce } from '@/utilities/useDebounce'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSitePath } from '@/utilities/useSitePath'
import { useSitePublicLocale } from '@/providers/SitePath'
import { getSearchCopy, searchInputCopy } from '@/i18n/searchCopy'

export const Search: React.FC = () => {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const [value, setValue] = useState(query)
  const hasUserEdited = useRef(false)
  const router = useRouter()
  const getSitePath = useSitePath()
  const locale = useSitePublicLocale()
  const copy = getSearchCopy(searchInputCopy, locale)

  const debouncedValue = useDebounce(value)

  useEffect(() => {
    hasUserEdited.current = false
    setValue(query)
  }, [query])

  useEffect(() => {
    if (!hasUserEdited.current || debouncedValue === query) {
      return
    }

    router.replace(getSitePath(`/search${debouncedValue ? `?q=${debouncedValue}` : ''}`))
  }, [debouncedValue, getSitePath, query, router])

  return (
    <div className="site-search-box">
      <form
        className="site-search-box__form"
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <Label htmlFor="search" className="sr-only">
          {copy.label}
        </Label>
        <SearchIcon aria-hidden="true" className="site-search-box__icon h-5 w-5" />
        <Input
          className="site-search-box__input"
          id="search"
          onChange={(event) => {
            hasUserEdited.current = true
            setValue(event.target.value)
          }}
          placeholder={copy.placeholder}
          value={value}
        />
        <button type="submit" className="sr-only">
          {copy.submit}
        </button>
      </form>
    </div>
  )
}
