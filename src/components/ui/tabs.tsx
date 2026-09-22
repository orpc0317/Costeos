"use client"

import React, { useRef, useState, useEffect, useCallback } from "react"
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        // Nota: border-b se mueve al wrapper de ScrollableTabsList
        // para que el borde cubra todo el ancho incluyendo las flechas.
        // Aquí se usa flex-1 min-w-0 para ocupar el espacio disponible.
        line: "flex-1 min-w-0 bg-transparent p-0 pb-px h-auto gap-4 overflow-x-auto scrollbar-none justify-start rounded-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// ─── Wrapper con flechas de scroll (variant="line") ───────────────────────────
// Los botones ‹ / › son HERMANOS FLEX del TabsList.
// El wrapper tiene flex + items-center → los botones se centran automáticamente
// a la misma altura que los labels de las pestañas, sin cálculos CSS.
// El border-b vive en el wrapper para cubrir todo el ancho.

interface ScrollableTabsListProps {
  className?: string
  children?: React.ReactNode
  [key: string]: unknown
}

function ScrollableTabsList({ className, ...props }: ScrollableTabsListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const [canLeft,  setCanLeft]  = useState(false)
  const [canRight, setCanRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 2)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }, [])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    checkScroll()
    el.addEventListener("scroll", checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", checkScroll)
      ro.disconnect()
    }
  }, [checkScroll])

  const scroll = (dir: "left" | "right") => {
    const el = listRef.current
    if (!el) return
    el.scrollBy({ left: dir === "right" ? 120 : -120, behavior: "smooth" })
  }

  // El wrapper es flex + items-center: todos los hijos se centran verticalmente.
  // border-b aquí en lugar del TabsList para que cubra el ancho completo.
  // className (ej. "mb-4 shrink-0") va en el wrapper, no en el TabsList.
  return (
    <div className={cn("flex items-center border-b w-full", className)}>

      {/* Flecha izquierda — hermano flex, centrado automáticamente por items-center */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => scroll("left")}
        className={cn(
          "shrink-0 flex items-center justify-center transition-all duration-150",
          canLeft
            ? "w-6 opacity-100 pointer-events-auto"
            : "w-0 opacity-0 pointer-events-none overflow-hidden"
        )}
      >
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white border border-slate-300 shadow-sm text-slate-600 hover:text-slate-900 hover:border-slate-400">
          <ChevronLeft className="h-3 w-3" strokeWidth={2.5} />
        </span>
      </button>

      {/* TabsList — flex-1 para llenar el espacio restante */}
      <TabsPrimitive.List
        ref={listRef as any}
        data-slot="tabs-list"
        data-variant="line"
        className={cn(tabsListVariants({ variant: "line" })) as string}
        {...props}
      />

      {/* Flecha derecha — hermano flex, centrado automáticamente por items-center */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => scroll("right")}
        className={cn(
          "shrink-0 flex items-center justify-center transition-all duration-150",
          canRight
            ? "w-6 opacity-100 pointer-events-auto"
            : "w-0 opacity-0 pointer-events-none overflow-hidden"
        )}
      >
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white border border-slate-300 shadow-sm text-slate-600 hover:text-slate-900 hover:border-slate-400">
          <ChevronRight className="h-3 w-3" strokeWidth={2.5} />
        </span>
      </button>

    </div>
  )
}

// ─── TabsList público ─────────────────────────────────────────────────────────
// variant="line"    → usa ScrollableTabsList (con flechas centradas)
// variant="default" → renderizado normal sin flechas

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  if (variant === "line") {
    const strClass = typeof className === "string" ? className : undefined
    return <ScrollableTabsList className={strClass} {...props} />
  }
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=default]/tabs-list:data-active:shadow-sm",
        "group-data-[variant=default]/tabs-list:data-active:bg-background group-data-[variant=default]/tabs-list:data-active:text-blue-600 dark:group-data-[variant=default]/tabs-list:data-active:border-input dark:group-data-[variant=default]/tabs-list:data-active:bg-input/30 dark:group-data-[variant=default]/tabs-list:data-active:text-blue-600",
        "group-data-[variant=line]/tabs-list:flex-none group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:border-0 group-data-[variant=line]/tabs-list:border-b-[3px] group-data-[variant=line]/tabs-list:border-transparent group-data-[variant=line]/tabs-list:px-4 group-data-[variant=line]/tabs-list:py-2 group-data-[variant=line]/tabs-list:h-auto group-data-[variant=line]/tabs-list:bg-transparent",
        "group-data-[variant=line]/tabs-list:data-active:border-blue-600 group-data-[variant=line]/tabs-list:data-active:text-blue-600 group-data-[variant=line]/tabs-list:data-active:bg-transparent group-data-[variant=line]/tabs-list:data-active:shadow-none",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
