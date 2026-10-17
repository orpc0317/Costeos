import * as React from "react"
import { cn } from "@/lib/utils"
import { UI_THEME } from "@/lib/theme"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        UI_THEME.forms.inputBase,
        "h-auto min-h-16 py-1.5 leading-snug resize-none",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
