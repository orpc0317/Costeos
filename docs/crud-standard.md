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

## Theming y Diseño Centralizado (Estilos)

El objetivo principal de esta arquitectura es que **si en el futuro se desea cambiar un color, tamaño de letra o estilo global de las tablas, se haga en un solo lugar**.

1. **Estilos Globales de la Tabla**: 
   NO se debe cambiar el estilo individualmente en cada pantalla. Edita la constante `TABLE_THEME` directamente en `src/components/ui/data-table.tsx`. Esto controla el fondo de encabezados, color y fuente de las filas por defecto, y los colores de bordes.

2. **Estilos de Celdas (Tipografía Interna)**:
   Al definir las columnas en los archivos `*-client.tsx`, debes apegarte a las siguientes reglas CSS (basadas en Tailwind) para el contenido renderizado, de modo que hereden armónicamente del `TABLE_THEME`:
   
   - **Datos Principales (Nombres, Códigos, Identificadores)**: 
     Utilizar `<span className="font-medium">`. NO apliques colores fijos (como `text-slate-700`); deja que herede el color del tema global, solo aplicando peso a la tipografía.
   - **Datos Secundarios (Descripciones, Correos, Textos de Apoyo)**: 
     Utilizar `<span className="text-muted-foreground">` o `<span className="text-sm text-muted-foreground">`. Esto asegura que se vean atenuados en comparación a los datos principales.
   - **Fechas**: 
     Utilizar `<span className="text-sm text-muted-foreground">`.
   - **Badges/Estados**: 
     Utilizar el componente `<Badge>` preferentemente con las variantes `default` (Activo/Positivo), `secondary` (Inactivo/Neutro), u `outline`. Si ocupas colores personalizados, usa utilidades con opacidad controlada (ej. `bg-emerald-500/15 text-emerald-600 border-emerald-500/20`).

## Estándar para Modales (Formularios CRUD)

Para mantener una apariencia corporativa ("ERP state of the art"):
1. **Contenedor Principal (Tabs)**: Todo el formulario dentro del `DialogContent` debe estar contenido en un componente `<Tabs defaultValue="general">`.
2. **Pestaña por defecto**: Siempre debe existir la pestaña `General` (`value="general"`).
3. **Pestañas adicionales**: Si el formulario requiere configuración avanzada o mucha información, divídelo lógicamente en más pestañas (ej: "Configuración", "Estructura").
4. **Layout de Cuadrícula (Grid)**: Dentro de cada `TabsContent`, los campos deben agruparse utilizando CSS Grid de mínimo 2 columnas (`<div className="grid grid-cols-2 gap-x-6 gap-y-4">`). No usar listas verticales simples.
9. **Estética ERP**: Los componentes base (`Input`, `Select`, `Label`) ya están modificados globalmente para usar una alta densidad visual (más pequeños, tipografía `text-sm`, `rounded-sm`), garantizando una experiencia profesional.
10. **Flujo de Edición (Editar -> Guardar -> Ver)**:
    - Al guardar exitosamente una modificación (UPDATE), el modal **NO** debe cerrarse.
    - El Backend (Server Action) debe devolver el registro recién actualizado en la respuesta.
    - El Frontend debe tomar este nuevo registro, actualizar su estado interno (`initialData`) y cambiar inmediatamente a modo "vista" (`setMode('view')`).
    - Esto permite que el usuario visualice sus cambios aplicados instantáneamente (incluyendo marcas de tiempo o campos calculados) y brinda una mejor experiencia tipo "Guardado exitoso".
