"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { UserPlus, Settings, Film, Heart, Bookmark, MessageSquare, Calendar, CheckCircle, Twitter, Instagram, Facebook, Globe, Link2, Linkedin, Users, UserCheck, Star, MessageCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"
import { User, Review } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { ProfileReviewCard } from "@/components/profile-review-card"
import { ProfileCommentCard } from "@/components/profile-comment-card"

// Real API function to fetch user profile
const getUserProfile = async (userId: string) => {
  try {
    const response = await fetch(`/api/user/profile?userId=${userId}`, {
      credentials: "include"
    })
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error("Failed to fetch user profile:", error)
    throw error
  }
}

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const userId = params.id as string
  const { user: currentUser, isAuthenticated } = useAuth()

  const [profile, setProfile] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [recentReviews, setRecentReviews] = useState<any[]>([])
  const [followers, setFollowers] = useState<any[]>([])
  const [following, setFollowing] = useState<any[]>([])
  const [loadingNetwork, setLoadingNetwork] = useState(false)
  const [followersModified, setFollowersModified] = useState(false)
  const [followingModified, setFollowingModified] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [favoriteMovies, setFavoriteMovies] = useState<any[]>([])
  const [watchlistMovies, setWatchlistMovies] = useState<any[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(false)
  const [loadingWatchlist, setLoadingWatchlist] = useState(false)
  const [userComments, setUserComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  // Check if this is the current user's profile
  const isOwnProfile = isAuthenticated && currentUser?._id === userId

  // Check for new review parameter
  useEffect(() => {
    const newReview = searchParams.get('newReview')
    if (newReview === 'true') {
      toast({
        title: "Review Posted!",
        description: "Your review has been successfully added to your profile.",
        variant: "default",
        duration: 5000,
        action: (
          <ToastAction altText="View Reviews">
            <Link href="#reviews">View Reviews</Link>
          </ToastAction>
        ),
      })
      
      // Remove the query parameter from URL to prevent showing toast on refresh
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [searchParams, toast])

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true)
      try {
        const data = await getUserProfile(userId)
        setProfile(data.profile)
        // Get recent reviews from the API response
        setRecentReviews(data.recentActivity?.reviews || [])
        // Initialize following state if needed
        if (currentUser && data.profile.followers) {
          setIsFollowing(data.profile.followers.includes(currentUser._id))
        }
        
        // Load favorites and watchlist data if available
        if (data.profile.favorites && data.profile.favorites.length > 0) {
          loadFavoritesData(data.profile.favorites);
        }
        
        if (data.profile.watchlist && data.profile.watchlist.length > 0) {
          loadWatchlistData(data.profile.watchlist);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error)
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
    fetchUserProfile()
    }
  }, [userId, currentUser])

  const handleFollow = async () => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    
    try {
      const response = await fetch('/api/user/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetUserId: userId }),
        credentials: 'include'
      })
      
      if (response.ok) {
        // Toggle following state
    setIsFollowing(!isFollowing)
        
        // Update follower count in profile
        setProfile(prev => ({
          ...prev,
          stats: {
            ...prev.stats,
            followersCount: isFollowing 
              ? (prev.stats.followersCount - 1) 
              : (prev.stats.followersCount + 1)
          }
        }))
      } else {
        const data = await response.json()
        console.error("Follow action failed:", data.error)
      }
    } catch (error) {
      console.error("Follow error:", error)
    }
  }

  const handleEditProfile = () => {
    router.push('/settings/profile')
  }

  // Fetch movie details for favorites and watchlist
  const fetchMovieDetails = async (movieId: string) => {
    try {
      console.log(`Fetching details for movie ID: ${movieId}`)
      const response = await fetch(`/api/movies/details?id=${movieId}`)
      if (!response.ok) throw new Error('Failed to fetch movie details')
      const data = await response.json()
      
      // Check if we have a proper movie object with required fields
      if (data.movie && data.movie.title) {
        console.log(`Movie data received for ${movieId}:`, data.movie.title)
        return data.movie
      } else {
        console.error(`Movie data invalid for ${movieId}:`, data)
        // Return a placeholder movie object
        return {
          id: movieId,
          title: `Movie ${movieId.substring(0, 8)}...`,
          poster: null,
          year: 'Unknown',
          genres: []
        }
      }
    } catch (error) {
      console.error(`Error fetching details for movie ${movieId}:`, error)
      // Return a placeholder movie object on error
      return {
        id: movieId,
        title: `Movie ${movieId.substring(0, 8)}...`,
        poster: null,
        year: 'Unknown',
        genres: []
      }
    }
  }

  // Updated to accept movieIds parameter for immediate loading
  const loadFavoritesData = async (movieIds?: string[]) => {
    const ids = movieIds || profile.favorites;
    if (!ids || ids.length === 0) return;
    
    if (favoriteMovies.length === 0) {
      console.log("Loading favorites data for IDs:", ids)
      setLoadingFavorites(true)
      try {
        // Process in batches of 3 to avoid overloading the server
        const results = [];
        for (let i = 0; i < ids.length; i += 3) {
          const batch = ids.slice(i, i + 3);
          const batchPromises = batch.map(movieId => fetchMovieDetails(movieId));
          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);
          // Small delay between batches
          if (i + 3 < ids.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
        
        console.log(`Loaded ${results.length} favorite movies`)
        setFavoriteMovies(results);
      } catch (error) {
        console.error("Error loading favorites data:", error)
      } finally {
        setLoadingFavorites(false)
      }
    }
  }

  // Updated to accept movieIds parameter for immediate loading
  const loadWatchlistData = async (movieIds?: string[]) => {
    const ids = movieIds || profile.watchlist;
    if (!ids || ids.length === 0) return;
    
    if (watchlistMovies.length === 0) {
      console.log("Loading watchlist data for IDs:", ids)
      setLoadingWatchlist(true)
      try {
        // Process in batches of 3 to avoid overloading the server
        const results = [];
        for (let i = 0; i < ids.length; i += 3) {
          const batch = ids.slice(i, i + 3);
          const batchPromises = batch.map(movieId => fetchMovieDetails(movieId));
          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);
          // Small delay between batches
          if (i + 3 < ids.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
        
        console.log(`Loaded ${results.length} watchlist movies`)
        setWatchlistMovies(results);
      } catch (error) {
        console.error("Error loading watchlist data:", error)
      } finally {
        setLoadingWatchlist(false)
      }
    }
  }

  // Fetch followers and following when the network tab is selected
  const handleTabSelect = async (value: string) => {
    if ((value === "followers" || value === "following") && !loadingNetwork) {
      setLoadingNetwork(true)
      try {
        if (value === "followers" && followers.length === 0) {
          // Fetch followers
          const followersRes = await fetch(`/api/user/followers?userId=${userId}`)
          const followersData = await followersRes.json()
          setFollowers(followersData.followers || [])
        }
        
        if (value === "following" && following.length === 0) {
          // Fetch following
          const followingRes = await fetch(`/api/user/following?userId=${userId}`)
          const followingData = await followingRes.json()
          setFollowing(followingData.following || [])
        }
      } catch (error) {
        console.error("Error fetching network data:", error)
      } finally {
        setLoadingNetwork(false)
      }
    }

    // Load favorites data when tab is selected
    if (value === "favorites") {
      loadFavoritesData()
    }

    // Load watchlist data when tab is selected
    if (value === "watchlist") {
      loadWatchlistData()
    }

    // Load comments when the comments tab is selected
    if (value === "comments" && userComments.length === 0 && !loadingComments) {
      setLoadingComments(true);
      try {
        const response = await fetch(`/api/user/comments?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setUserComments(data.comments || []);
        }
      } catch (error) {
        console.error("Error fetching user comments:", error);
      } finally {
        setLoadingComments(false);
      }
    }
  }

  // Handle removing a follower
  const handleRemoveFollower = async (followerId: string) => {
    if (!isAuthenticated || !isOwnProfile) return
    
    setLoadingId(followerId)
    try {
      const response = await fetch('/api/user/remove-follower', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ followerId }),
        credentials: 'include'
      })
      
      if (response.ok) {
        // Remove follower from state
        setFollowers(prev => prev.filter(f => f._id !== followerId))
        setFollowersModified(true)
        
        // Update follower count in profile
        setProfile(prev => ({
          ...prev,
          stats: {
            ...prev.stats,
            followersCount: prev.stats.followersCount - 1
          }
        }))

        toast({
          title: "Follower removed",
          description: "This user will no longer follow you",
          variant: "default"
        })
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to remove follower",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Remove follower error:", error)
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive"
      })
    } finally {
      setLoadingId(null)
    }
  }

  // Handle unfollowing a user
  const handleUnfollow = async (userId: string) => {
    if (!isAuthenticated) return
    
    setLoadingId(userId)
    try {
      const response = await fetch('/api/user/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetUserId: userId }),
        credentials: 'include'
      })
      
      if (response.ok) {
        // Remove user from following list
        setFollowing(prev => prev.filter(f => f._id !== userId))
        setFollowingModified(true)
        
        // Update following count in profile
        setProfile(prev => ({
          ...prev,
          stats: {
            ...prev.stats,
            followingCount: prev.stats.followingCount - 1
          }
        }))

        toast({
          title: "Unfollowed",
          description: "You are no longer following this user",
          variant: "default"
        })
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to unfollow user",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Unfollow error:", error)
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive"
      })
    } finally {
      setLoadingId(null)
    }
  }

  // Handle deleting a review from the profile page
  const handleReviewDeleted = (reviewId: string) => {
    // Remove the review from the list
    setRecentReviews(prevReviews => prevReviews.filter(review => review._id !== reviewId));
    
    // Update the review count in profile stats
    setProfile(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        reviewsCount: prev.stats.reviewsCount - 1
      }
    }));
  };
  
  // Handle updating a review from the profile page
  const handleReviewUpdated = (reviewId: string, newContent: string, newRating: number) => {
    // Update the review in the list
    setRecentReviews(prevReviews => 
      prevReviews.map(review => 
        review._id === reviewId 
          ? { ...review, content: newContent, rating: newRating } 
          : review
      )
    );
  };
  
  // Handle deleting a comment from the profile page
  const handleCommentDeleted = (commentId: string) => {
    // Remove the comment from the list
    setUserComments(prevComments => prevComments.filter(comment => comment._id !== commentId));
  };
  
  // Handle updating a comment from the profile page
  const handleCommentUpdated = (commentId: string, newContent: string) => {
    // Update the comment in the list
    setUserComments(prevComments => 
      prevComments.map(comment => 
        comment._id === commentId 
          ? { ...comment, content: newContent, updatedAt: new Date().toISOString() } 
          : comment
      )
    );
  };

  if (loading) {
    return (
      <div className="py-6 px-4 sm:px-6 md:px-8 mx-auto w-full max-w-7xl">
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <Skeleton className="h-32 w-32 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-16 w-full max-w-md" />
              <div className="flex gap-2 mt-4">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    )
  }

  if (!profile || Object.keys(profile).length === 0) {
    return (
      <div className="py-12 px-4 sm:px-6 md:px-8 mx-auto w-full max-w-7xl text-center">
        <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
        <p className="text-muted-foreground mb-6">We couldn't find the user you're looking for.</p>
        <Button asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    )
  }

  // Calculate when the user joined
  const joinDate = profile.createdAt 
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown'

  // Set default values for missing fields
  const userStats = profile.stats || {
    reviewsCount: 0,
    favoritesCount: 0,
    watchlistCount: 0,
    followersCount: 0,
    followingCount: 0
  }

  return (
    <div className="py-6 px-4 sm:px-6 md:px-8 mx-auto w-full max-w-7xl">
      <div className="space-y-8">
        {/* Profile Header */}
        <div className="flex flex-row gap-4 items-start">
          <Avatar className="h-24 w-24 md:h-40 md:w-40 shrink-0">
            <AvatarImage src={profile.avatar || "/placeholder.svg?height=200&width=200"} alt={profile.name || "User profile"} />
            <AvatarFallback>{profile.name?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-2 mb-3">
              <div>
                <h1 className="text-xl md:text-2xl font-bold">{profile.name}</h1>
                <p className="text-muted-foreground text-sm">@{profile.username}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {isOwnProfile ? (
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={handleEditProfile}>
                      <Settings className="h-3.5 w-3.5" />
                      Edit Profile
                  </Button>
                ) : (
                  <Button
                    variant={isFollowing ? "outline" : "default"}
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={handleFollow}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                )}
                {!isOwnProfile && isAuthenticated && (
                <Button variant="outline" size="sm" className="gap-1 text-xs">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Message
                </Button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm line-clamp-3 md:line-clamp-none">{profile.bio || "No bio provided."}</p>

              {/* Social Media Links */}
              {profile.social && Object.values(profile.social).some(value => value) && (
                <div className="flex flex-wrap gap-2">
                  {profile.social.twitter && (
                    <Button size="icon" variant="outline" asChild className="h-7 w-7 md:h-9 md:w-9 rounded-full hover:bg-[#1DA1F2] hover:border-[#1DA1F2] hover:text-white transition-colors" title="Twitter">
                      <a href={`https://twitter.com/${profile.social.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer">
                        <Twitter className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </a>
                    </Button>
                  )}
                  {profile.social.instagram && (
                    <Button size="icon" variant="outline" asChild className="h-7 w-7 md:h-9 md:w-9 rounded-full hover:bg-gradient-to-r hover:from-[#405DE6] hover:via-[#E1306C] hover:to-[#FFDC80] hover:border-[#E1306C] hover:text-white transition-colors" title="Instagram">
                      <a href={`https://instagram.com/${profile.social.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer">
                        <Instagram className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </a>
                    </Button>
                  )}
                  {profile.social.facebook && (
                    <Button size="icon" variant="outline" asChild className="h-7 w-7 md:h-9 md:w-9 rounded-full hover:bg-[#4267B2] hover:border-[#4267B2] hover:text-white transition-colors" title="Facebook">
                      <a href={profile.social.facebook.startsWith('http') 
                        ? profile.social.facebook 
                        : `https://facebook.com/${profile.social.facebook}`} 
                        target="_blank" rel="noopener noreferrer">
                        <Facebook className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </a>
                    </Button>
                  )}
                  {profile.social.linkedin && (
                    <Button size="icon" variant="outline" asChild className="h-7 w-7 md:h-9 md:w-9 rounded-full hover:bg-[#0077B5] hover:border-[#0077B5] hover:text-white transition-colors" title="LinkedIn">
                      <a href={profile.social.linkedin.startsWith('http') 
                        ? profile.social.linkedin 
                        : `https://linkedin.com/in/${profile.social.linkedin}`} 
                        target="_blank" rel="noopener noreferrer">
                        <Linkedin className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </a>
                    </Button>
                  )}
                  {profile.social.letterboxd && (
                    <Button size="icon" variant="outline" asChild className="h-7 w-7 md:h-9 md:w-9 rounded-full hover:bg-[#00C030] hover:border-[#00C030] hover:text-white transition-colors" title="Letterboxd">
                      <a href={`https://letterboxd.com/${profile.social.letterboxd}`} target="_blank" rel="noopener noreferrer">
                        <svg 
                          className="h-3.5 w-3.5 md:h-4 md:w-4" 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 24 24" 
                          fill="currentColor">
                          <path d="M8.541.6c-2.581.017-5.308.442-7.541.971v20.867c2.226.53 4.955.957 7.541.971h.028c2.591-.014 5.336-.455 7.431-.971V1.571C13.863 1.057 11.118.614 8.541.6h-.028m0 16.6c-1.131 0-2.055-.92-2.055-2.055s.924-2.055 2.055-2.055 2.055.924 2.055 2.055-.924 2.055-2.055 2.055m7.431-4.918c-1.131 0-2.055-.924-2.055-2.055s.924-2.055 2.055-2.055S18.027 9.1 18.027 10.227s-.924 2.055-2.055 2.055m6.386-6.386c-1.131 0-2.055-.924-2.055-2.055S21.226 1.786 22.358 1.786s2.055.924 2.055 2.055-.924 2.055-2.055 2.055"/>
                        </svg>
                      </a>
                    </Button>
                  )}
                  {profile.website && (
                    <Button size="icon" variant="outline" asChild className="h-7 w-7 md:h-9 md:w-9 rounded-full hover:bg-primary hover:text-white hover:border-primary transition-colors" title="Website">
                      <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              )}

              <div className="hidden md:flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Badge variant="outline">{profile.role}</Badge>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Joined {joinDate}
                </div>
                {profile.location && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span>{profile.location}</span>
                  </div>
                )}
              </div>

              {/* Mobile details - only shown on mobile */}
              <div className="flex md:hidden flex-wrap gap-x-4 gap-y-1 text-xs">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Badge variant="outline" className="text-xs py-0 h-5">{profile.role}</Badge>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Joined {joinDate}</span>
                </div>
                {profile.location && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span>{profile.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar - replaced cards with interactive stats bar */}
        <div className="overflow-x-auto">
          <div className="flex flex-nowrap md:flex-wrap gap-4 items-center justify-between bg-muted/30 rounded-lg p-4 border min-w-max md:min-w-0">
            <Link href="#reviews" className="flex flex-col items-center px-3 py-1.5 md:px-4 md:py-2 hover:bg-muted rounded-md transition-colors">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                <span className="text-base md:text-xl font-bold">{userStats.reviewsCount || 0}</span>
              </div>
              <span className="text-xs md:text-sm text-muted-foreground">Reviews</span>
            </Link>
            
            <Link href="#favorites" className="flex flex-col items-center px-3 py-1.5 md:px-4 md:py-2 hover:bg-muted rounded-md transition-colors">
              <div className="flex items-center gap-1.5">
                <Heart className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                <span className="text-base md:text-xl font-bold">{userStats.favoritesCount || 0}</span>
              </div>
              <span className="text-xs md:text-sm text-muted-foreground">Favorites</span>
            </Link>
            
            <Link href="#watchlist" className="flex flex-col items-center px-3 py-1.5 md:px-4 md:py-2 hover:bg-muted rounded-md transition-colors">
              <div className="flex items-center gap-1.5">
                <Bookmark className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                <span className="text-base md:text-xl font-bold">{userStats.watchlistCount || 0}</span>
              </div>
              <span className="text-xs md:text-sm text-muted-foreground">Watchlist</span>
            </Link>
            
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex flex-col items-center px-3 py-1.5 md:px-4 md:py-2 hover:bg-muted rounded-md transition-colors">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    <span className="text-base md:text-xl font-bold">{userStats.followersCount || 0}</span>
                </div>
                  <span className="text-xs md:text-sm text-muted-foreground">Followers</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="center">
                <div className="space-y-2">
                  <h3 className="font-medium text-center pb-2 border-b">Followers</h3>
                  <div className="space-y-2">
                    {loadingNetwork ? (
                      Array(3).fill(0).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-2">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-1 flex-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                  </div>
                  </div>
                        ))
                      ) : followers.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                          {isOwnProfile ? "You don't have any followers yet." : "This user doesn't have any followers yet."}
                        </p>
                      ) : (
                        followers.map((follower) => (
                          <div 
                            key={follower._id}
                            className="flex items-center gap-3 p-2 hover:bg-muted rounded-md transition-colors"
                          >
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={follower.avatar || "/placeholder.svg"} alt={follower.name} />
                              <AvatarFallback>{follower.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{follower.name}</div>
                              <div className="text-xs text-muted-foreground truncate">@{follower.username}</div>
                              {follower.bio && <div className="text-xs text-muted-foreground mt-1 truncate">{follower.bio}</div>}
                    </div>
                            {isOwnProfile ? (
                              <Button size="sm" variant="outline" asChild>
                                <Link 
                                  href={`/profile/${follower._id}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View
                                </Link>
                              </Button>
                            ) : (
                              follower._id === currentUser?._id && (
                                <Button size="sm" variant="outline" asChild>
                                  <Link href="/profile">
                                    You
                                  </Link>
                                </Button>
                              )
                            )}
                  </div>
                        ))
                      )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex flex-col items-center px-3 py-1.5 md:px-4 md:py-2 hover:bg-muted rounded-md transition-colors">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    <span className="text-base md:text-xl font-bold">{userStats.followingCount || 0}</span>
                  </div>
                  <span className="text-xs md:text-sm text-muted-foreground">Following</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="center">
                <div className="space-y-2">
                  <h3 className="font-medium text-center pb-2 border-b">Following</h3>
                  <div className="space-y-2">
                    {loadingNetwork ? (
                      Array(3).fill(0).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-2">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-1 flex-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      ))
                    ) : following.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        {isOwnProfile ? "You aren't following anyone yet." : "This user isn't following anyone yet."}
                      </p>
                    ) : (
                      following.map((followedUser) => (
                        <div
                          key={followedUser._id}
                          className="flex items-center gap-3 p-2 hover:bg-muted rounded-md transition-colors"
                        >
                          <Avatar className="h-10 w-10 border">
                            <AvatarImage src={followedUser.avatar || "/placeholder.svg"} alt={followedUser.name} />
                            <AvatarFallback>{followedUser.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{followedUser.name}</div>
                            <div className="text-xs text-muted-foreground truncate">@{followedUser.username}</div>
                            {followedUser.bio && <div className="text-xs text-muted-foreground mt-1 truncate">{followedUser.bio}</div>}
                          </div>
                          {isOwnProfile ? (
                            <Button size="sm" variant="outline" asChild>
                              <Link 
                                href={`/profile/${followedUser._id}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                View
                              </Link>
                            </Button>
                          ) : (
                            followedUser._id === currentUser?._id && (
                              <Button size="sm" variant="outline" asChild>
                                <Link href="/profile">
                                  You
                                </Link>
                              </Button>
                            )
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Separator />

        {/* Tabs for different sections */}
        <Tabs defaultValue="reviews" id="profile-tabs" onValueChange={handleTabSelect}>
          <div className="overflow-x-auto">
            <TabsList className="mb-6 min-w-max md:min-w-0">
              <TabsTrigger value="reviews" className="gap-1" id="reviews">
                <MessageSquare className="h-4 w-4" />
                Reviews
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-1" id="comments">
                <MessageCircle className="h-4 w-4" />
                Comments
              </TabsTrigger>
              <TabsTrigger value="favorites" className="gap-1" id="favorites">
                <Heart className="h-4 w-4" />
                Favorites
              </TabsTrigger>
              <TabsTrigger value="watchlist" className="gap-1" id="watchlist">
                <Bookmark className="h-4 w-4" />
                Watchlist
              </TabsTrigger>
              <TabsTrigger value="followers" className="gap-1">
                <Users className="h-4 w-4" />
                Followers
              </TabsTrigger>
              <TabsTrigger value="following" className="gap-1">
                <UserCheck className="h-4 w-4" />
                Following
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            {recentReviews && recentReviews.length > 0 ? (
              <>
              <div className="grid gap-6 md:grid-cols-2">
                  {recentReviews.map((review: any) => (
                    <ProfileReviewCard 
                      key={review._id} 
                      review={review} 
                      isOwner={isOwnProfile}
                      onReviewDeleted={handleReviewDeleted}
                      onReviewUpdated={handleReviewUpdated}
                    />
                  ))}
              </div>
                {userStats.reviewsCount > 5 && (
                  <div className="flex justify-center mt-4">
                    <Button variant="outline">
                      View All {userStats.reviewsCount} Reviews
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No reviews yet</h3>
                <p className="text-muted-foreground">
                  {isOwnProfile ? "You haven't" : `${profile.name} hasn't`} written any reviews yet.
                </p>
                {isOwnProfile && (
                  <div className="flex flex-col items-center gap-2 mt-6">
                    <p className="text-sm">Ready to share your thoughts on a movie?</p>
                    <Button className="mt-2" asChild>
                      <Link href="/search">
                        Find Movies to Review
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="space-y-6">
            {loadingComments ? (
              <div className="space-y-4">
                {Array(3).fill(0).map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <Skeleton className="h-12 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : userComments && userComments.length > 0 ? (
              <div className="grid gap-4">
                {userComments.map((comment: any) => (
                  <ProfileCommentCard
                    key={comment._id}
                    comment={comment}
                    isOwner={isOwnProfile}
                    onCommentDeleted={handleCommentDeleted}
                    onCommentUpdated={handleCommentUpdated}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No comments yet</h3>
                <p className="text-muted-foreground">
                  {isOwnProfile ? "You haven't" : `${profile.name} hasn't`} commented on any reviews yet.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="space-y-6">
            {loadingFavorites ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-[225px] w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : profile.favorites && profile.favorites.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {favoriteMovies.map((movie: any, index: number) => {
                  // Some movies might have id as a number or string depending on source
                  const movieId = movie.id || movie.movieId || `favorite-${index}`;
                  return (
                    <Link key={movieId} href={`/details/${movieId}`} className="group">
                      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted">
                        {movie.poster ? (
                      <Image
                            src={movie.poster}
                            alt={movie.title || 'Movie poster'}
                        fill
                            sizes="(max-width: 768px) 50vw, 20vw"
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                            <Film className="h-8 w-8" />
                      </div>
                        )}
                    </div>
                    <div className="mt-2">
                      <h3 className="font-medium line-clamp-1 group-hover:text-primary transition-colors">
                          {movie.title || 'Unknown movie'}
                      </h3>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <span>{movie.year || 'Unknown year'}</span>
                          {movie.rating && (
                            <div className="flex items-center ml-2">
                              <Star className="h-3 w-3 mr-0.5 text-primary" />
                              <span>{movie.rating}</span>
                            </div>
                          )}
                        </div>
                    </div>
                  </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No favorites yet</h3>
                <p className="text-muted-foreground">
                  {isOwnProfile ? "You haven't" : `${profile.name} hasn't`} added any movies to favorites yet.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Watchlist Tab */}
          <TabsContent value="watchlist" className="space-y-6">
            {loadingWatchlist ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-[225px] w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : profile.watchlist && profile.watchlist.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {watchlistMovies.map((movie: any, index: number) => {
                  // Some movies might have id as a number or string depending on source
                  const movieId = movie.id || movie.movieId || `watchlist-${index}`;
                  return (
                    <Link key={movieId} href={`/details/${movieId}`} className="group">
                      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted">
                        {movie.poster ? (
                      <Image
                            src={movie.poster}
                            alt={movie.title || 'Movie poster'}
                        fill
                            sizes="(max-width: 768px) 50vw, 20vw"
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                            <Film className="h-8 w-8" />
                      </div>
                        )}
                    </div>
                    <div className="mt-2">
                      <h3 className="font-medium line-clamp-1 group-hover:text-primary transition-colors">
                          {movie.title || 'Unknown movie'}
                      </h3>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <span>{movie.year || 'Unknown year'}</span>
                          {movie.rating && (
                            <div className="flex items-center ml-2">
                              <Star className="h-3 w-3 mr-0.5 text-primary" />
                              <span>{movie.rating}</span>
                            </div>
                          )}
                        </div>
                    </div>
                  </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No watchlist items</h3>
                <p className="text-muted-foreground">
                  {isOwnProfile ? "You haven't" : `${profile.name} hasn't`} added any movies to watchlist yet.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Network Tab */}
          <TabsContent value="followers" className="space-y-6">
              <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Followers
                </CardTitle>
                <CardDescription>People who follow {isOwnProfile ? "you" : profile.name}</CardDescription>
                </CardHeader>
              <CardContent>
                {loadingNetwork ? (
                    <div className="space-y-4">
                    {Array(3).fill(0).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : followers.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {followers.map((follower: any) => (
                      <div 
                        key={follower._id}
                        className="flex items-center gap-3 p-2 hover:bg-muted rounded-md transition-colors"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={follower.avatar || "/placeholder.svg"} alt={follower.name || "Follower"} />
                          <AvatarFallback>{follower.name?.charAt(0) || "?"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                          <p className="font-medium">{follower.name}</p>
                          <p className="text-xs text-muted-foreground">@{follower.username}</p>
                          {follower.bio && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{follower.bio}</p>
                          )}
                          </div>
                        {isOwnProfile ? (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="min-w-24"
                            onClick={() => handleRemoveFollower(follower._id)}
                            disabled={loadingId === follower._id}
                          >
                            {loadingId === follower._id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                              "Remove Follower"
                            )}
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" asChild>
                            <Link 
                              href={`/profile/${follower._id}`}
                            >
                              View Profile
                            </Link>
                          </Button>
                        )}
                        </div>
                      ))}
                    </div>
                  ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No followers yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
          </TabsContent>

          {/* Following Tab */}
          <TabsContent value="following" className="space-y-6">
              <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Following
                </CardTitle>
                <CardDescription>People {isOwnProfile ? "you follow" : `${profile.name} follows`}</CardDescription>
                </CardHeader>
              <CardContent>
                {loadingNetwork ? (
                    <div className="space-y-4">
                    {Array(3).fill(0).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : following.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {following.map((follow: any) => (
                      <div 
                        key={follow._id}
                        className="flex items-center gap-3 p-2 hover:bg-muted rounded-md transition-colors"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={follow.avatar || "/placeholder.svg"} alt={follow.name || "Following user"} />
                          <AvatarFallback>{follow.name?.charAt(0) || "?"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                          <p className="font-medium">{follow.name}</p>
                          <p className="text-xs text-muted-foreground">@{follow.username}</p>
                          {follow.bio && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{follow.bio}</p>
                          )}
                          </div>
                        {isAuthenticated ? (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="min-w-24"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleUnfollow(follow._id);
                            }}
                            disabled={loadingId === follow._id}
                          >
                            {loadingId === follow._id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                              "Unfollow"
                            )}
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" asChild>
                            <Link 
                              href={`/profile/${follow._id}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              View Profile
                            </Link>
                          </Button>
                        )}
                        </div>
                      ))}
                    </div>
                  ) : (
                  <div className="text-center py-8">
                      <p className="text-muted-foreground">
                      {isOwnProfile ? "You're not following anyone yet" : `${profile.name} isn't following anyone yet`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}