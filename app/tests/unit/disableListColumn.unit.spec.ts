import type { Field } from 'payload'
import { describe, expect, it } from 'vitest'
import { disableListColumnRecursively } from '@/utilities/disableListColumn'

describe('disableListColumnRecursively', () => {
  it('adds disableListColumn and disableListFilter to simple fields while preserving existing admin props', () => {
    const input: Field = {
      name: 'testText',
      type: 'text',
      label: 'Test Text',
      required: true,
      admin: {
        description: 'Existing description',
        readOnly: true,
      },
    }

    const output = disableListColumnRecursively(input)

    expect(output.name).toBe('testText')
    expect(output.type).toBe('text')
    expect((output as any).required).toBe(true)
    expect(output.admin?.description).toBe('Existing description')
    expect(output.admin?.readOnly).toBe(true)
    expect(output.admin?.disableListColumn).toBe(true)
    expect(output.admin?.disableListFilter).toBe(true)
  })

  it('recursively processes nested fields in group fields', () => {
    const input: Field = {
      name: 'corporateGroup',
      type: 'group',
      fields: [
        {
          name: 'innerField1',
          type: 'text',
        },
        {
          name: 'innerField2',
          type: 'number',
        },
      ],
    }

    const output = disableListColumnRecursively(input)

    expect((output.admin as any)?.disableListColumn).toBe(true)
    expect((output.admin as any)?.disableListFilter).toBe(true)

    const nestedFields = (output as any).fields as Field[]
    expect(nestedFields).toHaveLength(2)
    expect((nestedFields[0].admin as any)?.disableListColumn).toBe(true)
    expect((nestedFields[0].admin as any)?.disableListFilter).toBe(true)
    expect((nestedFields[1].admin as any)?.disableListColumn).toBe(true)
    expect((nestedFields[1].admin as any)?.disableListFilter).toBe(true)
  })

  it('recursively processes tabs and blocks', () => {
    const input: Field = {
      type: 'tabs',
      tabs: [
        {
          label: 'Tab 1',
          fields: [
            {
              name: 'subFieldInTab',
              type: 'text',
            },
          ],
        },
      ],
    }

    const output = disableListColumnRecursively(input)
    expect(output.admin?.disableListColumn).toBe(true)

    const tab = (output as any).tabs[0]
    expect(tab.admin?.disableListColumn).toBe(true)
    expect(tab.fields[0].admin?.disableListColumn).toBe(true)
    expect(tab.fields[0].admin?.disableListFilter).toBe(true)
  })

  it('handles an array of fields', () => {
    const input: Field[] = [
      { name: 'fieldA', type: 'text' },
      { name: 'fieldB', type: 'text' },
    ]

    const output = disableListColumnRecursively(input)
    expect(output).toHaveLength(2)
    expect(output[0].admin?.disableListColumn).toBe(true)
    expect(output[1].admin?.disableListColumn).toBe(true)
  })
})
