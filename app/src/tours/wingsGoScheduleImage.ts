/**
 * An SSR image can fail before React hydrates, in which case `onError` never fires.
 * Use as a ref callback: reports images that already finished loading without pixels.
 * `currentSrc` is set only by real browsers once a fetch settled, so jsdom is unaffected.
 */
export const detectFailedImage =
  (onFailed: () => void) =>
  (element: HTMLImageElement | null): void => {
    if (element && element.complete && element.currentSrc && element.naturalWidth === 0) {
      onFailed()
    }
  }
