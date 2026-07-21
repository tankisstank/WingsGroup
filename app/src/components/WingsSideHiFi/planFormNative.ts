/** Native value setter compatible with React controlled inputs. */
export const setNativeInputValue = (
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null | undefined,
  value: string,
): boolean => {
  if (!el) return false

  const proto =
    el instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? window.HTMLSelectElement.prototype
        : window.HTMLInputElement.prototype

  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value')
  if (descriptor?.set) {
    descriptor.set.call(el, value)
  } else {
    el.value = value
  }

  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  return true
}

export const queryPlanFormField = (
  name: string,
  root: ParentNode = document,
): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null =>
  root.querySelector(`.ws-hifi-plan-form [name="${name}"]`)
