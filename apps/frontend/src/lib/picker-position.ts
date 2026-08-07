export type PickerPosition = {
  left: number
  top: number
  width: number
}

const pickerGutter = 8
const pickerWidth = 360

export function getPickerPosition(
  element: HTMLElement | null,
  mode: "absolute" | "fixed" = "absolute",
): PickerPosition | null {
  if (!element) {
    return null
  }

  const viewportWidth = window.innerWidth
  const width = Math.min(pickerWidth, Math.max(0, viewportWidth - pickerGutter * 2))
  const maxLeft = Math.max(pickerGutter, viewportWidth - width - pickerGutter)
  const container = element.getBoundingClientRect()

  return {
    left:
      mode === "fixed"
        ? Math.min(Math.max(pickerGutter, container.left), maxLeft)
        : Math.min(Math.max(pickerGutter, container.left), maxLeft) - container.left,
    top: mode === "fixed" ? container.bottom + pickerGutter : container.height + pickerGutter,
    width,
  }
}
