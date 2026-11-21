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
import { SegmentCard } from "@/components/ui/form-layout";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UI_THEME } from "@/lib/theme";

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

function Campo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input value={value} readOnly tabIndex={-1} className={UI_THEME.forms.inputBase} />
    </div>
  );
}

function Nota({ children, tono }: { children: React.ReactNode; tono: "aviso" | "info" }) {
  const cls = tono === "aviso"
    ? "text-amber-700 bg-amber-50 border-amber-200"
    : "text-sky-700 bg-sky-50 border-sky-200";
  return (
    <p className={`col-span-2 text-xs rounded-md border px-2.5 py-1.5 ${cls}`}>
      {children}
    </p>
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

  if (!loading && !info) return null;

  const manejoCostos = info?.manejoCostos ?? 0;

  return (
    <SegmentCard label="Fuente Costeo">
      <div className="col-span-2 grid grid-cols-2 gap-3">
        {loading && (
          <div className="col-span-2 flex items-center gap-2 text-xs text-muted-foreground py-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Cargando referencia de costo...
          </div>
        )}

        {info && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>Metodo</Label>
              <div className="flex items-center" style={{ height: "var(--ui-field-height)" }}>
                <ManejoBadge manejoCostos={manejoCostos} />
              </div>
            </div>

            {manejoCostos === 99 && (
              <Nota tono="aviso">
                Este ítem no tiene manejo de costos. Se excluye del cálculo.
              </Nota>
            )}

            {manejoCostos === 4 && (
              <div className="col-span-2">
                <Campo
                  label="Origen"
                  value={
                    costoActual > 0
                      ? "Ingresado por el usuario durante el proceso de Costeo"
                      : "Pendiente — se solicitará en el próximo Costeo"
                  }
                />
              </div>
            )}

            {manejoCostos === 1 && (
              <>
                {(info.porCosteo ?? 0) === 1 && (
                  <Nota tono="info">
                    <span className="font-semibold">Por Costeo</span>
                    {" — requiere cotización específica para cada proyecto"}
                  </Nota>
                )}

                {info.compras ? (
                  <>
                    <div className="col-span-2">
                      <Campo label="Proveedor" value={info.compras.proveedorNombre} />
                    </div>
                    <Campo label="Fecha Cotiz." value={info.compras.fecha} />
                    {info.compras.referencia && (
                      <Campo label="Referencia" value={info.compras.referencia} />
                    )}
                    <Campo label="Cantidad" value={formatNumber(info.compras.cantidad, 2, 4)} />
                    <Campo label="Total" value={`Q ${formatNumber(info.compras.total, 2, 2)}`} />
                    <Campo label="Costo Unit." value={`Q ${formatNumber(info.compras.costoUnitario, 2, 4)}`} />
                    {info.compras.impuestos === 1 && (
                      <Campo label="Impuestos" value="Incluye impuestos" />
                    )}
                    {info.compras.archivoUrl && (
                      <div className="flex flex-col gap-1.5">
                        <Label>Archivo</Label>
                        <a
                          href={info.compras.archivoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${UI_THEME.forms.inputBase} inline-flex items-center gap-1 text-sky-700`}
                        >
                          Ver cotización <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </>
                ) : (
                  <Nota tono="aviso">
                    {(info.porCosteo ?? 0) === 1
                      ? "Sin cotización vigente para este proyecto. Genere una solicitud de compra para este costeo y registre una cotización vigente."
                      : "Sin cotización vigente — costo en 0. Asigne una cotización vigente en el módulo de Compras."}
                  </Nota>
                )}
              </>
            )}

            {(manejoCostos === 2 || manejoCostos === 5) && (
              info.manual ? (
                <>
                  <Campo label="Fecha" value={info.manual.fecha} />
                  {info.manual.usuarioNombre && (
                    <Campo label="Registrado" value={info.manual.usuarioNombre} />
                  )}
                  <Campo label="Costo Unit." value={`Q ${formatNumber(info.manual.costo, 2, 4)}`} />
                </>
              ) : (
                <Nota tono="aviso">
                  Sin costo manual registrado. Registre un costo en la ficha del ítem.
                </Nota>
              )
            )}

            {manejoCostos === 3 && (
              info.referencia ? (
                <>
                  <div className="col-span-2">
                    <Campo label="Item Base" value={info.referencia.itemReferenciaNombre} />
                  </div>
                  <Campo label="Costo Base" value={`Q ${formatNumber(info.referencia.costoBase, 2, 4)}`} />
                  <Campo label="Porcentaje" value={`${formatNumber(info.referencia.pct, 2, 2)} %`} />
                  {info.referencia.fechaPct && (
                    <Campo label="Fecha %" value={info.referencia.fechaPct} />
                  )}
                  <Campo label="Costo Unit." value={`Q ${formatNumber(info.referencia.costoCalculado, 2, 4)}`} />
                </>
              ) : (
                <Nota tono="aviso">
                  Sin ítem de referencia configurado o sin porcentaje registrado.
                </Nota>
              )
            )}
          </>
        )}
      </div>
    </SegmentCard>
  );
}
