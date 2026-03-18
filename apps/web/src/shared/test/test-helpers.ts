import { type ReactNode, act } from "react"
import { type Root, createRoot } from "react-dom/client"
;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

export function createContainer() {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)

  return {
    container,
    root,
    cleanup() {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

export async function renderInto(root: Root, element: ReactNode) {
  await act(async () => {
    root.render(element)
  })
}

export async function flushPromises() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

export async function runInAct(run: () => void) {
  await act(async () => {
    run()
  })
}

export async function changeValue(element: HTMLInputElement | HTMLSelectElement, value: string) {
  await act(async () => {
    const prototype =
      element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value")
    descriptor?.set?.call(element, value)
    element.dispatchEvent(new Event("input", { bubbles: true }))
    element.dispatchEvent(new Event("change", { bubbles: true }))
  })
}

export async function pressKey(element: HTMLElement, key: string) {
  await act(async () => {
    element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }))
  })
}

export async function click(element: HTMLElement) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })
}
