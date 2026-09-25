export type TourAuthoringIssue = {
  code: string
  message: string
  severity: 'error' | 'info' | 'warning'
}

export type TourAuthoringReadiness = {
  canPublish: boolean
  departures: Array<{ id: number | string; status?: string | null; updatedAt: string }>
  issues: TourAuthoringIssue[]
  product: { id: number | string; site?: number | string; slug?: string | null; expectedPath?: string | null; hasHeroMedia?: boolean; status?: string | null; updatedAt: string }
  revision: string
  wrapper: TourAuthoringWrapper | null
  wrapperCandidates: TourAuthoringWrapper[]
}

export type TourAuthoringWrapper = {
  id: number | string
  health?: 'valid' | 'invalid_path' | 'invalid_site' | 'orphan' | 'shared' | null
  linkedProductIDs?: Array<number | string>
  path?: string | null
  site?: number | string | null
  status?: string | null
}

export type TourAuthoringAction = 'provision' | 'relink' | 'publish'

export type TourAuthoringActionRequest = {
  action: TourAuthoringAction
  departureIDs?: Array<number | string>
  locale: string
  revision?: string
  wrapperID?: number | string
}
