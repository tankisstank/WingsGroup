'use client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchIcon } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { useDebounce } from '@/utilities/useDebounce'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSitePath } from '@/utilities/useSitePath'
import { getLocaleFromPathname } from '@/utilities/sitePaths'

export const Search: React.FC = () => {
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get('q') || '')
  const router = useRouter()
  const getSitePath = useSitePath()
  const pathname = usePathname()
  const locale = getLocaleFromPathname(pathname) || 'vi'
  const copy =
    locale === 'en'
      ? {
          label: 'Search',
          placeholder: 'Search tours, destinations, campaigns...',
          submit: 'Submit search',
        }
      : {
          label: 'Tìm kiếm',
          placeholder: 'Tìm tour, điểm đến, chiến dịch...',
          submit: 'Gửi tìm kiếm',
        }

  const debouncedValue = useDebounce(value)

  useEffect(() => {
    router.push(getSitePath(`/search${debouncedValue ? `?q=${debouncedValue}` : ''}`))
  }, [debouncedValue, getSitePath, router])

  return (
    <div className="site-search-box">
      <form
        className="site-search-box__form"
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <Label htmlFor="search" className="sr-only">{copy.label}</Label>
        <SearchIcon aria-hidden="true" className="site-search-box__icon h-5 w-5" />
        <Input
          className="site-search-box__input"
          id="search"
          onChange={(event) => {
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
