# Estándar para Pantallas CRUD

Para mantener la consistencia en el proyecto, **todas las pantallas CRUD** (listados de registros con opciones para crear, editar, eliminar) deben utilizar el componente reutilizable `DataTable` ubicado en `src/components/ui/data-table.tsx`.

## Requisitos de Implementación

1. **Uso de DataTable**: NO debes implementar tablas HTML manuales (`<table>`, `<tr>`, etc.) ni iterar colecciones directamente en la vista principal para listas de datos complejas. Debes instanciar el componente `<DataTable>`.
2. **Componente Cliente**: El renderizado de `DataTable` con sus columnas (que usualmente requieren hooks como `useMemo` o botones con interactividad) debe hacerse en un **Client Component** (con `'use client'`).
3. **Página de Servidor**: Se recomienda que la página (`page.tsx`) sea un Server Component que obtenga la lista completa de datos desde la base de datos (por ejemplo, llamando a un action) y se la pase al Client Component que contiene el `<DataTable>`.

## Características del DataTable

Al utilizar `DataTable`, heredas automáticamente:
- **Buscador global** (searchbox del lado del cliente) integrado en el toolbar.
- **Administrador de columnas** (mostrar/ocultar y reordenar mediante drag-and-drop en el encabezado).
- **Exportación a CSV**: Botón de descarga integrado que exporta automáticamente solo las columnas visibles de la tabla a un archivo CSV compatible con Excel/Google Sheets.
- **Persistencia**: La visibilidad y orden de las columnas se guarda en el `localStorage` del navegador.
- **Theming parametrizado**: Colores, tamaños de fuente y estilos unificados.

## Ejemplo de Uso

```tsx
'use client'

import React, { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function MiEntidadClient({ data }: { data: any[] }) {
  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'nombre',
        header: 'Nombre',
        cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>,
      },
      // ...otras columnas
      {
        id: 'acciones',
        header: '',
        enableHiding: false, // Las acciones nunca se deben ocultar
        cell: ({ row }) => {
          return <Button>Editar</Button>
        }
      }
    ],
    []
  )

  const toolbarActions = (
    <Button className="gap-2">
      <Plus className="w-4 h-4" /> Nuevo Registro
    </Button>
  )

  return (
    <DataTable
      columns={columns}
      data={data}
      tableId="mi-entidad-crud" // IMPORTANTE: Un ID único para persistencia en localStorage
      searchPlaceholder="Buscar registros..."
      searchKey="nombre" // Opcional: llave por la cual buscar por defecto
      customToolbarActions={toolbarActions}
    />
  )
}
```

## Theming (Estilos)
Si se desea cambiar el color de los encabezados, tamaño de letra, o color de registros, **NO se debe cambiar en cada pantalla individualmente**. Se debe editar la constante `TABLE_THEME` directamente en `src/components/ui/data-table.tsx`.

## Estándar para Modales (Formularios CRUD)

Para mantener una apariencia corporativa ("ERP state of the art"):
1. **Contenedor Principal (Tabs)**: Todo el formulario dentro del `DialogContent` debe estar contenido en un componente `<Tabs defaultValue="general">`.
2. **Pestaña por defecto**: Siempre debe existir la pestaña `General` (`value="general"`).
3. **Pestañas adicionales**: Si el formulario requiere configuración avanzada o mucha información, divídelo lógicamente en más pestañas (ej: "Configuración", "Estructura").
4. **Layout de Cuadrícula (Grid)**: Dentro de cada `TabsContent`, los campos deben agruparse utilizando CSS Grid de mínimo 2 columnas (`<div className="grid grid-cols-2 gap-x-6 gap-y-4">`). No usar listas verticales simples.
5. **Estética ERP**: Los componentes base (`Input`, `Select`, `Label`) ya están modificados globalmente para usar una alta densidad visual (más pequeños, tipografía `text-sm`, `rounded-sm`), garantizando una experiencia profesional.
