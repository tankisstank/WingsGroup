/**
 * A short-lived handoff between the consultation dialog and the contact form.
 *
 * The hash identifies the destination for normal links. This session key is
 * deliberately separate: it asks the receiving page to move keyboard focus to
 * its first field only after client-side navigation has completed.
 */
export const WINGSGROUP_CONTACT_FOCUS_SESSION_KEY = 'wingsgroup-contact-focus'
export const WINGSGROUP_CONTACT_FORM_ANCHOR = 'contact-form'
