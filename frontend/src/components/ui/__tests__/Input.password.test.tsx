// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import Input from '../Input'

function render(element: React.ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(element)
  })
  return { container, root }
}

describe('Input password visibility toggle', () => {
  it('starts hidden and toggles to visible', async () => {
    const { container } = render(<Input type="password" />)
    const input = container.querySelector('input') as HTMLInputElement
    const button = container.querySelector('button') as HTMLButtonElement
    expect(input?.type).toBe('password')
    expect(button.getAttribute('aria-label')).toMatch(/Mostrar senha/)
    act(() => {
      button.click()
    })
    expect(input?.type).toBe('text')
    expect(button.getAttribute('aria-label')).toMatch(/Ocultar senha/)
  })
})
