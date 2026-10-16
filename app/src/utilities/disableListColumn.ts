import type { Field } from 'payload'

/**
 * Recursively adds `admin: { disableListColumn: true, disableListFilter: true }`
 * to a list of Payload fields and nested field structures (group, array, tabs, blocks, row, collapsibles).
 * Prevents complex document sub-fields from bloating the collection's Column Selector and List Filters.
 */
export const disableListColumnRecursively = <T extends Field | Field[]>(input: T): T => {
  if (Array.isArray(input)) {
    return input.map((f) => disableListColumnRecursively(f)) as unknown as T
  }

  const field = input as Field
  const updated = {
    ...field,
    admin: {
      ...('admin' in field && field.admin ? field.admin : {}),
      disableListColumn: true,
      disableListFilter: true,
    },
  } as Field

  if ('fields' in field && Array.isArray(field.fields)) {
    ;(updated as { fields: Field[] }).fields = disableListColumnRecursively(field.fields)
  }

  if ('tabs' in field && Array.isArray(field.tabs)) {
    ;(updated as { tabs: unknown[] }).tabs = field.tabs.map((tab) => ({
      ...tab,
      admin: {
        ...(tab.admin || {}),
        disableListColumn: true,
        disableListFilter: true,
      },
      fields: disableListColumnRecursively(tab.fields || []),
    }))
  }

  if ('blocks' in field && Array.isArray(field.blocks)) {
    ;(updated as { blocks: unknown[] }).blocks = field.blocks.map((block) => ({
      ...block,
      fields: disableListColumnRecursively(block.fields || []),
    }))
  }

  return updated as T
}
