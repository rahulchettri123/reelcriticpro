"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Star, TrendingUp, Film, Calendar } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { MovieCarousel } from "@/components/movie-carousel"

// Loading placeholder for carousels
const CarouselSkeleton = () => (
  <div className="h-[250px] sm:h-[300px] flex items-center justify-center">
    <div className="animate-spin h-8 w-8 sm:h-10 sm:w-10 rounded-full border-4 border-primary/20 border-t-primary"></div>
  </div>
)

export default function Home() {
  const { isAuthenticated } = useAuth()
  const [popularMovies, setPopularMovies] = useState<any[]>([])
  const [upcomingMovies, setUpcomingMovies] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(true)
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now())

  // Fetch popular movies
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchPopularMovies = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/movies/popular?limit=18&forceRefresh=false&_=${lastRefreshTime}`, {
          signal,
          cache: 'no-store' // Use no-store to avoid caching
        })
        const data = await response.json()

        if (data.movies && Array.isArray(data.movies)) {
          // Process the movie data to ensure consistent format
          const processedMovies = data.movies.map((movie: any) => ({
            id: movie.id || movie.imdbId || "unknown",
            title: movie.title || movie.primaryTitle || movie.originalTitle || "Unknown Title",
            poster:
              movie.poster ||
              movie.primaryImage ||
              `/placeholder.svg?height=450&width=300&text=${encodeURIComponent(movie.title || movie.primaryTitle || "Movie")}`,
            year: movie.year || movie.startYear || movie.releaseDate?.split("-")[0] || "Unknown",
            rating: movie.rating || movie.averageRating || "N/A",
            genres: movie.genres || [],
            localRating: movie.localRating || null,
          }))

          console.log(`Fetched ${processedMovies.length} trending movies for carousel`)
          setPopularMovies(processedMovies)
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error("Error fetching popular movies:", error)
        }
      } finally {
        setIsLoading(false)
      }
    }

    // Fetch upcoming movies
    const fetchUpcomingMovies = async () => {
      setIsLoadingUpcoming(true)
      try {
        const response = await fetch(`/api/movies/upcoming?limit=18&forceRefresh=false&_=${lastRefreshTime}`, {
          signal,
          cache: 'no-store' // Use no-store to avoid caching
        })
        const data = await response.json()

        if (data.movies && Array.isArray(data.movies)) {
          console.log(`Fetched ${data.movies.length} upcoming movies for carousel`)
          setUpcomingMovies(data.movies.map((movie: any) => ({
            id: movie.id || movie.imdbId || "unknown",
            title: movie.title || movie.primaryTitle || movie.originalTitle || "Unknown Title",
            poster:
              movie.poster ||
              movie.primaryImage ||
              `/placeholder.svg?height=450&width=300&text=${encodeURIComponent(movie.title || movie.primaryTitle || "Movie")}`,
            year: movie.year || movie.startYear || movie.releaseDate?.split("-")[0] || "Unknown",
            rating: movie.rating || movie.averageRating || "N/A",
            genres: movie.genres || [],
            releaseDate: movie.releaseDate,
            localRating: movie.localRating || null,
          })))
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error("Error fetching upcoming movies:", error)
        }
      } finally {
        setIsLoadingUpcoming(false)
      }
    }

    // Execute fetches in parallel for better performance
    Promise.all([fetchPopularMovies(), fetchUpcomingMovies()]);

    // Cleanup function
    return () => {
      controller.abort();
    };
  }, [lastRefreshTime])

  // Function to refresh data - can be called after a user adds a review
  const refreshMovies = () => {
    setLastRefreshTime(Date.now());
  }

  // Listen for the custom event that's fired after a review is added
  useEffect(() => {
    const handleReviewAdded = () => {
      refreshMovies();
    };

    window.addEventListener('reviewAdded', handleReviewAdded);
    
    // Check for recently added reviews on page load
    const checkRecentReviews = async () => {
      const lastVisit = localStorage.getItem('lastHomeVisit');
      const now = new Date().toISOString();
      
      if (!lastVisit || (new Date(now).getTime() - new Date(lastVisit).getTime() > 60000)) {
        // If it's been more than a minute since last visit, refresh movies
        refreshMovies();
      }
      
      localStorage.setItem('lastHomeVisit', now);
    };
    
    checkRecentReviews();
    
    return () => {
      window.removeEventListener('reviewAdded', handleReviewAdded);
    };
  }, []);

  return (
    <div className="py-3 md:py-6 px-3 md:px-4 max-w-[1400px] mx-auto">
      {/* Hero Section */}
      <section className="mb-6 md:mb-10">
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-8 items-center">
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Discover, Review, Connect with Fellow Movie Critics
            </h1>
            <p className="text-muted-foreground md:text-xl">
              Join our community of film enthusiasts to share your thoughts, discover new movies, and connect with
              like-minded critics.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg">
                <Link href="/critics">Visit Critics Feed</Link>
              </Button>
              {!isAuthenticated && (
                <Button asChild variant="outline" size="lg">
                  <Link href="/register">Join Community</Link>
                </Button>
              )}
            </div>
          </div>
          <div className="relative aspect-video overflow-hidden rounded-xl">
            <Image
              src="/placeholder.svg?height=600&width=800"
              alt="Movie collage"
              width={800}
              height={600}
              className="object-cover"
              priority
            />
          </div>
        </div>
      </section>

      {/* Upcoming Movies Carousel */}
      <section className="mb-8 md:mb-10">
        <div className="flex items-center gap-2 mb-2 md:mb-3">
          <Calendar className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Coming Soon</h2>
        </div>
        <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
          Be the first to know about upcoming releases
        </p>
        {isLoadingUpcoming ? (
          <CarouselSkeleton />
        ) : (
          <MovieCarousel 
            title="" 
            movies={upcomingMovies} 
            showBadges={true}
            itemsPerView={6}
          />
        )}
      </section>

      {/* Trending Movies Carousel */}
      <section className="mb-8 md:mb-10">
        <div className="flex items-center gap-2 mb-2 md:mb-3">
          <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Trending Now</h2>
        </div>
        <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
          The most popular movies everyone is talking about
        </p>
        {isLoading ? (
          <CarouselSkeleton />
        ) : (
          <MovieCarousel 
            title="" 
            movies={popularMovies} 
            showBadges={true}
            itemsPerView={6}
          />
        )}
      </section>

      {/* CTA Section - hidden on smaller screens for better focus on movies */}
      <section className="hidden md:block rounded-xl bg-muted p-4 md:p-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Join Our Community of Movie Critics</h2>
            <p className="text-muted-foreground">
              Create an account to share your reviews, follow other critics, and build your reputation in the film
              community.
            </p>
            {!isAuthenticated && (
              <Button asChild size="lg">
                <Link href="/register">Sign Up Now</Link>
              </Button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-background">
              <p className="text-3xl font-bold">500+</p>
              <p className="text-sm text-muted-foreground text-center">Movies Reviewed</p>
            </div>
            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-background">
              <p className="text-3xl font-bold">2K+</p>
              <p className="text-sm text-muted-foreground text-center">Active Users</p>
            </div>
            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-background">
              <p className="text-3xl font-bold">10K+</p>
              <p className="text-sm text-muted-foreground text-center">Reviews Written</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

