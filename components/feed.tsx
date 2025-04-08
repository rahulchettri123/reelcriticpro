"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { FeedPost } from "@/components/feed-post"
import { CreateReview } from "@/components/create-review"
import { Button } from "@/components/ui/button"
import { Loader2, Filter, Star, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface FeedProps {
  initialReviews?: any[]
  limit?: number
}

// Common movie genres
const movieGenres = [
  "Action", "Adventure", "Animation", "Comedy", "Crime", 
  "Documentary", "Drama", "Family", "Fantasy", "History",
  "Horror", "Music", "Mystery", "Romance", "Science Fiction", 
  "Thriller", "War", "Western"
]

export function Feed({ initialReviews = [], limit: propLimit }: FeedProps) {
  const { isAuthenticated } = useAuth()
  const [reviews, setReviews] = useState<any[]>(initialReviews)
  const [loading, setLoading] = useState(initialReviews.length === 0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const observerTarget = useRef<HTMLDivElement>(null)
  const limit = propLimit || 5
  
  // Filter states
  const [filterRating, setFilterRating] = useState<string>("all")
  const [filterGenres, setFilterGenres] = useState<string[]>([])
  const [filtersApplied, setFiltersApplied] = useState(false)

  const fetchReviews = useCallback(async (pageNumber = 1, replace = true) => {
    const loadState = pageNumber === 1 ? setLoading : setLoadingMore
    loadState(true)
    setError(null)
    
    let url = `/api/reviews?limit=${limit}&skip=${(pageNumber - 1) * limit}`
    
    // Add rating filter
    if (filterRating !== "all") {
      url += `&rating=${filterRating}`
    }
    
    // Add genre filter
    if (filterGenres.length > 0) {
      url += `&genres=${filterGenres.join(',')}`
    }
    
    try {
      // Add a cache-busting timestamp to prevent caching
      const cacheBuster = new Date().getTime();
      url += `&_cb=${cacheBuster}`;
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()

      if (data.reviews) {
        if (replace) {
          setReviews(data.reviews)
        } else {
          setReviews(prev => [...prev, ...data.reviews])
        }
        
        // Check if there are more reviews to load
        setHasMore(data.pagination?.total > pageNumber * limit)
      }
    } catch (error) {
      console.error("Error fetching reviews:", error)
      setError("Failed to load reviews. Please try again.")
    } finally {
      loadState(false)
    }
  }, [filterRating, filterGenres, limit])

  // Apply filters
  const handleApplyFilters = useCallback(() => {
    setPage(1)
    setFiltersApplied(filterRating !== "all" || filterGenres.length > 0)
    fetchReviews(1, true)
  }, [fetchReviews, filterRating, filterGenres])

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setFilterRating("all")
    setFilterGenres([])
    setFiltersApplied(false)
    setPage(1)
    fetchReviews(1, true)
  }, [fetchReviews])

  // Add or remove genre from filter
  const toggleGenreFilter = useCallback((genre: string) => {
    setFilterGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre)
      } else {
        return [...prev, genre]
      }
    })
  }, [])

  // Listen for the refreshFeed event
  useEffect(() => {
    const handleRefreshFeed = () => {
      console.log("Refreshing feed from custom event");
      setPage(1);
      fetchReviews(1, true);
    };
    
    window.addEventListener('refreshFeed', handleRefreshFeed);
    
    return () => {
      window.removeEventListener('refreshFeed', handleRefreshFeed);
    };
  }, [fetchReviews]);

  // Initialize the intersection observer
  useEffect(() => {
    if (!hasMore || loadingMore) return;
    
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore()
        }
      },
      { threshold: 1.0 }
    )
    
    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }
    
    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, loadingMore])

  useEffect(() => {
    // If we have initial reviews, don't fetch again
    if (initialReviews.length > 0) {
      setReviews(initialReviews)
      setLoading(false)
    } else {
      fetchReviews(1)
    }
  }, [initialReviews.length, fetchReviews])

  const loadMore = useCallback(() => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchReviews(nextPage, false)
  }, [page, fetchReviews])

  const handleReviewCreated = useCallback(() => {
    // Refresh feed from the beginning
    console.log("Review created, refreshing feed");
    setPage(1)
    fetchReviews(1)
  }, [fetchReviews])

  return (
    <div className="space-y-6">
      <CreateReview onReviewCreated={handleReviewCreated} />
      
      {/* Filter controls - Sticky */}
      <div className="sticky top-[64px] z-20 pt-0 pb-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-wrap items-center justify-between gap-2 border rounded-lg p-2 sm:p-3 bg-background shadow-sm">
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <h3 className="text-xs sm:text-sm font-medium">Filters:</h3>
            
            {/* Rating filter */}
            <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger className="w-[120px] h-8 text-xs sm:text-sm">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars ★★★★★</SelectItem>
                  <SelectItem value="4">4+ Stars ★★★★☆</SelectItem>
                  <SelectItem value="3">3+ Stars ★★★☆☆</SelectItem>
                  <SelectItem value="2">2+ Stars ★★☆☆☆</SelectItem>
                  <SelectItem value="1">1+ Star ★☆☆☆☆</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            
            {/* Genre filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm">
                  <Filter className="h-3.5 w-3.5 mr-1 sm:mr-2" />
                  Genres {filterGenres.length > 0 && `(${filterGenres.length})`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-3" align="start">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Select Genres</h4>
                  <Separator />
                  <div className="flex flex-wrap gap-1.5">
                    {movieGenres.map(genre => (
                      <Badge 
                        key={genre} 
                        variant={filterGenres.includes(genre) ? "default" : "outline"}
                        className="cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => toggleGenreFilter(genre)}
                      >
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Applied filters badges */}
            {filtersApplied && (
              <div className="flex flex-wrap gap-1.5 ml-2">
                {filterRating !== "all" && (
                  <Badge 
                    variant="secondary" 
                    className="flex items-center gap-1"
                  >
                    {filterRating}+ {Array.from({ length: parseInt(filterRating, 10) }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-current" />
                    ))}
                    <button 
                      className="ml-1 rounded-full hover:bg-muted p-0.5"
                      onClick={() => {
                        setFilterRating("all");
                        setFiltersApplied(filterGenres.length > 0);
                        fetchReviews(1, true);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {filterGenres.map(genre => (
                  <Badge 
                    key={genre}
                    variant="secondary" 
                    className="flex items-center gap-1"
                  >
                    {genre}
                    <button 
                      className="ml-1 rounded-full hover:bg-muted p-0.5"
                      onClick={() => {
                        toggleGenreFilter(genre);
                        setFiltersApplied(filterRating !== "all" || filterGenres.filter(g => g !== genre).length > 0);
                        fetchReviews(1, true);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex gap-1 sm:gap-2">
            <Button 
              onClick={handleApplyFilters} 
              size="sm"
              variant="default"
              className="h-8 text-xs sm:text-sm px-2 sm:px-3"
            >
              Apply
            </Button>
            
            {filtersApplied && (
              <Button 
                onClick={handleClearFilters} 
                size="sm"
                variant="outline"
                className="h-8 text-xs sm:text-sm px-2 sm:px-3"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Reviews feed */}
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
            {error}
            <Button onClick={() => fetchReviews(1)} variant="link" className="px-0 ml-2">
              Try again
            </Button>
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <h3 className="text-xl font-medium mb-2">No reviews found</h3>
            <p className="text-muted-foreground mb-6">
              {filtersApplied 
                ? "Try changing or clearing your filters" 
                : "Be the first to share your thoughts on a movie!"}
            </p>
            {!isAuthenticated && (
              <Button asChild>
                <Link href="/login">Login to Post Reviews</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.slice(0, propLimit).map((review: any) => (
              <FeedPost key={review._id} review={review} onLike={() => fetchReviews(page, true)} />
            ))}
          </div>
        )}
        
        {/* Show the load more button only on the full feed page, not on limited preview */}
        {!propLimit && !loading && reviews.length > 0 && hasMore && (
          <div 
            ref={observerTarget} 
            className="flex justify-center pt-4"
          >
            <Button 
              onClick={loadMore} 
              variant="outline" 
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading more...
                </>
              ) : (
                "Load More"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
} 