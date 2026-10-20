'use client'

import { useRef } from 'react'

/**
 * Editar está dentro del formulario. Si el clic desmonta ese botón
 * en el mismo evento, el navegador envía el form y el registro se guarda solo.
 * El modo cambia al terminar el clic, y un submit de ese instante se ignora.
 */
export function useEditClick(setMode: (mode: 'edit') => void) {
  const blockSubmit = useRef(false)

  function onEditMouseDown(event: { preventDefault: () => void }) {
    event.preventDefault()
  }

  function onEditClick(event: { preventDefault: () => void; stopPropagation: () => void }) {
    event.preventDefault()
    event.stopPropagation()
    blockSubmit.current = true
    window.setTimeout(() => {
      setMode('edit')
      window.setTimeout(() => {
        blockSubmit.current = false
      }, 50)
    }, 0)
  }

  function blockAccidentalSubmit(event: { preventDefault: () => void }) {
    if (!blockSubmit.current) return false
    event.preventDefault()
    return true
  }

  return { onEditMouseDown, onEditClick, blockAccidentalSubmit }
}
