"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SearchIcon, X } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import Image from "next/image"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface Movie {
  id: string
  title: string
  poster?: string
  year?: string
  type?: string
  rating?: string
  description?: string
}

interface SearchAutocompleteProps {
  initialQuery?: string
  onSearch?: (query: string) => void
  onMovieSelect?: () => void
  className?: string
}

export function SearchAutocomplete({ initialQuery = "", onSearch, onMovieSelect, className }: SearchAutocompleteProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(initialQuery)
  const debouncedQuery = useDebounce(query, 300)
  const [suggestions, setSuggestions] = useState<Movie[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setSuggestions([])
      return
    }

    const fetchSuggestions = async () => {
      // Cancel previous fetch if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Create new abort controller for this fetch
      abortControllerRef.current = new AbortController()
      
      setLoading(true)
      try {
        const response = await fetch(
          `/api/movies/autocomplete?query=${encodeURIComponent(debouncedQuery)}`,
          { signal: abortControllerRef.current.signal }
        )
        const data = await response.json()

        if (data.results && Array.isArray(data.results)) {
          setSuggestions(data.results.slice(0, 5)) // Limit to 5 suggestions
        } else {
          setSuggestions([])
        }
      } catch (error) {
        // Only log errors that aren't from aborting
        if ((error as Error).name !== 'AbortError') {
          console.error("Error fetching suggestions:", error)
        }
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }

    fetchSuggestions()
    
    // Cleanup: abort any in-flight request
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [debouncedQuery])

  // Ensure input focus is maintained when Popover opens
  useEffect(() => {
    if (open && inputRef.current) {
      // More aggressive focus management - try multiple times
      const focusInput = () => {
        inputRef.current?.focus();
      };
      
      // Focus immediately
      focusInput();
      
      // Also focus after a small delay (for rendering)
      const timer = setTimeout(focusInput, 10);
      
      // And again after a longer delay (for any animations)
      const timer2 = setTimeout(focusInput, 100);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(timer2);
      };
    }
  }, [open, query]); // Also react to query changes

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch?.(query.trim())
      router.push(`/search?query=${encodeURIComponent(query.trim())}`)
      setOpen(false)
    }
  }, [query, onSearch, router]);

  // Keep focus when Popover closes
  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    // If closing, refocus the input
    if (!open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleSelectMovie = useCallback((movie: Movie) => {
    router.push(`/details/${movie.id}`)
    setOpen(false)
    setQuery("")
    onMovieSelect?.()
  }, [router, onMovieSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    if (e.target.value.trim().length > 0) {
      setOpen(true)
    } else {
      setOpen(false)
    }
  }, []);

  // More comprehensive key handling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent propagation for all keys to avoid focus issues
    e.stopPropagation();
    
    // Special handling for space
    if (e.key === " ") {
      // Continue normally, the stopPropagation already prevents focus loss
    }
    
    // Handle escape key to close popover but keep focus
    if (e.key === "Escape") {
      setOpen(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const clearSearch = useCallback(() => {
    setQuery("")
    setOpen(false)
    inputRef.current?.focus()
  }, []);

  // Memoize the current suggestions display
  const suggestionsList = useMemo(() => (
    <CommandList>
      <CommandEmpty>No results found</CommandEmpty>
      <CommandGroup heading="Suggestions">
        {suggestions.map((movie) => (
          <CommandItem
            key={movie.id}
            onSelect={() => handleSelectMovie(movie)}
            className="flex items-center gap-2 py-2"
            // Prevent focus stealing in CommandItem
            onMouseDown={(e) => e.preventDefault()}
          >
            <div 
              className="relative h-10 w-7 flex-shrink-0 overflow-hidden rounded"
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  e.stopPropagation();
                  router.push(`/details/${movie.id}`);
                }
              }}
              title="Ctrl+Click to view movie details"
            >
              <Image
                src={movie.poster || "/placeholder.svg"}
                alt={movie.title}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-medium">{movie.title}</span>
              {movie.year && <span className="text-xs text-muted-foreground">{movie.year}</span>}
            </div>
          </CommandItem>
        ))}
      </CommandGroup>
    </CommandList>
  ), [suggestions, handleSelectMovie]);

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <Popover open={open && suggestions.length > 0} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <div className="flex w-full gap-2">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  type="search"
                  placeholder="Search for movies..."
                  value={query}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className="w-full"
                  onFocus={() => {
                    if (query.trim().length > 1 && suggestions.length > 0) {
                      setOpen(true)
                    }
                  }}
                />
                {query && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={clearSearch}
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="sr-only">Clear search</span>
                  </Button>
                )}
              </div>
              <Button type="submit" className="hidden sm:flex">
                <SearchIcon className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button type="submit" size="icon" className="sm:hidden">
                <SearchIcon className="h-4 w-4" />
                <span className="sr-only">Search</span>
              </Button>
            </div>
          </PopoverTrigger>
          <PopoverContent 
            className="p-0 w-[var(--radix-popover-trigger-width)] max-h-[300px] overflow-y-auto" 
            align="start"
            sideOffset={5}
            onOpenAutoFocus={(e) => {
              // This is critical - prevent the PopoverContent from stealing focus
              e.preventDefault();
              // Refocus input after popover opens
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            onCloseAutoFocus={(e) => {
              // Also prevent focus stealing on close
              e.preventDefault();
              // Ensure input stays focused when popover closes
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
          >
            <Command shouldFilter={false}>
              {suggestionsList}
            </Command>
          </PopoverContent>
        </Popover>
      </form>
    </div>
  )
}

