import 'dotenv/config'

import { createLocalReq, getPayload } from 'payload'

import {
  removeAirlineMarkers,
  trimSourceUiTail,
  type NormalizedItineraryDay,
} from './lib/doicanhviet'
import config from '../src/payload.config'

const context = { disableRevalidate: true, import: true }

const normalizeComparableText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim()

const placeholderPatterns = [
  /^dang cap nhat$/iu,
  /^theo line ban$/iu,
  /^route fallback$/iu,
  /^khach retail can route ro$/iu,
  /^can bang tham quan, nghi va thoi gian tu do$/iu,
]

const isPlaceholder = (value: unknown) => {
  const text = String(value || '').trim()
  if (!text) return true
  const comparable = normalizeComparableText(text)

  return placeholderPatterns.some((pattern) => pattern.test(comparable))
}

const cleanOptional = (value: unknown) => {
  const text = trimSourceUiTail(String(value || ''))
  return isPlaceholder(text) ? undefined : text
}

const cleanAccommodation = (value: unknown) => {
  const text = cleanOptional(value)
  if (!text) return undefined
  if (/trả phòng|dùng bữa sáng/iu.test(text) && !/nghỉ đêm|nhận phòng|lưu trú/iu.test(text)) {
    return undefined
  }

  return text
}

const cleanDay = (day: Record<string, unknown>): NormalizedItineraryDay => ({
  ...day,
  accommodation: cleanAccommodation(day.accommodation),
  notes: cleanOptional(day.notes),
  route: cleanOptional(day.route) || String(day.title || ''),
  summary: cleanOptional(day.summary) || '',
  title: cleanOptional(day.title) || '',
  transport: cleanOptional(day.transport),
  dayNumber: Number(day.dayNumber || 0),
  meals: cleanOptional(day.meals),
})

const main = async () => {
  const payload = await getPayload({ config })
  const adminEmail = process.env.IMPORT_ADMIN_EMAIL || 'local-admin@wingsgroup.test'
  const admin = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: adminEmail } },
  })
  if (!admin.docs[0]) throw new Error(`Admin user not found: ${adminEmail}`)
  const req = await createLocalReq({ user: admin.docs[0] }, payload)

  const products = await payload.find({
    collection: 'tour-products',
    depth: 0,
    limit: 200,
    overrideAccess: true,
    req,
    where: { tourCode: { like: 'DCV-' } },
  })

  let productsUpdated = 0
  for (const product of products.docs as Array<Record<string, any>>) {
    const itineraryDays = Array.isArray(product.itineraryDays) ? product.itineraryDays : []
    const cleanedDays = itineraryDays.map(cleanDay)
    const summary = cleanOptional(product.summary) || product.summary
    const servicesSummary = product.servicesSummary
      ? {
          ...product.servicesSummary,
          hotelSummary: cleanOptional(product.servicesSummary.hotelSummary),
          mealsSummary: cleanOptional(product.servicesSummary.mealsSummary),
          transportSummary: cleanOptional(product.servicesSummary.transportSummary),
        }
      : product.servicesSummary

    await payload.update({
      collection: 'tour-products',
      context,
      data: {
        itineraryDays: cleanedDays,
        servicesSummary,
        summary,
      } as never,
      id: product.id,
      overrideAccess: true,
      req,
    })
    productsUpdated += 1
  }

  const media = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 500,
    overrideAccess: true,
    req,
    where: { filename: { like: 'dcv-' } },
  })

  let mediaUpdated = 0
  for (const item of media.docs as Array<Record<string, any>>) {
    const alt = removeAirlineMarkers(String(item.alt || ''))
    if (!alt || alt === item.alt) continue

    await payload.update({
      collection: 'media',
      context,
      data: { alt } as never,
      id: item.id,
      overrideAccess: true,
      req,
    })
    mediaUpdated += 1
  }

  console.log(JSON.stringify({ mediaUpdated, productsUpdated }, null, 2))
  await payload.destroy()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
