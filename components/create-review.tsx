"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Star, Search, X, Film } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"

interface Movie {
  id: string
  title: string
  poster?: string
  year?: string
}

export function CreateReview({ onReviewCreated }: { onReviewCreated?: () => void }) {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [searchResults, setSearchResults] = useState<Movie[]>([])
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [reviewContent, setReviewContent] = useState("")
  const [rating, setRating] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (debouncedSearchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }

    const searchMovies = async () => {
      setIsSearching(true)
      try {
        const response = await fetch(`/api/movies/autocomplete?query=${encodeURIComponent(debouncedSearchQuery)}`)
        const data = await response.json()

        if (data.results && Array.isArray(data.results)) {
          setSearchResults(data.results.slice(0, 5)) // Limit to 5 results
        } else {
          setSearchResults([])
        }
      } catch (error) {
        console.error("Error searching movies:", error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }

    searchMovies()
  }, [debouncedSearchQuery])

  // Ensure input focus is maintained when Popover opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
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
  }, [isOpen, searchQuery]); // Also react to searchQuery changes

  // Keep focus when Popover closes
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    // If closing, refocus the input
    if (!open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleMovieSelect = (movie: Movie) => {
    setSelectedMovie(movie);
    setSearchQuery("");
    setIsOpen(false);
    // Focus away from input after selection to avoid any focus issues
    document.body.focus();
  };

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
      setIsOpen(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleStarClick = (value: number) => {
    setRating(value === rating ? 0 : value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isAuthenticated) {
      toast({
        title: "Not logged in",
        description: "Please log in to post a review",
        variant: "destructive",
      })
      return
    }

    if (!selectedMovie) {
      toast({
        title: "Movie required",
        description: "Please select a movie to review",
        variant: "destructive",
      })
      return
    }

    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please rate the movie from 1 to 5 stars",
        variant: "destructive",
      })
      return
    }

    if (!reviewContent.trim()) {
      toast({
        title: "Review content required",
        description: "Please write something about the movie",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movie: selectedMovie.id,
          movieTitle: selectedMovie.title,
          moviePoster: selectedMovie.poster,
          rating,
          content: reviewContent,
        }),
        credentials: "include",
      })

      if (response.ok) {
        // Reset form
        setSelectedMovie(null)
        setReviewContent("")
        setRating(0)
        
        // Show success toast
        toast({
          title: "Review posted!",
          description: "Your review has been shared to the feed",
        })
        
        // Dispatch custom event to refresh movie ratings on home page
        window.dispatchEvent(new CustomEvent('reviewAdded', {
          detail: {
            movieId: selectedMovie.id,
            rating: rating
          }
        }));
        
        // Add a slight delay before refreshing the feed to ensure database update propagation
        setTimeout(() => {
          // Callback to refresh feed
          onReviewCreated?.()
          
          // Manually trigger a feed refresh by setting page to 1 and re-fetching
          window.dispatchEvent(new CustomEvent('refreshFeed'));
        }, 1000);
        
        // Remove redirection to profile
        // Stay on the current page to see the new review in the feed
      } else {
        const data = await response.json()
        toast({
          title: "Failed to post review",
          description: data.error || "Please try again later",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error posting review:", error)
      toast({
        title: "Error",
        description: "Failed to post your review. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="mb-4 text-muted-foreground">Sign in to share your movie reviews</p>
          <Button onClick={() => router.push('/login')}>Log In</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3 pt-4 px-4 sm:px-6">
        <CardTitle className="text-lg sm:text-xl">Create Review</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 px-4 sm:px-6">
          <div className="flex items-start gap-3">
            <Avatar className="hidden sm:flex">
              <AvatarImage src={user?.avatar || "/placeholder.svg"} alt={user?.name || "User avatar"} />
              <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              {!selectedMovie ? (
                <Popover open={isOpen} onOpenChange={handleOpenChange}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Input
                        ref={inputRef}
                        placeholder="Search for a movie to review..."
                        value={searchQuery}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setSearchQuery(newValue);
                          if (newValue.length > 1) {
                            setIsOpen(true);
                          } else {
                            setIsOpen(false);
                          }
                        }}
                        onKeyDown={handleKeyDown}
                        onFocus={() => {
                          if (searchQuery.length > 1) {
                            setIsOpen(true);
                          }
                        }}
                        className="w-full py-2 text-base"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        type="button"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={(e) => {
                          // Prevent button from stealing focus
                          e.preventDefault();
                          inputRef.current?.focus();
                        }}
                      >
                        {isSearching ? (
                          <div className="animate-spin">
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </div>
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[300px] overflow-y-auto" 
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
                      <CommandList>
                        <CommandEmpty>No results found</CommandEmpty>
                        <CommandGroup heading="Movies">
                          {searchResults.map((movie) => (
                            <CommandItem
                              key={movie.id}
                              onSelect={() => handleMovieSelect(movie)}
                              className="flex items-center gap-3 py-3 cursor-pointer"
                              // Prevent focus stealing in CommandItem
                              onMouseDown={(e) => e.preventDefault()}
                            >
                              <div 
                                className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded shadow-sm"
                                onClick={(e) => {
                                  if (e.ctrlKey || e.metaKey) {
                                    e.stopPropagation();
                                    router.push(`/details/${movie.id}`);
                                  }
                                }}
                                title="Ctrl+Click to view movie details"
                              >
                                {movie.poster ? (
                                  <Image
                                    src={movie.poster}
                                    alt={movie.title}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-muted">
                                    <Film className="h-4 w-4" />
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col flex-1">
                                <p className="font-medium text-sm sm:text-base">{movie.title}</p>
                                {movie.year && <p className="text-xs text-muted-foreground">{movie.year}</p>}
                                <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Ctrl+Click for details</p>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="flex items-center gap-3 rounded-md border p-3">
                  <div className="relative h-24 w-16 overflow-hidden rounded shadow-md">
                    {selectedMovie.poster ? (
                      <Image
                        src={selectedMovie.poster}
                        alt={selectedMovie.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted">
                        <Film className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-base">{selectedMovie.title}</p>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs"
                        onClick={() => router.push(`/details/${selectedMovie.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                    {selectedMovie.year && <p className="text-xs text-muted-foreground">{selectedMovie.year}</p>}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => setSelectedMovie(null)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove movie</span>
                  </Button>
                </div>
              )}

              {selectedMovie && (
                <>
                  <div className="flex items-center justify-center gap-2 my-4">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Button
                          key={star}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-10 w-10 sm:h-8 sm:w-8 p-0"
                          onClick={() => handleStarClick(star)}
                        >
                          <Star
                            className={`h-7 w-7 sm:h-6 sm:w-6 ${
                              rating >= star ? "fill-primary text-primary" : "text-muted-foreground"
                            }`}
                          />
                          <span className="sr-only">Rate {star} stars</span>
                        </Button>
                      ))}
                    </div>
                    {rating > 0 && (
                      <span className="ml-2 text-sm font-medium">{rating}/5</span>
                    )}
                  </div>

                  {/* Desktop layout (side-by-side) */}
                  <div className="hidden md:flex gap-2 mt-3">
                    <Textarea
                      placeholder="Write your review..."
                      value={reviewContent}
                      onChange={(e) => setReviewContent(e.target.value)}
                      className="min-h-[100px] flex-1"
                    />
                    <div className="flex flex-col gap-2 justify-start">
                      <Button 
                        type="submit" 
                        disabled={!selectedMovie || rating === 0 || !reviewContent.trim() || isSubmitting}
                        className="whitespace-nowrap"
                      >
                        {isSubmitting ? "Posting..." : "Post Review"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setSelectedMovie(null)
                          setReviewContent("")
                          setRating(0)
                        }}
                        className="whitespace-nowrap"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>

                  {/* Mobile layout (stacked) */}
                  <div className="flex flex-col md:hidden gap-3 mt-3">
                    <Textarea
                      placeholder="Write your review..."
                      value={reviewContent}
                      onChange={(e) => setReviewContent(e.target.value)}
                      className="min-h-[150px] w-full p-3 text-base"
                    />
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        disabled={!selectedMovie || rating === 0 || !reviewContent.trim() || isSubmitting}
                        className="flex-1"
                      >
                        {isSubmitting ? "Posting..." : "Post Review"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setSelectedMovie(null)
                          setReviewContent("")
                          setRating(0)
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </form>
    </Card>
  )
} 