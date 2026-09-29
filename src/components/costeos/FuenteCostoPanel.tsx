"use client";

/**
 * FuenteCostoPanel.tsx
 *
 * Muestra la fuente/referencia del costo de un ítem dentro del costeo.
 * Se coloca en el EditorPanel (sección RECURSO → tab General → debajo de FINANCIERO).
 *
 * Para cada manejoCostos muestra:
 *   1 = Compras       → proveedor, referencia, fecha, costo unit.
 *   2 = Manual        → fecha del último registro, usuario, monto
 *   3 = Referencia    → ítem base, %, costo base, costo calculado
 *   4 = Solicitado    → "Ingresado por el usuario durante el Costeo"
 *   5 = Tabla Ítem    → igual que Manual
 *  99 = No Aplica     → solo el badge, sin detalle
 */

import React, { useEffect, useState } from "react";
import { getFuenteCosto, type FuenteCostoInfo } from "@/app/actions/fuente-costo";
import { ShoppingCart, PenLine, Link2, UserCheck, Package, Ban, Loader2, ExternalLink } from "lucide-react";
import { formatNumber } from "@/lib/utils/format";

// ─── Helpers visuales ────────────────────────────────────────────────────────

const BADGE_CONFIG: Record<number, { label: string; icon: React.ElementType; color: string }> = {
  1:  { label: "Compras",    icon: ShoppingCart, color: "bg-sky-100 text-sky-700 border-sky-200" },
  2:  { label: "Manual",     icon: PenLine,      color: "bg-violet-100 text-violet-700 border-violet-200" },
  3:  { label: "Referencia", icon: Link2,        color: "bg-amber-100 text-amber-700 border-amber-200" },
  4:  { label: "Solicitado", icon: UserCheck,    color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  5:  { label: "Tabla Ítem", icon: Package,      color: "bg-violet-100 text-violet-700 border-violet-200" },
  99: { label: "No Aplica",  icon: Ban,          color: "bg-slate-100 text-slate-500 border-slate-200" },
};

function ManejoBadge({ manejoCostos }: { manejoCostos: number }) {
  const cfg = BADGE_CONFIG[manejoCostos] ?? { label: "Sin definir", icon: Ban, color: "bg-slate-100 text-slate-500 border-slate-200" };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-muted-foreground w-32 shrink-0 text-xs pt-0.5">{label}</span>
      <span className="font-medium text-slate-800 break-words">{value}</span>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface FuenteCostoPanelProps {
  itemId:   number;
  costeoId: number;
  /** Costo actual en el árbol — para detectar si fue actualizado tras costear */
  costoActual: number;
}

export function FuenteCostoPanel({ itemId, costeoId, costoActual }: FuenteCostoPanelProps) {
  const [info, setInfo]       = useState<FuenteCostoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  /** Key que fuerza recarga: cambia cuando el itemId cambia O cuando el costo cambia (post-Costear) */
  const [loadKey, setLoadKey] = useState<string>(`${itemId}-${costoActual}`);

  // Cuando cambia el itemId, siempre recargar
  useEffect(() => {
    setLoadKey(`${itemId}-${costoActual}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  // Cuando cambia el costo (el proceso Costear actualizó el árbol), recargar la fuente
  useEffect(() => {
    if (costoActual > 0) {
      setLoadKey(prev => {
        const [id] = prev.split('-');
        return `${id}-${costoActual}`;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costoActual]);

  useEffect(() => {
    if (!itemId) return;
    let active = true;
    setLoading(true);
    setInfo(null);
    getFuenteCosto(itemId, costeoId).then(result => {
      if (!active) return;
      setInfo(result);
      setLoading(false);
    });
    return () => { active = false; };
  }, [loadKey, itemId, costeoId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Cargando referencia de costo...
      </div>
    );
  }

  if (!info) return null;

  const { manejoCostos } = info;

  return (
    <div className="pt-4">
      {/* Header de sección */}
      <div className="flex items-center mb-3 min-h-[24px]">
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider border-l-2 border-slate-400 pl-2 leading-none">
          FUENTE COSTO
        </h3>
        <div className="flex-1 border-t border-slate-200 ml-3 mt-0.5" />
      </div>

      <div className="space-y-2.5">
        {/* Badge de tipo */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-32 shrink-0">Método</span>
          <ManejoBadge manejoCostos={manejoCostos} />
        </div>

        {/* ── No Aplica: no mostrar más detalle ─────────────────────────── */}
        {manejoCostos === 99 && (
          <p className="text-xs text-muted-foreground italic pl-2">
            Este ítem no tiene manejo de costos. Se excluye del cálculo.
          </p>
        )}

        {/* ── Solicitado: mensaje simple ────────────────────────────────── */}
        {manejoCostos === 4 && (
          <InfoRow
            label="Origen"
            value={
              costoActual > 0
                ? "Ingresado por el usuario durante el proceso de Costeo"
                : "Pendiente — se solicitará en el próximo Costeo"
            }
          />
        )}

        {/* ── Compras ───────────────────────────────────────────────────── */}
        {manejoCostos === 1 && (
          <>
            {/* Badge Por Costeo */}
            {(info.porCosteo ?? 0) === 1 && (
              <div className="flex items-center gap-2 text-xs text-sky-700 bg-sky-50 border border-sky-200 rounded px-2.5 py-1.5">
                <span className="font-semibold">🔒 Por Costeo</span>
                <span className="text-sky-500">— requiere cotización específica para cada proyecto</span>
              </div>
            )}

            {info.compras ? (
              <div className="space-y-2 border-l-2 border-sky-200 pl-3">
                <InfoRow label="Proveedor"    value={info.compras.proveedorNombre} />
                <InfoRow label="Fecha Cotiz." value={info.compras.fecha} />
                {info.compras.referencia && (
                  <InfoRow label="Referencia" value={info.compras.referencia} />
              )}
              <InfoRow label="Cantidad"     value={formatNumber(info.compras.cantidad, 2, 4)} />
              <InfoRow label="Total"        value={`Q ${formatNumber(info.compras.total, 2, 2)}`} />
              <InfoRow
                label="Costo Unit."
                value={
                  <span className="text-sky-700 font-bold">
                    Q {formatNumber(info.compras.costoUnitario, 2, 4)}
                  </span>
                }
              />
              {info.compras.impuestos === 1 && (
                <InfoRow label="Impuestos" value={<span className="text-amber-600 text-xs">Incluye impuestos</span>} />
              )}
              {info.compras.archivoUrl && (
                <InfoRow
                  label="Archivo"
                  value={
                    <a
                      href={info.compras.archivoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 underline flex items-center gap-1 text-xs"
                    >
                      Ver cotización <ExternalLink className="h-3 w-3" />
                    </a>
                  }
                />
              )}
            </div>
          ) : (
            <div className="pl-3 border-l-2 border-amber-300">
              <p className="text-xs text-amber-600 italic">
                {(info.porCosteo ?? 0) === 1
                  ? 'Sin cotización vigente para este proyecto. Genere una solicitud de compra para este costeo y registre una cotización vigente.'
                  : 'Sin cotización vigente — costo en 0. Asigne una cotización vigente en el módulo de Compras.'}
              </p>
            </div>
          )}
          </>
        )}

        {/* ── Manual / Tabla Ítem ───────────────────────────────────────── */}
        {(manejoCostos === 2 || manejoCostos === 5) && (
          info.manual ? (
            <div className="space-y-2 pl-3 border-l-2 border-violet-200">
              <InfoRow label="Fecha"      value={info.manual.fecha} />
              {info.manual.usuarioNombre && (
                <InfoRow label="Registrado" value={info.manual.usuarioNombre} />
              )}
              <InfoRow
                label="Costo Unit."
                value={
                  <span className="text-violet-700 font-bold">
                    Q {formatNumber(info.manual.costo, 2, 4)}
                  </span>
                }
              />
            </div>
          ) : (
            <div className="pl-3 border-l-2 border-amber-300">
              <p className="text-xs text-amber-600 italic">
                Sin costo manual registrado. Registre un costo en la ficha del ítem.
              </p>
            </div>
          )
        )}

        {/* ── Referencia ────────────────────────────────────────────────── */}
        {manejoCostos === 3 && (
          info.referencia ? (
            <div className="space-y-2 pl-3 border-l-2 border-amber-200">
              <InfoRow label="Ítem Base"    value={info.referencia.itemReferenciaNombre} />
              <InfoRow label="Costo Base"   value={`Q ${formatNumber(info.referencia.costoBase, 2, 4)}`} />
              <InfoRow label="Porcentaje"   value={`${formatNumber(info.referencia.pct, 2, 2)} %`} />
              {info.referencia.fechaPct && (
                <InfoRow label="Fecha %"    value={info.referencia.fechaPct} />
              )}
              <InfoRow
                label="Costo Unit."
                value={
                  <span className="text-amber-700 font-bold">
                    Q {formatNumber(info.referencia.costoCalculado, 2, 4)}
                  </span>
                }
              />
            </div>
          ) : (
            <div className="pl-3 border-l-2 border-amber-300">
              <p className="text-xs text-amber-600 italic">
                Sin ítem de referencia configurado o sin porcentaje registrado.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
