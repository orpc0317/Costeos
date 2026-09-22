-- Migracion: elimina la clave precioVentaUnitario de cada elemento
-- del JSON array almacenado en la columna bonos de costeos_nodo_recurso.
-- Los bonos no llevan Precio de Venta.

UPDATE costeos_nodo_recurso
SET bonos = (
  SELECT JSON_ARRAYAGG(JSON_REMOVE(elem, '$.precioVentaUnitario'))
  FROM JSON_TABLE(bonos, '$[*]' COLUMNS (elem JSON PATH '$')) AS t
)
WHERE bonos IS NOT NULL
  AND JSON_TYPE(bonos) = 'ARRAY';