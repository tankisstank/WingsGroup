export type TourAuthoringIssue = {
  code: string
  message: string
  severity: 'error' | 'info' | 'warning'
}

export type TourAuthoringReadiness = {
  canPublish: boolean
  departures: Array<{ id: number | string; status?: string | null; updatedAt: string }>
  issues: TourAuthoringIssue[]
  product: { id: number | string; site?: number | string; status?: string | null; updatedAt: string }
  revision: string
  wrapper: { id: number | string; path?: string | null; status?: string | null } | null
}

export type TourAuthoringAction = 'provision' | 'publish'

export type TourAuthoringActionRequest = {
  action: TourAuthoringAction
  departureIDs?: Array<number | string>
  locale: string
  revision?: string
}
