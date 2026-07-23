/**
 * Normaliza un texto convirtiéndolo a mayúsculas y eliminando tildes/diacríticos.
 * Según las convenciones del proyecto, todos los textos ingresados por el usuario
 * deben pasar por esta función para asegurar consistencia en búsquedas.
 * 
 * @param text El texto a normalizar
 * @returns El texto en mayúsculas y sin tildes, o cadena vacía si es null/undefined
 */
export function normalizeText(text?: string | null): string {
  if (!text) return '';
  return text
    .normalize('NFD') // Descompone caracteres con tildes en el caracter y la tilde
    .replace(/[\u0300-\u036f]/g, '') // Elimina las tildes
    .toUpperCase(); // Convierte a mayúsculas
}
