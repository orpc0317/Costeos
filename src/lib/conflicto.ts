export function esConflicto(error: string | null | undefined) {
  return !!error && error.includes('modificado por otro usuario')
}
