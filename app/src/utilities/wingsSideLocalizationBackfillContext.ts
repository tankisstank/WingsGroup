export const WINGSSIDE_LOCALIZATION_BACKFILL_CONTEXT_KEY = 'wingsSideLocalizationBackfill'
export const WINGSSIDE_LOCALIZATION_BACKFILL_CONTEXT_VALUE = 'wingsside-localization-backfill'

export const wingsSideLocalizationBackfillContext = {
  disableRevalidate: true,
  [WINGSSIDE_LOCALIZATION_BACKFILL_CONTEXT_KEY]:
    WINGSSIDE_LOCALIZATION_BACKFILL_CONTEXT_VALUE,
} as const

export const hasWingsSideLocalizationBackfillContext = (
  context: Record<string, unknown> | undefined,
): boolean =>
  context?.[WINGSSIDE_LOCALIZATION_BACKFILL_CONTEXT_KEY] ===
  WINGSSIDE_LOCALIZATION_BACKFILL_CONTEXT_VALUE
