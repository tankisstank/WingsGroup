const defaultInquiryContactPath = '/lien-he'

export const siteInquiryContactPaths: Record<string, string> = {
  'wings-care': '/contact',
  'wings-go': '/lien-he',
  'wings-group': '/lien-he',
  'wings-pass': '/contact',
  'wings-plus': '/request-proposal',
  'wings-side': '/contact-us',
}

export const resolveSiteInquiryContactPath = (siteCode?: null | string): string =>
  (siteCode && siteInquiryContactPaths[siteCode]) || defaultInquiryContactPath
