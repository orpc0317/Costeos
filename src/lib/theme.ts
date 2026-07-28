export const UI_THEME = {
  // ─── FORMULARIOS (Estilo ERP) ────────────────────────────────────────────────
  forms: {
    // Apariencia general de las cajas de texto (Input, Select, SearchableSelect)
    // - h-8: altura del input (más compacto)
    // - rounded-sm: esquinas casi cuadradas (2px)
    // - text-sm: tamaño de letra principal
    inputBase: "h-8 w-full min-w-0 rounded-sm border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 data-[view-mode=true]:border-transparent data-[view-mode=true]:bg-slate-100 dark:data-[view-mode=true]:bg-slate-800/50 data-[view-mode=true]:text-slate-900 dark:data-[view-mode=true]:text-slate-100 data-[view-mode=true]:shadow-none data-[view-mode=true]:pointer-events-none data-[view-mode=true]:opacity-100",
    
    // Apariencia de los títulos de los campos
    // - text-xs: tamaño pequeño pero legible
    // - font-semibold: peso fuerte
    // - text-slate-600: color gris sutil para que resalte más el valor ingresado
    labelBase: "flex items-center gap-2 text-xs font-semibold text-slate-600 leading-none select-none",
  }
}
