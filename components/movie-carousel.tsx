"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Film, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Movie {
  id: string
  title: string
  poster: string | null
  year?: string
  rating?: string
  releaseDate?: string
  genres?: string[]
  localRating?: {
    average: number
    count: number
  }
}

interface MovieCarouselProps {
  title: string
  movies: Movie[]
  className?: string
  autoScroll?: boolean
  showBadges?: boolean
  itemsPerView?: number
}

export function MovieCarousel({
  title,
  movies,
  className,
  autoScroll = false,
  showBadges = true,
  itemsPerView = 6, // Default to 6 items per view
}: MovieCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  
  // Responsive items per view based on screen size
  const [responsiveItemsPerView, setResponsiveItemsPerView] = useState(itemsPerView)
  
  useEffect(() => {
    const updateItemsPerView = () => {
      // For mobile devices like iPhone, show fewer items
      if (window.innerWidth < 640) {
        setResponsiveItemsPerView(2); // Show only 2 items on small screens
      } else if (window.innerWidth < 768) {
        setResponsiveItemsPerView(3); // Show 3 items on medium screens
      } else if (window.innerWidth < 1024) {
        setResponsiveItemsPerView(4); // Show 4 items on large screens
      } else {
        setResponsiveItemsPerView(itemsPerView); // Use the prop value for larger screens
      }
    };
    
    // Initial update
    updateItemsPerView();
    
    // Update on resize
    window.addEventListener('resize', updateItemsPerView);
    
    return () => {
      window.removeEventListener('resize', updateItemsPerView);
    };
  }, [itemsPerView]);
  
  const totalPages = Math.ceil(movies.length / responsiveItemsPerView);

  const checkScrollButtons = () => {
    setCanScrollLeft(currentPage > 0)
    setCanScrollRight(currentPage < totalPages - 1)
  }

  useEffect(() => {
    checkScrollButtons()
    // Reset to first page when movies change
    setCurrentPage(0)
  }, [movies, totalPages])

  const scroll = (direction: "left" | "right") => {
    if (direction === "left" && currentPage > 0) {
      setCurrentPage(prevPage => prevPage - 1)
    } else if (direction === "right" && currentPage < totalPages - 1) {
      setCurrentPage(prevPage => prevPage + 1)
    }
  }

  // Format release date to "Coming MMM DD, YYYY"
  const formatReleaseDate = (dateString?: string) => {
    if (!dateString) return null
    
    try {
      const date = new Date(dateString)
      return `Coming ${date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })}`
    } catch (e) {
      return null
    }
  }

  // Get current page of movies
  const getCurrentPageMovies = () => {
    const startIdx = currentPage * responsiveItemsPerView
    const endIdx = startIdx + responsiveItemsPerView
    return movies.slice(startIdx, endIdx)
  }

  // Calculate item width based on container width and items per view
  const getItemWidthStyle = () => {
    // Calculate percentage width with a small gap
    return {
      width: `calc(${100 / responsiveItemsPerView}% - 12px)`,
      marginLeft: '6px',
      marginRight: '6px'
    }
  }

  return (
    <div className={cn("relative group", className)}>
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-2 md:gap-3">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h2>
          {totalPages > 1 && (
            <span className="text-xs md:text-sm text-muted-foreground">
              {currentPage + 1} / {totalPages}
            </span>
          )}
        </div>
        
        <div className="flex gap-1 md:gap-2">
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "h-7 w-7 md:h-8 md:w-8 rounded-full transition-all",
              !canScrollLeft && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous page</span>
          </Button>
          
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "h-7 w-7 md:h-8 md:w-8 rounded-full transition-all",
              !canScrollRight && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next page</span>
          </Button>
        </div>
      </div>
      
      <div
        ref={containerRef}
        className="flex flex-wrap overflow-hidden pb-4"
      >
        {getCurrentPageMovies().map((movie) => (
          <Link
            key={movie.id}
            href={`/details/${movie.id}`}
            className="group/card flex-none transition-all hover:scale-105"
            style={getItemWidthStyle()}
          >
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted">
              {movie.poster ? (
                <Image
                  src={movie.poster}
                  alt={movie.title || 'Movie poster'}
                  fill
                  sizes="(max-width: 640px) 160px, (max-width: 768px) 180px, 200px"
                  className="object-cover transition-transform group-hover/card:scale-105"
                  priority={currentPage === 0} // Priority load first page
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Film className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              
              {/* Release date badge */}
              {movie.releaseDate && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-xs text-white font-medium">
                    {formatReleaseDate(movie.releaseDate)}
                  </p>
                </div>
              )}
              
              {/* Rating badge */}
              {movie.localRating && movie.localRating.count > 0 && (
                <div className="absolute top-2 right-2 bg-black/60 rounded-md px-1.5 py-1 flex items-center">
                  <Star className="h-3 w-3 text-primary fill-primary mr-0.5" />
                  <span className="text-xs text-white font-medium">{movie.localRating.average}/5</span>
                </div>
              )}
            </div>
            
            <div className="mt-2">
              <h3 className="font-medium text-sm line-clamp-1 group-hover/card:text-primary transition-colors">
                {movie.title}
              </h3>
              <div className="flex items-center text-xs text-muted-foreground">
                <span>{movie.year || "Coming Soon"}</span>
              </div>
              
              {showBadges && movie.genres && movie.genres.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 max-w-full overflow-hidden">
                  {movie.genres.slice(0, 2).map((genre, i) => (
                    <Badge key={i} variant="outline" className="px-1 text-[10px] h-4 truncate">
                      {genre}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

