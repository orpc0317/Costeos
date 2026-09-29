# Plantillas de Importación Masiva — Costeador

Herramientas para cargar entre 100-200 items desde el sistema Legacy al Costeador.

---

## Archivos disponibles

| Archivo | Descripción |
|---|---|
| `plantillas/plantilla_items.csv` | Items (primarios de venta y componentes de combo) |
| `plantillas/plantilla_combos.csv` | Relaciones Item Principal → Items Secundarios |
| `plantillas/plantilla_costos_manuales.csv` | Costos manuales para items con `manejo_costos=2` |
| `plantillas/plantilla_costos_referencia.csv` | Porcentajes de referencia para items con `manejo_costos=3` |
| `importar-items.cjs` | Script Node.js de importación |

---

## Flujo de trabajo

### 1. Llenar las plantillas con datos del Legacy

Abre cada CSV en Excel (codificación UTF-8). **Elimina las líneas que empiezan con `##`** antes de importar.

**Orden recomendado al llenar:**
1. `plantilla_items.csv` — todos los items (tanto primarios como componentes)
2. `plantilla_combos.csv` — una vez que sepas los IDs de los items
3. `plantilla_costos_manuales.csv` — costos históricos de items `manejo_costos=2`
4. `plantilla_costos_referencia.csv` — porcentajes de items `manejo_costos=3`

### 2. Validar con dry-run (sin escribir en BD)

```bash
# Validar solo items
node scripts/importar-items.cjs --items --dry-run

# Validar todo el flujo
node scripts/importar-items.cjs --all --dry-run
```

### 3. Importar a producción

```bash
# Importar solo items
node scripts/importar-items.cjs --items

# Importar todo en el orden correcto
node scripts/importar-items.cjs --all
```

> ⚠️ Siempre ejecuta `--dry-run` primero. El script es idempotente: detecta duplicados y los omite sin error.

---

## Referencia rápida de campos

### plantilla_items.csv

| Campo | Obligatorio | Valores |
|---|---|---|
| `empresa_id` | ✅ | `1`=WACKTRON, `3`=WAGSA |
| `descripcion` | ✅ | Texto libre (se guarda en MAYÚSCULAS) |
| `unidad_medida` | ✅ | PERSONA, SERVICIO, UNIDAD, KG, GALON, PAR, PAGO |
| `tipo_item` | ✅ | `1`=Producto, `2`=Generico, `3`=Servicio, `4`=Equipo, `5`=Financiero, `6`=Bono |
| `tipo_producto` | Solo si `tipo_item=3` | `0`=Estandar, `1`=Outsourcing |
| `categoria_id` | ✅ | Ver tabla de categorías |
| `venta` | ✅ | `0`=No, `1`=Sí (item de venta = Item Primario) |
| `recurrente` | ✅ | `0`/`1` |
| `recurrente_gasto` | ✅ | `0`/`1` |
| `manejo_costos` | ✅ | `1`=Compras, `2`=Manual, `3`=Referencia, `4`=Solicitar Usuario, `5`=Tabla Item, `99`=No Aplica |
| `cotizacion_scope` | Solo si `manejo_costos=1` | `GENERAL` / `POR_PROYECTO` |
| `por_costeo` | Solo si `manejo_costos=1` | `0`/`1` |
| `precio_venta_cero` | | `0`/`1` |
| `uniforme` | | `0`/`1` |
| `perfil` | | `0`/`1` |
| `tipo` | | `0`/`1` |
| `activo` | | `0`/`1` (default `1`) |
| `codigo_erp` | | Código del sistema Legacy (máx. 15 chars) |
| `tipo_combo_id` | | `5`=UNIFORME, `6`=EQUIPO SEGURIDAD (WAGSA) |
| `costo_referencia_item_id` | Solo si `manejo_costos=3` | ID del item de referencia |

### Categorías WAGSA (empresa_id=3)

| ID | Nombre |
|---|---|
| 1 | RECURSOS HUMANOS |
| 2 | SALARIOS |
| 3 | BONOS |
| 4 | ARMAMENTO |
| 5 | UNIFORME |

> WACKTRON no tiene categorías configuradas aún. Créalas en la UI (Configuración → Categorías) antes de importar sus items.

### Tipos Combo WAGSA

| ID | Nombre |
|---|---|
| 5 | UNIFORME |
| 6 | EQUIPO SEGURIDAD |

---

## Opciones del script

```
node scripts/importar-items.cjs [opciones]

Opciones:
  --items              Importar plantilla_items.csv
  --combos             Importar plantilla_combos.csv
  --costos-manuales    Importar plantilla_costos_manuales.csv
  --costos-referencia  Importar plantilla_costos_referencia.csv
  --all                Importar todo en orden
  --dry-run            Solo valida, sin escribir en BD
  --dir <ruta>         Directorio de plantillas (default: scripts/plantillas)
```

---

## Notas importantes

- **Idempotente:** El script detecta duplicados (por empresa + descripción para items; por combo principal+secundario; por item+fecha para costos) y los omite sin error.
- **Normalización:** Las descripciones se guardan en MAYÚSCULAS automáticamente.
- **`tipo_producto`** se fuerza automáticamente según `tipo_item` (excepto para `tipo_item=3` donde puede ser 0 u 1).
- **Items de WACKTRON** quedarán omitidos si no tienen `categoria_id`. Crea las categorías en la UI primero.
- **Combos:** Los IDs en `plantilla_combos.csv` deben ser los IDs reales de la BD. Si importaste items nuevos con este script, anota los IDs que el script reporta (ej: `creado con id=XX`) y úsalos en los combos.
