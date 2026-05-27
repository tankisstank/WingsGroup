export type AppRole = 'super-admin' | 'site-manager' | 'editor'

export type RelationID = number | string

export type RelationValue =
  | RelationID
  | {
      id: RelationID
    }
  | null
  | undefined

export type AppUser = {
  collection?: string
  id: RelationID
  role?: AppRole
  sites?: RelationValue[]
}
