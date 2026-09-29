// @ts-nocheck — Archivo de plantilla con placeholders intencionales. No es código de producción.
'use client'
/**
 * TEMPLATE — Modal Entidad (copiar y completar antes de escribir código real)
 *
 * INSTRUCCIONES PARA LA IA:
 * 1. Busca y reemplaza TODO "Entidad" / "entidad" / "ENTIDAD" por el nombre real de la entidad.
 * 2. Reemplaza "IconoEntidad" por el ícono canónico definido en el sidebar (tabla §15 de conventions.md).
 * 3. Reemplaza "costeos_tabla" por el nombre exacto de la tabla en MySQL/Prisma.
 * 4. Agrega / elimina tabs y campos según la entidad.
 * 5. Al terminar, ejecuta la PRE-FLIGHT CHECKLIST de AGENTS.md punto a punto.
 *
 * GOLD STANDARD DE REFERENCIA (leer antes de modificar):
 *   src/components/categorias/categoria-modal.tsx
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { FieldError } from '@/components/ui/field-error'
import { IconoEntidad, Save, Pencil, History } from 'lucide-react' // ← cambiar IconoEntidad
import { HistorialDrawer } from '@/components/shared/historial-drawer'
import { crearEntidad, actualizarEntidad } from '@/app/actions/entidades' // ← ajustar import
import { getEmpresasForUser } from '@/app/actions/erp'
import { normalizeText } from '@/lib/utils/text'
import { UI_THEME } from '@/lib/theme'
import type { EntidadInput, EntidadRow } from '@/lib/types/entidades' // ← ajustar import

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface EntidadModalProps {
  entidad?: EntidadRow
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────────
export function EntidadModal({
  entidad,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
}: EntidadModalProps) {
  // ── Estado de apertura (controlado o interno) ──────────────────────────────
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open    = isControlled ? controlledOpen  : internalOpen
  const setOpen = isControlled ? onOpenChange!   : setInternalOpen

  const [historialOpen, setHistorialOpen] = useState(false)

  const isEditing = !!entidad
  const [mode, setMode] = useState<'view' | 'edit'>('view')

  // ── Campos del formulario ─────────────────────────────────────────────────
  const [empresaId, setEmpresaId] = useState('')
  const [nombre, setNombre]       = useState('')
  // TODO: agregar más campos según la entidad

  // ── Datos externos ────────────────────────────────────────────────────────
  const [empresas, setEmpresas]               = useState<{ value: string; label: string }[]>([])
  const [cargandoEmpresas, setCargandoEmpresas] = useState(false)

  // ── UI ────────────────────────────────────────────────────────────────────
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading]         = useState(false)
  const [activeTab, setActiveTab]     = useState('general')

  // ── R20: Mapa campo → pestaña donde vive ese campo ───────────────────────
  // Solo incluir campos que NO estén en 'general'. Los de 'general' no necesitan
  // estar aquí porque irATabConError usa 'general' como fallback.
  // TODO: completar con los campos y tabs reales de esta entidad. Ejemplo:
  //   const CAMPOS_POR_TAB: Record<string, string> = {
  //     precio:      'precios',
  //     moneda:      'precios',
  //     descripcion: 'detalle',
  //   }
  // Si el modal solo tiene la pestaña 'general', dejar el mapa vacío:
  const CAMPOS_POR_TAB: Record<string, string> = {
    // TODO: agregar mapeos campo → tab aquí
  }

  // Navega automáticamente a la pestaña que contiene el campo con error (R20).
  // Llamar en los 3 puntos: validación local, error de campo del server, error de negocio.
  const irATabConError = (campo: string) =>
    setActiveTab(CAMPOS_POR_TAB[campo] ?? 'general')

  // ── Cargar datos externos al abrir — SOLO [open], nunca deps de datos/mode ─
  useEffect(() => {
    if (!open) return

    // ① RESET DEFENSIVO (R22) — solo campos, NUNCA `mode`
    const p = entidad ?? null
    setEmpresaId(p?.empresaId?.toString() ?? '')
    setNombre(p?.nombre ?? '')
    // TODO: resetear más campos
    setFieldErrors({})
    setGlobalError(null)

    // ② Cargar datos externos
    setCargandoEmpresas(true)
    let active = true
    getEmpresasForUser()
      .then(data => {
        if (!active) return
        const opts = data
          .map(e => ({ value: e.id.toString(), label: e.nombre }))
          .sort((a, b) => a.label.localeCompare(b.label))
        setEmpresas(opts)
        // Auto-seleccionar primera empresa solo al crear
        if (!entidad && opts.length > 0) setEmpresaId(prev => prev || opts[0].value)
      })
      .finally(() => { if (active) setCargandoEmpresas(false) })
    return () => { active = false }
  }, [open]) // ← SOLO [open]

  // ── resetForm — inicializa campos desde datos de la entidad ──────────────
  const resetForm = (data?: EntidadRow) => {
    setEmpresaId(data?.empresaId?.toString() ?? '')
    setNombre(data?.nombre ?? '')
    // TODO: más campos
    setGlobalError(null)
    setFieldErrors({})
    setActiveTab('general')
  }

  // ── handleOpenChange CRÍTICO — inicializa mode + campos aquí, NUNCA en useEffect
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      resetForm(entidad)
      setMode(isEditing ? 'view' : 'edit')
    }
    setOpen(newOpen)
  }

  // ── doSave — guarda sin validaciones de similares ─────────────────────────
  const doSave = async () => {
    setLoading(true)
    try {
      const data: EntidadInput = {
        empresaId: parseInt(empresaId, 10),
        nombre:    normalizeText(nombre),
        // TODO: más campos
      }

      // ── OCC (Optimistic Concurrency Control) ──────────────────────────────
      // Al actualizar, SIEMPRE pasar `registroVersion` para detectar ediciones
      // concurrentes. La acción/service debe:
      //   1. Hacer el UPDATE con WHERE id = ? AND registroVersion = ?
      //   2. Si el UPDATE afecta 0 filas → retornar { ok: false, error: 'El registro
      //      fue modificado por otro usuario. Recarga e intenta de nuevo.' }
      //   3. Si afecta 1 fila → incrementar registroVersion y retornar { ok: true, data }
      // El modal no necesita lógica extra: el bloque `!res.ok` de abajo lo captura.
      // Ver implementación de referencia: src/app/actions/categorias.ts → actualizarCategoria
      const res = isEditing && entidad
        ? await actualizarEntidad(entidad.id, { ...data, registroVersion: entidad.registroVersion })
        : await crearEntidad(data)

      if (!res.ok) {
        if (res.field) {
          // ③ R20 — error de campo del servidor: navegar a la pestaña correcta
          setFieldErrors(prev => ({ ...prev, [res.field!]: res.error }))
          irATabConError(res.field!)
        } else {
          setGlobalError(res.error)
        }
        return
      }
      resetForm(res.data)
      if (isEditing) {
        setMode('view')
      } else {
        setOpen(false)
      }
      onSuccess?.()
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : 'Error inesperado al guardar')
    } finally {
      setLoading(false)
    }
  }

  // ── handleSave — valida y (opcionalmente) verifica similares antes de guardar
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalError(null)

    // Validaciones locales — preservar errores existentes (NO setFieldErrors({}))
    const errors: Record<string, string> = {}
    if (!empresaId)     errors.empresaId = 'Requerido'
    if (!nombre.trim()) errors.nombre    = 'Requerido'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(prev => ({ ...prev, ...errors }))
      // ① R20 — validación local: navegar a la pestaña del primer campo con error
      irATabConError(Object.keys(errors)[0])
      return
    }

    // TODO (R18): Si tiene campo Nombre/Descripción libre, verificar similares aquí.
    // Si se detecta un error de similar, también llamar irATabConError(campo).
    // Ver implementación en: src/components/categorias/categoria-modal.tsx

    await doSave()
  }

  // ── Helpers de display ─────────────────────────────────────────────────────
  const empresaNombre = empresas.find(e => e.value === empresaId)?.label ?? empresaId

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {trigger && <DialogTrigger render={trigger as React.ReactElement} />}

        <DialogContent className="h-[85vh] sm:h-[580px] flex flex-col p-4 sm:p-6 overflow-hidden sm:max-w-[560px]">
          <DialogHeader className="shrink-0">
            <DialogTitle className={UI_THEME.modal.title}>
              <IconoEntidad className="h-5 w-5 text-indigo-600" /> {/* ← ícono canónico */}
              {isEditing
                ? mode === 'view' ? 'Detalle Entidad' : 'Editar Entidad'
                : 'Nueva Entidad'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} noValidate className="flex-1 min-h-0 flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
              <TabsList variant="line" className="mb-4 shrink-0">
                <TabsTrigger value="general">
                  <IconoEntidad className="h-3.5 w-3.5 mr-1.5" /> {/* ← ícono canónico */}
                  General
                </TabsTrigger>
                {/* TODO: agregar más TabsTrigger si la entidad los necesita */}
              </TabsList>

              {/* Área scrolleable de campos */}
              <div className={UI_THEME.modal.scrollArea}>

                {/* Error global — siempre al tope del área de campos */}
                {globalError && (
                  <div className={`${UI_THEME.forms.globalError} mb-4`}>{globalError}</div>
                )}

                {/* ── Tab General ────────────────────────────────────────── */}
                <TabsContent value="general" className="mt-0">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">

                    {/* Empresa — tres modos obligatorios (R: AGENTS.md §Campos y Datos)
                        SIEMPRE usar UI_THEME.forms.labelBase en Label.
                        Vista/Edición → Input disabled con data-[view-mode] ya manejado por inputBase.
                        Creación      → SearchableSelect activo. */}
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <Label className={UI_THEME.forms.labelBase}>Empresa</Label>
                      {mode === 'view' ? (
                        // Vista: Input deshabilitado — inputBase ya aplica estilos disabled
                        <Input value={empresaNombre} disabled className={UI_THEME.forms.inputBase} />
                      ) : isEditing ? (
                        // Edición: empresa no se cambia — igual deshabilitado
                        <Input value={empresaNombre} disabled className={UI_THEME.forms.inputBase} />
                      ) : (
                        // Creación: SearchableSelect activo
                        <SearchableSelect
                          options={empresas}
                          value={empresaId}
                          onChange={setEmpresaId}
                          disabled={cargandoEmpresas || loading}
                          placeholder={cargandoEmpresas ? 'Cargando...' : 'Seleccionar empresa'}
                        />
                      )}
                      <FieldError message={fieldErrors.empresaId} />
                    </div>

                    {/* Nombre — usar UI_THEME.forms.inputBase en todos los Input.
                        Agregar clases extra (ej. "uppercase") DESPUÉS del token base. */}
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <Label className={UI_THEME.forms.labelBase}>Nombre</Label>
                      <Input
                        value={nombre}
                        onChange={e => {
                          setNombre(e.target.value)
                          if (fieldErrors.nombre) setFieldErrors(prev => { const n = { ...prev }; delete n.nombre; return n })
                        }}
                        disabled={mode === 'view' || loading}
                        className={`${UI_THEME.forms.inputBase} uppercase`}
                        aria-invalid={!!fieldErrors.nombre}
                      />
                      <FieldError message={fieldErrors.nombre} />
                    </div>

                    {/* TODO: agregar más campos usando siempre:
                        - <Label className={UI_THEME.forms.labelBase}>...</Label>
                        - <Input className={UI_THEME.forms.inputBase} .../>         (texto libre)
                        - <SearchableSelect .../>                                   (listas/FK)
                        - <NumericInput .../>                                        (números — NUNCA <input type="number">)
                        - <FieldError message={fieldErrors.campo} />               (error bajo cada campo)

                        ── CAMPOS NUMÉRICOS — PATRÓN OBLIGATORIO ────────────────────────────
                        Para campos numéricos en modales, usar SIEMPRE uno de estos dos patrones:

                        PATRÓN A — NumericInput con disabled (recomendado):
                          <NumericInput
                            value={miCampoNumerico}
                            onChange={setMiCampoNumerico}
                            disabled={mode === 'view' || loading}
                          />
                          → El NumericInput muestra formato con separador de miles al perder foco,
                            y número limpio al enfocar para editar. No se necesita Input separado.

                        PATRÓN B — Input disabled en modo vista + NumericInput en edición:
                          {mode === 'view' ? (
                            <Input
                              value={formatNumber(Number(miEntidad?.miCampo ?? 0))}
                              disabled
                              className={`${UI_THEME.forms.inputBase} bg-muted/50`}
                            />
                          ) : (
                            <NumericInput
                              value={miCampoState}
                              onChange={setMiCampoState}
                              disabled={loading}
                            />
                          )}
                          → Usar cuando el campo es de solo lectura en vista y editable en create/edit.
                          → OBLIGATORIO importar: import { formatNumber } from '@/lib/utils/format'
                          → formatNumber(value, minDecimals=2, maxDecimals=4)
                          → NUNCA pasar el número crudo: value={solicitud?.cantidad} ← INCORRECTO
                        ─────────────────────────────────────────────────────────────────── */}

                  </div>
                </TabsContent>

                {/* TODO: agregar más TabsContent si la entidad los necesita */}

              </div>
            </Tabs>

            {/* ── Footer fijo — NUNCA dentro del área scrolleable ──────── */}
            <div className={UI_THEME.modal.footer}>
              <div>
                {/* Izquierda: Eliminar (si aplica) o vacío */}
                {/* mode === 'view' && isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    className={UI_THEME.modal.buttons.eliminar}
                    onClick={handleEliminar}
                  >
                    Eliminar
                  </Button>
                ) */}
              </div>
              <div className={UI_THEME.modal.buttons.rightGroup}>
                {mode === 'view' && (
                  <>
                    {/* Derecha en Vista: Historial + Editar */}
                    <Button
                      type="button"
                      variant="outline"
                      className={UI_THEME.modal.buttons.historial}
                      onClick={() => setHistorialOpen(true)}
                    >
                      <History className="h-4 w-4 mr-1.5" />
                      Historial
                    </Button>
                    <Button type="button" onClick={() => setMode('edit')}>
                      <Pencil className="h-4 w-4 mr-1.5" />
                      Editar
                    </Button>
                  </>
                )}
                {(mode === 'edit' || !isEditing) && (
                  <>
                    {/* Derecha en Edición/Creación: Cancelar + Guardar */}
                    {isEditing && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { resetForm(entidad); setMode('view') }}
                        disabled={loading}
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button type="submit" disabled={loading}>
                      <Save className="h-4 w-4 mr-1.5" />
                      {loading ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* HistorialDrawer — FUERA del Dialog, como hermano en el fragmento <> */}
      {entidad && (
        <HistorialDrawer
          open={historialOpen}
          onOpenChange={setHistorialOpen}
          entidadId={entidad.id}
          entidadTipo="Entidad" // ← nombre legible
          tabla="costeos_tabla" // ← nombre exacto tabla MySQL
        />
      )}
    </>
  )
}
