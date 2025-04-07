"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Star, Heart, Bookmark, Share, MessageSquare, Clock, Edit, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

export default function MovieDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const movieId = params.id as string
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()

  const [movie, setMovie] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isWatchlist, setIsWatchlist] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Function to fetch movie details from API
  const fetchMovieDetails = async (refresh = false) => {
    setLoading(true)
    setError(null)
    if (refresh) {
      setIsRefreshing(true)
    }

    try {
      console.log(`Fetching details for movie ID: ${movieId}${refresh ? " (with refresh)" : ""}`)
      const response = await fetch(`/api/movies/details?id=${movieId}${refresh ? "&refresh=true" : ""}`, {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`API returned status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Movie data received:", data)
      
      if (data.movie) {
        console.log("Movie data received:", data.movie)
        setMovie(data.movie)

        // Track view
        if (isAuthenticated) {
          try {
            await fetch("/api/movies/track-view", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ movieId }),
              credentials: "include",
            })
          } catch (trackError) {
            console.error("Error tracking view:", trackError)
          }
        }
      } else {
        console.error("No movie data returned:", data)
        setError("Failed to load movie details")
      }
    } catch (error) {
      console.error("Error fetching movie details:", error)
      setError("An error occurred while loading movie details")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // Fetch movie details directly from API
  useEffect(() => {
    if (movieId) {
      fetchMovieDetails()
    }
  }, [movieId, isAuthenticated])

  // Fetch reviews for this movie
  useEffect(() => {
    const fetchReviews = async () => {
      setReviewsLoading(true)
      try {
        const response = await fetch(`/api/reviews?movie=${movieId}`, {
          credentials: "include",
        })
        const data = await response.json()
        setReviews(data.reviews || [])
      } catch (error) {
        console.error("Error fetching reviews:", error)
      } finally {
        setReviewsLoading(false)
      }
    }

    if (movieId) {
      fetchReviews()
    }
  }, [movieId])

  // Check if movie is in user's favorites/watchlist
  useEffect(() => {
    if (isAuthenticated && user) {
      const checkUserLists = async () => {
        try {
          // Check favorites
          const favResponse = await fetch("/api/user/favorites", {
            credentials: "include",
          })
          const favData = await favResponse.json()
          setIsFavorite(favData.favorites?.includes(movieId) || false)

          // Check watchlist
          const watchResponse = await fetch("/api/user/watchlist", {
            credentials: "include",
          })
          const watchData = await watchResponse.json()
          setIsWatchlist(watchData.watchlist?.includes(movieId) || false)
        } catch (error) {
          console.error("Error checking user lists:", error)
        }
      }

      checkUserLists()
    }
  }, [isAuthenticated, user, movieId])

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to add movies to your favorites",
        variant: "destructive",
      })
      router.push(`/login?callbackUrl=${encodeURIComponent(`/details/${movieId}`)}`)
      return
    }

    try {
      const response = await fetch("/api/user/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movieId,
          action: isFavorite ? "remove" : "add",
          movieData: movie, // Send the movie data to ensure it's in the database
        }),
        credentials: "include",
      })

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Authentication expired",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          })
          router.push(`/login?callbackUrl=${encodeURIComponent(`/details/${movieId}`)}`)
          return
        }
        throw new Error("Failed to update favorites")
      }

      setIsFavorite(!isFavorite)
      toast({
        title: isFavorite ? "Removed from favorites" : "Added to favorites",
        description: isFavorite
          ? `${movie.title} has been removed from your favorites`
          : `${movie.title} has been added to your favorites`,
      })
    } catch (error) {
      console.error("Error updating favorites:", error)
      toast({
        title: "Action failed",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleToggleWatchlist = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to add movies to your watchlist",
        variant: "destructive",
      })
      router.push(`/login?callbackUrl=${encodeURIComponent(`/details/${movieId}`)}`)
      return
    }

    try {
      const response = await fetch("/api/user/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movieId,
          action: isWatchlist ? "remove" : "add",
          movieData: movie, // Send the movie data to ensure it's in the database
        }),
        credentials: "include",
      })

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Authentication expired",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          })
          router.push(`/login?callbackUrl=${encodeURIComponent(`/details/${movieId}`)}`)
          return
        }
        throw new Error("Failed to update watchlist")
      }

      setIsWatchlist(!isWatchlist)
      toast({
        title: isWatchlist ? "Removed from watchlist" : "Added to watchlist",
        description: isWatchlist
          ? `${movie.title} has been removed from your watchlist`
          : `${movie.title} has been added to your watchlist`,
      })
    } catch (error) {
      console.error("Error updating watchlist:", error)
      toast({
        title: "Action failed",
        description: "Failed to update watchlist. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleLikeReview = async (reviewId: string, isLiked: boolean) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to like reviews",
        variant: "destructive",
      })
      router.push(`/login?callbackUrl=${encodeURIComponent(`/details/${movieId}`)}`)
      return
    }

    try {
      const response = await fetch(`/api/reviews/${reviewId}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: isLiked ? "unlike" : "like" }),
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to update like")
      }

      // Update reviews state
      setReviews(
        reviews.map((review) => {
          if (review._id === reviewId) {
            const updatedLikes = isLiked
              ? review.likes.filter((id: string) => id !== user?._id)
              : [...review.likes, user?._id]

            return {
              ...review,
              likes: updatedLikes,
            }
          }
          return review
        }),
      )
    } catch (error) {
      console.error("Error updating like:", error)
      toast({
        title: "Action failed",
        description: "Failed to update like. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="w-full">
        <div className="space-y-6">
          <div className="relative w-full aspect-[21/9] overflow-hidden">
            <Skeleton className="h-full w-full" />
          </div>
          <div className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto grid gap-6 md:grid-cols-[300px_1fr] lg:gap-12">
            <Skeleton className="aspect-[2/3] w-full rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-4 w-1/3" />
              <div className="flex gap-2 mt-4">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
              <Skeleton className="h-32 w-full mt-4" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto py-12 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-4">Error Loading Movie</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button asChild>
          <Link href="/search">Back to Search</Link>
        </Button>
      </div>
    )
  }

  if (!movie) {
    return (
      <div className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Movie Not Found</h1>
        <p className="text-muted-foreground mb-6">We couldn't find the movie you're looking for.</p>
        <Button asChild>
          <Link href="/search">Back to Search</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="space-y-6">
        {/* Backdrop */}
        <div className="relative w-full aspect-[21/9] overflow-hidden">
          <Image
            src={movie.backdrop || movie.poster || "/placeholder.svg?height=400&width=1000"}
            alt={movie.title || `Movie backdrop image`}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>

        {/* Movie Details */}
        <div className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto grid gap-6 md:grid-cols-[300px_1fr] lg:gap-12">
          {/* Poster */}
          <div className="relative aspect-[2/3] overflow-hidden rounded-xl">
            <Image
              src={movie.poster || `/placeholder.svg?height=450&width=300&text=${encodeURIComponent(movie.title)}`}
              alt={movie.title || "Movie poster"}
              fill
              className="object-cover"
            />
          </div>

          {/* Info */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl mb-2">
              {movie.title} <span className="text-muted-foreground">({movie.year})</span>
            </h1>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              {/* Local Community Rating */}
              {movie.localRating && movie.localRating.count > 0 && (
                <Badge className="flex items-center gap-1 bg-primary text-primary-foreground">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {movie.localRating.average}/5 · {movie.localRating.count} {movie.localRating.count === 1 ? 'review' : 'reviews'}
                </Badge>
              )}
              
              {/* External Rating (shown when available, but less prominently) */}
              {movie.rating && movie.rating !== "N/A" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  IMDB {movie.rating}
                </Badge>
              )}
              
              {movie.runtime && movie.runtime !== "Unknown" && <Badge variant="outline">{movie.runtime}</Badge>}
              {movie.contentRating && movie.contentRating !== "Not Rated" && (
                <Badge variant="outline">{movie.contentRating}</Badge>
              )}
              {movie.genres &&
                movie.genres.map((genre: string) => (
                  <Badge key={genre} variant="outline">
                    {genre}
                  </Badge>
                ))}
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              <Button
                variant={isFavorite ? "default" : "outline"}
                size="sm"
                className="gap-1"
                onClick={handleToggleFavorite}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? "fill-primary-foreground" : ""}`} />
                {isFavorite ? "Favorited" : "Favorite"}
              </Button>
              <Button
                variant={isWatchlist ? "default" : "outline"}
                size="sm"
                className="gap-1"
                onClick={handleToggleWatchlist}
              >
                <Bookmark className="h-4 w-4" />
                {isWatchlist ? "In Watchlist" : "Watchlist"}
              </Button>
              <Button variant="outline" size="sm" className="gap-1">
                <Share className="h-4 w-4" />
                Share
              </Button>
              {isAuthenticated && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() =>
                    router.push(
                      `/reviews/new?movieId=${movieId}&title=${encodeURIComponent(movie.title)}&poster=${encodeURIComponent(movie.poster || "")}`,
                    )
                  }
                >
                  <Edit className="h-4 w-4" />
                  Write Review
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1 ml-auto"
                onClick={() => fetchMovieDetails(true)}
                disabled={isRefreshing}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                >
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                {isRefreshing ? "Refreshing..." : "Refresh Data"}
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <h2 className="font-semibold mb-1">Overview</h2>
                <p className="text-muted-foreground">{movie.description || "No description available."}</p>
              </div>

              {movie.director && movie.director !== "Unknown" && (
                <div>
                  <h2 className="font-semibold mb-1">Director</h2>
                  <p className="text-muted-foreground">{movie.director}</p>
                </div>
              )}

              {movie.cast && movie.cast.length > 0 && (
                <div>
                  <h2 className="font-semibold mb-1">Cast</h2>
                  <div className="flex flex-wrap gap-2">
                    {movie.cast.map((actor: string) => (
                      <Badge key={actor} variant="secondary">
                        {actor}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional movie info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {movie.language && (
                  <div>
                    <h2 className="font-semibold mb-1">Language</h2>
                    <p className="text-muted-foreground">{movie.language}</p>
                  </div>
                )}

                {movie.releaseDate && (
                  <div>
                    <h2 className="font-semibold mb-1">Release Date</h2>
                    <p className="text-muted-foreground">{new Date(movie.releaseDate).toLocaleDateString()}</p>
                  </div>
                )}

                {movie.budget && (
                  <div>
                    <h2 className="font-semibold mb-1">Budget</h2>
                    <p className="text-muted-foreground">${movie.budget.toLocaleString()}</p>
                  </div>
                )}

                {movie.grossWorldwide && (
                  <div>
                    <h2 className="font-semibold mb-1">Box Office</h2>
                    <p className="text-muted-foreground">${movie.grossWorldwide.toLocaleString()}</p>
                  </div>
                )}

                {movie.numVotes > 0 && (
                  <div>
                    <h2 className="font-semibold mb-1">Votes</h2>
                    <p className="text-muted-foreground">{movie.numVotes.toLocaleString()}</p>
                  </div>
                )}

                {movie.url && (
                  <div>
                    <h2 className="font-semibold mb-1">IMDb</h2>
                    <a 
                      href={movie.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline"
                    >
                      View on IMDb
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Reviews Section */}
        <div className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
          <Tabs defaultValue="reviews">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold tracking-tight">Reviews & Discussions</h2>
              <TabsList>
                <TabsTrigger value="reviews" className="gap-1">
                  <MessageSquare className="h-4 w-4" />
                  Reviews
                </TabsTrigger>
                <TabsTrigger value="discussions" className="gap-1">
                  <Clock className="h-4 w-4" />
                  Discussions
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="reviews" className="space-y-6">
              {/* Write Review CTA */}
              {isAuthenticated ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.avatar || "/placeholder.svg"} alt={user?.name || "User"} />
                        <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <Button
                        variant="outline"
                        className="flex-1 justify-start text-muted-foreground h-auto py-3"
                        onClick={() =>
                          router.push(
                            `/reviews/new?movieId=${movieId}&title=${encodeURIComponent(movie.title)}&poster=${encodeURIComponent(movie.poster || "")}`,
                          )
                        }
                      >
                        Write a review for {movie.title}...
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center p-6">
                    <p className="text-center mb-4">You need to be logged in to write a review.</p>
                    <Button asChild>
                      <Link href="/login">Log In</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Reviews List */}
              {reviewsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-20 w-full" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review._id}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={review.user?.avatar || "/placeholder.svg"} alt={review.user?.name || "Reviewer"} />
                            <AvatarFallback>{review.user?.name?.charAt(0) || "U"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <Link href={`/profile/${review.user?._id}`} className="font-medium hover:underline">
                                  {review.user?.name}
                                </Link>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="flex items-center">
                                    {Array(5)
                                      .fill(0)
                                      .map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`h-3 w-3 ${i < Math.floor(review.rating) ? "fill-primary text-primary" : "text-muted-foreground"}`}
                                        />
                                      ))}
                                    <span className="ml-1">{review.rating}</span>
                                  </div>
                                  <span>•</span>
                                  <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1"
                                onClick={() => handleLikeReview(review._id, review.likes.includes(user?._id))}
                              >
                                <Heart
                                  className={`h-4 w-4 ${review.likes.includes(user?._id) ? "fill-primary text-primary" : ""}`}
                                />
                                {review.likes.length}
                              </Button>
                            </div>
                            <p className="text-sm">{review.content}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-xl font-medium mb-2">No reviews yet</h3>
                  <p className="text-muted-foreground mb-6">Be the first to review {movie.title}</p>
                  <Button
                    onClick={() =>
                      isAuthenticated
                        ? router.push(
                            `/reviews/new?movieId=${movieId}&title=${encodeURIComponent(movie.title)}&poster=${encodeURIComponent(movie.poster || "")}`,
                          )
                        : router.push("/login")
                    }
                  >
                    Write a Review
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="discussions" className="py-4">
              <div className="text-center py-12">
                <h3 className="text-xl font-medium mb-2">No discussions yet</h3>
                <p className="text-muted-foreground mb-6">Be the first to start a discussion about {movie.title}</p>
                <Button asChild>
                  <Link href={isAuthenticated ? `/discussions/new?movie=${movie.id}` : "/login"}>Start Discussion</Link>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

