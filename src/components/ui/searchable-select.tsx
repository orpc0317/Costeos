"use client"

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDownIcon, CheckIcon, SearchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UI_THEME } from '@/lib/theme'

export interface SelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  error?: boolean
  autoFocus?: boolean
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  className,
  disabled = false,
  error = false,
  autoFocus = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value)

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
    }
  }, [isOpen])

  useEffect(() => {
    if (autoFocus && !disabled && containerRef.current) {
      const button = containerRef.current.querySelector('button');
      if (button) {
        setTimeout(() => button.focus(), 10);
      }
    }
  }, [autoFocus, disabled]);

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button
        type="button"
        aria-disabled={disabled}
        autoFocus={autoFocus}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault();
            return;
          }
          setIsOpen(!isOpen);
        }}
        className={cn(
          UI_THEME.forms.inputBase,
          "flex w-full items-center justify-between shadow-sm ring-offset-background aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
          !selectedOption && "text-muted-foreground",
          error && "border-red-400 focus:ring-red-400 focus-visible:ring-red-400"
        )}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDownIcon className="h-4 w-4 opacity-50" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
          <div className="sticky top-0 z-10 bg-popover px-2 py-2 border-b">
            <div className="relative">
              <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                className="w-full bg-transparent pl-8 pr-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          
          <div className="p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No se encontraron resultados.
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={cn(
                    "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                    value === opt.value ? "bg-accent text-accent-foreground font-medium" : ""
                  )}
                  onClick={() => {
                    onChange(opt.value)
                    setIsOpen(false)
                  }}
                >
                  {value === opt.value && (
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      <CheckIcon className="h-4 w-4" />
                    </span>
                  )}
                  <span className="truncate">{opt.label}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
