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
  className?: string
}

export function SearchAutocomplete({ initialQuery = "", onSearch, className }: SearchAutocompleteProps) {
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

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch?.(query.trim())
      router.push(`/search?query=${encodeURIComponent(query.trim())}`)
      setOpen(false)
    }
  }, [query, onSearch, router]);

  const handleSelectMovie = useCallback((movie: Movie) => {
    router.push(`/details/${movie.id}`)
    setOpen(false)
    setQuery("")
  }, [router]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    if (e.target.value.trim().length > 0) {
      setOpen(true)
    } else {
      setOpen(false)
    }
  }, []);

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
          >
            <div className="relative h-10 w-7 flex-shrink-0 overflow-hidden rounded">
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
        <Popover open={open && suggestions.length > 0} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="flex w-full gap-2">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  type="search"
                  placeholder="Search for movies..."
                  value={query}
                  onChange={handleInputChange}
                  className="w-full"
                  onFocus={() => {
                    if (query.trim().length > 1 && suggestions.length > 0) {
                      setOpen(true)
                    }
                  }}
                />
              </div>
              <Button type="submit">
                <SearchIcon className="h-4 w-4 mr-2" />
                Search
              </Button>
              {query && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={clearSearch}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Clear search</span>
                </Button>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
            <Command>
              {suggestionsList}
            </Command>
          </PopoverContent>
        </Popover>
      </form>
    </div>
  )
}

