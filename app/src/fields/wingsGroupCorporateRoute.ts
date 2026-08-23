import type { Field } from 'payload'

export const wingsGroupCorporateRouteField: Field = {
  name: 'wingsGroupRoute',
  label: 'WingsGroup corporate route governance',
  type: 'group',
  admin: {
    description:
      'Fail-closed publication contract for the ten E09 WingsGroup routes. Approval fields are operator controlled.',
    position: 'sidebar',
  },
  fields: [
    {
      name: 'managedBy',
      label: 'Contract',
      type: 'select',
      options: [{ label: 'WingsGroup v3', value: 'wingsgroup-v3' }],
    },
    {
      name: 'archetype',
      label: 'Route archetype',
      type: 'select',
      options: [
        { label: 'Home', value: 'home' },
        { label: 'Corporate', value: 'corporate' },
        { label: 'Ecosystem', value: 'ecosystem' },
        { label: 'Capability', value: 'capability' },
        { label: 'Trust', value: 'trust' },
        { label: 'Editorial', value: 'editorial' },
        { label: 'Contact', value: 'contact' },
        { label: 'Policy', value: 'policy' },
      ],
    },
    {
      name: 'publication',
      label: 'Localized publication gates',
      type: 'group',
      fields: [
        {
          name: 'vi',
          label: 'Vietnamese',
          type: 'select',
          defaultValue: 'hidden',
          options: ['hidden', 'pending', 'approved'],
        },
        {
          name: 'en',
          label: 'English',
          type: 'select',
          defaultValue: 'hidden',
          options: ['hidden', 'pending', 'approved'],
        },
      ],
    },
    {
      name: 'contentApproval',
      label: 'Server content approval markers',
      type: 'group',
      admin: {
        hidden: true,
      },
      fields: [
        { name: 'vi', type: 'text', admin: { readOnly: true } },
        { name: 'en', type: 'text', admin: { readOnly: true } },
      ],
    },
    {
      name: 'policy',
      label: 'Policy approval',
      type: 'group',
      admin: {
        condition: (_data, siblingData) => siblingData?.archetype === 'policy',
        description:
          'Policy remains non-public until every field is present and approval state is approved.',
      },
      fields: [
        { name: 'legalOwner', label: 'Legal owner', type: 'text' },
        { name: 'legalEntity', label: 'Legal entity', type: 'text' },
        { name: 'scope', label: 'Policy scope', type: 'textarea' },
        { name: 'effectiveDate', label: 'Effective date', type: 'date' },
        { name: 'version', label: 'Version', type: 'text' },
        {
          name: 'retentionMonths',
          label: 'Lead retention (months)',
          type: 'number',
          min: 24,
          max: 24,
        },
        { name: 'dataSubjectContact', label: 'Data-subject contact', type: 'email' },
        {
          name: 'dataSubjectRightsStatement',
          label: 'Approved data-subject rights statement',
          type: 'textarea',
          admin: {
            description: 'Must be supplied by the legal owner; do not generate policy rights copy.',
          },
        },
        {
          name: 'dataSubjectRightsEvidence',
          label: 'Data-subject rights evidence',
          type: 'text',
        },
        { name: 'policyVersion', label: 'Privacy policy context version', type: 'text' },
        { name: 'consentVersion', label: 'Consent context version', type: 'text' },
        {
          name: 'consentEvidenceReference',
          label: 'Consent context evidence',
          type: 'text',
        },
        {
          name: 'privacyApprovalReference',
          label: 'Trusted privacy approval evidence',
          type: 'text',
        },
        {
          name: 'validationMarker',
          label: 'Server policy validation marker',
          type: 'text',
          admin: {
            hidden: true,
            readOnly: true,
          },
        },
        {
          name: 'approvalState',
          label: 'Approval state',
          type: 'select',
          defaultValue: 'pending',
          options: ['pending', 'approved', 'rejected'],
        },
        { name: 'approvalReference', label: 'Approval evidence/reference', type: 'text' },
      ],
    },
  ],
}
