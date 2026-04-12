"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SwitchProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, ...props }, ref) => (
    <div className={cn("relative inline-flex items-center", className)}>
      <input
        type="checkbox"
        className="peer sr-only"
        ref={ref}
        {...props}
      />
      <div
        className={cn(
          "peer h-6 w-11 cursor-pointer rounded-full bg-gray-200 transition-all",
          "after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-['']",
          "peer-checked:bg-blue-600 peer-checked:after:translate-x-full",
          "peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
        onClick={(e) => {
          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
          if (input) input.click();
        }}
      />
    </div>
  )
)
Switch.displayName = "Switch"

export { Switch }
