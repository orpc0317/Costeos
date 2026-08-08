import React from 'react';
import { Clock, Users } from 'lucide-react';
import type { ErpTurno } from '@/lib/erp';

interface TurnoCardProps {
  turno: ErpTurno;
  cantidadTurnos?: number;
}

export function TurnoCard({ turno, cantidadTurnos = 1 }: TurnoCardProps) {
  const diasSemana = [
    { label: 'L', name: 'lunes',     val: turno.lunes,     hrs: turno.lunesHoras },
    { label: 'M', name: 'martes',    val: turno.martes,    hrs: turno.martesHoras },
    { label: 'M', name: 'miercoles', val: turno.miercoles, hrs: turno.miercolesHoras },
    { label: 'J', name: 'jueves',    val: turno.jueves,    hrs: turno.juevesHoras },
    { label: 'V', name: 'viernes',   val: turno.viernes,   hrs: turno.viernesHoras },
    { label: 'S', name: 'sabado',    val: turno.sabado,    hrs: turno.sabadoHoras },
    { label: 'D', name: 'domingo',   val: turno.domingo,   hrs: turno.domingoHoras },
  ];

  const totalHoras = diasSemana.reduce((sum, dia) => sum + (dia.val === 1 ? (dia.hrs || 0) : 0), 0);
  const totalPersonas = turno.personas * cantidadTurnos;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-700">
          <Clock className="w-4 h-4 text-blue-500" />
          <span className="font-semibold text-sm">Detalles Turno</span>
        </div>
        <div className="flex items-center gap-1.5 bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium">
          <Users className="w-3.5 h-3.5" />
          <span>{totalPersonas} {totalPersonas === 1 ? 'Persona' : 'Personas'}</span>
        </div>
      </div>
      
      <div className="flex gap-1.5 sm:gap-2 justify-between">
        {diasSemana.map((dia) => {
          const isActivo = dia.val === 1;
          return (
            <div 
              key={dia.name} 
              className={`flex flex-col items-center justify-center w-12 h-10 rounded-md border ${
                isActivo 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' 
                  : 'bg-red-50 border-red-200 text-red-400'
              }`}
            >
              <span className="text-[11px] font-bold leading-none mb-1">{dia.label}</span>
              <span className={`text-[9px] font-medium leading-none ${isActivo ? 'text-emerald-600' : 'text-red-400'}`}>
                {isActivo ? `${dia.hrs}h` : '0h'}
              </span>
            </div>
          );
        })}
      </div>
      
      <div className="mt-3 flex justify-between items-center border-t border-slate-200 pt-3">
        <span className="text-xs text-slate-500 font-medium">
          Horas del Turno: <span className="text-slate-700">{totalHoras}h</span>
        </span>
        <span className="text-xs text-slate-500 font-medium">
          Total HH Semanal: <span className="text-slate-900 font-bold">{totalHoras * totalPersonas}h</span>
        </span>
      </div>
    </div>
  );
}
