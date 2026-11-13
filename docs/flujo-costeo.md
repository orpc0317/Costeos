# Flujo del Costeo — Documentación del Negocio

> Documento de referencia. Basado en el brief original de negocio (Costeos.txt).
> Este archivo describe el dominio del negocio — no es documentación técnica.

---

## Contexto

La empresa ofrece **servicios de seguridad física**: provee guardias de seguridad para proteger personas, bienes e instalaciones de los clientes.

Un **Costeo** es la estimación detallada de todos los costos y precios de venta que se incurrirán durante la vida de un proyecto (contrato de seguridad).

---

## Estructura jerárquica de un proyecto

```
CLIENTE
  └── CONTRATO
        └── SITIO 1  ("Oficinas Centrales")
        │     ├── [Sin puesto]
        │     │     └── COORDINADOR SITIO (recurso humano)
        │     │           ├── RECETA: SALARIOS
        │     │           │     ├── Sueldo Ordinario
        │     │           │     ├── Bono Decreto
        │     │           │     └── Seguro Social
        │     │           └── RECETA: UNIFORME A
        │     │                 ├── Camisa
        │     │                 ├── Pantalón
        │     │                 └── Zapatos
        │     │
        │     ├── PUESTO 1  ("Garita")
        │     │     ├── RECURSO HUMANO 1  (Guardia Estándar)
        │     │     │     ├── RECETA: SALARIOS
        │     │     │     └── RECETA: UNIFORME A
        │     │     ├── RECURSO HUMANO 2  (Guardia Nocturno)
        │     │     │     ├── RECETA: SALARIOS
        │     │     │     └── RECETA: UNIFORME B
        │     │     ├── EQUIPO: RADIO MOTOROLA
        │     │     │     ├── Estuche (artículo)
        │     │     │     └── Plan de Datos (servicio)
        │     │     ├── EQUIPO: REVOLVER (costo + receta)
        │     │     │     ├── Porta Arma
        │     │     │     └── Cincho
        │     │     └── EQUIPO: COMPUTADORA (sin receta, solo costo)
        │     │
        │     └── PUESTO 2  ("Puerta Principal")
        │           └── ...
        │
        └── SITIO 2  ("Bodega Zona 4")
              └── ...
```

---

## Definiciones

### CLIENTE
El cliente existe (o se crea como nuevo). Tiene:
- Código, Razón Social, NIT, Dirección Fiscal
- Puede ser un cliente existente en el ERP o uno nuevo que se creará al aprobar

### CONTRATO
Cabecera comercial. Tiene:
- Cliente, empresa, nombre y número
- Número: correlativo de la empresa (1, 2, 3…). Lo asigna Costeos al crear el contrato, haya o no ERP
- Código ERP (`erp_contrato_id`): vacío hasta que, si hay integración, el contrato se envía y el ERP devuelve su referencia. No reemplaza el correlativo
- Fecha de contrato: el día en que se crea el registro
- Fecha de inicio: el día en que el contrato empieza a correr. Puede ser posterior a la fecha de contrato
- Plazo en meses y moneda (GTQ, USD)
- Estado propio, con los mismos códigos del costeo excepto Histórico: 0 Borrador, 1 Autorizar, 2 Preparacion, 3 Vigente, 5 Cancelado

El costeador evalúa los costos con la fecha de inicio: usa el costo cuya fecha es la más reciente que no pasa de ese día.

Un contrato tiene una o varias versiones (`costeos_costeo`). Cada versión guarda su fecha de costeo, la fecha de inicio con la que se evalúan los costos, su estado (0 Borrador, 1 Autorizar, 2 Preparacion, 3 Vigente, 4 Historico, 5 Cancelado) y su propio árbol de sitios, puestos y recursos.

### SITIOS
Ubicaciones físicas donde se presta el servicio. Ejemplos:
- "Oficinas Centrales", "Bodega Zona 4", "La Formuladora", "Agencia Sur"

Cada sitio tiene: nombre, dirección (país, departamento, municipio), coordenadas GPS.
Los Sitios pueden tener un código único dentro de la versión del costeo.

### PUESTOS
Posiciones dentro de un Sitio donde estará el personal o equipo. Ejemplos:
- "Garita", "Puerta Principal", "Parqueo", "Recepción"

Cada puesto define:
- **Días de cobertura:** Lunes a Viernes, Lunes a Domingo, días específicos
- **Horario:** por ejemplo 06:00 a 18:00 (turno 12h), o 06:00 a 06:00 (turno 24h)
- Por lo general los turnos son de **12 horas**

Un sitio puede tener recursos "Sin Puesto" — por ejemplo un Coordinador de Sitio
que no está asignado a una posición específica.

### RECURSOS
Items del ERP asignados a un Puesto. Cuatro tipos:

