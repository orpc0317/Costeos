# Convenciones de Desarrollo - Costeos

Este documento contiene las reglas y componentes estandarizados que han nacido orgánicamente en el proyecto y que deben ser respetados por la IA en futuras implementaciones.

## UI y Formularios

### Inputs Numéricos (Cantidades, Costos, Porcentajes)
- **Regla:** NUNCA utilizar `<input type="number">` directamente en componentes de React que estén enlazados a un estado (State/Context) para evitar el error de hidratación y el "síndrome del punto decimal fantasma".
- **Solución:** Utilizar el componente reutilizable `<NumericInput>` ubicado en `src/components/ui/numeric-input.tsx`.
- **Uso:**
  ```tsx
  import { NumericInput } from '@/components/ui/numeric-input';
  
  <NumericInput 
    value={stateValue} 
    onChange={(val) => handleChange(val)} 
    className="..."
  />
  ```

### Modales (Dialogs)
- **Regla:** Estamos utilizando la librería `shadcn/ui` que por debajo implementa `@base-ui/react`. Esta versión reciente NO soporta la propiedad `asChild` en el `DialogTrigger` de la misma manera que versiones anteriores.
- **Solución:** Si necesitas un botón personalizado como disparador, debes usar la propiedad `render={}` en lugar de `asChild`.
- **Uso:**
  ```tsx
  <DialogTrigger render={<button className="mi-clase">Abrir</button>}>
    Icono o Texto
  </DialogTrigger>
  ```

### Selects (Comboboxes) y Cascada
- **Regla 1 (Filtro):** Para listados con múltiples opciones, se debe utilizar un componente que permita buscar/filtrar (como `Command` + `Popover` de `shadcn/ui`, equivalente a un Combobox) para que el usuario pueda escribir parte del nombre.
- **Regla 2 (Código vs Nombre):** Los selects deben desplegar el nombre/descripción al usuario, pero **siempre** deben guardar el código correspondiente en la base de datos o estado.
- **Regla 3 (Auto-selección):** Siempre se debe auto-seleccionar el primer registro disponible (ej: si se carga una lista de departamentos, el primero de la lista debe quedar seleccionado automáticamente).
- **Regla 4 (Cascadas Automáticas):** Si un Select depende de otro (ej. Municipio depende de Departamento), al cambiar el padre, se debe limpiar la selección del hijo, cargar la nueva lista y aplicar la *Regla 3* (auto-seleccionar el primero) de forma encadenada.

### Normalización de Textos (Mayúsculas y sin Tildes)
- **Regla:** TODO el texto ingresado por el usuario en campos de texto libre (nombres, direcciones, etc.) debe guardarse SIEMPRE en MAYÚSCULAS y SIN TILDES (diacríticos) para facilitar las búsquedas y evitar duplicidad de registros (ej. "Petén" vs "PETEN").
- **Solución:** Utilizar la función `normalizeText` ubicada en `src/lib/utils/text.ts` en los manejadores de cambios (`onChange` o antes de hacer dispatch/guardar).