| Tipo | Descripción |
|---|---|
| `RECURSO_HUMANO` | Guardias, supervisores, coordinadores |
| `EQUIPO` | Armamento, radios, vehículos, computadoras |
| `ARTICULO` | Uniformes, linternas, cuadernos, implementos |
| `SERVICIO` | Planes de datos, seguros, servicios de terceros |

Cada recurso tiene:
- Un **tipo de costo**: `MENSUAL` (recurrente) o `UNICO` (compra única)
- Una **cantidad** (cuántas unidades en el puesto)
- Un **precio de venta** (de la lista ERP o ingresado manualmente)

### RECETAS
Una Receta es un conjunto de items que van automáticamente con un Recurso.

**Ejemplos:**
- GUARDIA ESTÁNDAR tiene receta de SALARIOS (sueldo, bonos, IGSS) y receta de UNIFORME (camisa, pantalón, zapatos)
- REVOLVER tiene receta de: porta arma, cincho
- RADIO MOTOROLA tiene receta de: estuche, plan de datos

**Reglas de recetas:**
- Vienen definidas en el ERP
- Máximo **4 niveles de profundidad** (receta → sub-receta → sub-sub-receta → ...)
- Algunos items de receta son **opcionales** (el usuario puede quitarlos)
- Facilitan el llenado: el usuario elige GUARDIA ESTÁNDAR y la app agrega todos sus componentes automáticamente

### PRECIO DE VENTA
- El precio de venta normalmente aplica al **Recurso Humano** (el guardia)
- También puede aplicar a Equipos o Servicios específicos
- Viene de la **lista de precios del ERP** — el usuario puede modificarlo
- Si el item no tiene precio en lista, el usuario lo ingresa manualmente

---

## Tipo de costo: MENSUAL vs UNICO

Esta distinción es crítica para los cálculos financieros:

| Tipo | Ejemplos | Cálculo del total |
|---|---|---|
| **MENSUAL** | Salario, bonos, plan de datos, seguro | `costo × cantidad × meses_del_contrato` |
| **UNICO** | Radio, uniforme, arma, computadora | `costo × cantidad` (independiente del plazo) |

**Ejemplo con contrato de 24 meses:**
- Guardia (MENSUAL, Q5,000/mes) → costo total = Q5,000 × 24 = **Q120,000**
- Radio (UNICO, Q3,000) → costo total = **Q3,000**
- Para reportes mensuales, el radio se amortiza: Q3,000 / 24 = Q125/mes

---

## Números financieros que debe arrojar el Costeo

### Por período
El sistema calcula en **tres vistas**:
1. **Mensual** — costo y venta en un mes promedio
2. **Anual** — costo y venta en 12 meses
3. **Duración del proyecto** — costo y venta total durante el plazo del contrato

### Indicadores principales
- **Total Venta** (mensual / anual / proyecto)
- **Total Costo** (mensual / anual / proyecto)
- **Gross Margin** = (Venta - Costo) / Venta × 100
- **ROI** = (Venta - Costo) / Costo × 100

### Desglose por categoría
El Total Costo se desglosa por categoría del item. Ejemplos:
- TOTAL SALARIOS
- TOTAL COMUNICACIÓN
- TOTAL ARMAMENTO
- TOTAL UNIFORMES
- etc.

### Otros parámetros
- **Overhead:** gastos indirectos de la empresa sobre el proyecto (en %)
- **Contingencia:** colchón por imprevistos (en %)

---

## Ciclo de vida del Costeo

`costeos_costeo.estado` es un `TinyInt`. La etiqueta vive en `ESTADO_COSTEO` (`src/lib/constants.ts`). El número es el orden del ciclo. `costeos_contrato.estado` sigue siendo texto y no usa este catálogo.

| Código | Estado | En el builder |
| --- | --- | --- |
| 0 | Borrador | Editable. Costos vivos del ERP al abrir. |
| 1 | Autorizar | Solo lectura |
| 2 | Preparacion | Solo lectura |
| 3 | Vigente | Solo lectura |
| 4 | Historico | Solo lectura |
| 5 | Cancelado | Solo lectura |

Un costeo nuevo nace en Borrador (0). Cualquier otro código abre el builder en solo lectura.

---

## Lo que se envía al ERP al aprobar

Al aprobar un Contrato, Costeos envía al ERP:
- **Cliente** (si es nuevo: NIT, Razón Social, Dirección Fiscal)
- **Contrato** (correlativo local, plazo, moneda, fecha inicio)
- **Sitios** con sus coordenadas y dirección
- **Puestos** con días y horario
- **Recursos asignados** por puesto con costos y precios
- **Resumen financiero** (costo total, venta total, gross margin, ROI)

El ERP responde con:
- `erp_contrato_id` — referencia del contrato en el ERP. Costeos la guarda aparte y no cambia el correlativo. Si no hay integración, este dato no existe
- `erp_cliente_id` — ID del cliente en ERP (si era cliente nuevo)
