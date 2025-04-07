import { ObjectId } from "mongodb"

// User type for the expanded profile
export interface User {
  _id: string | ObjectId
  name: string
  email: string
  username: string
  password?: string
  avatar?: string
  role: "admin" | "critic" | "viewer"
  
  // Profile fields
  bio?: string
  location?: string
  website?: string
  
  // Social links
  social?: {
    twitter?: string
    instagram?: string
    facebook?: string
    linkedin?: string
    letterboxd?: string
  }
  
  // User preferences
  preferences?: {
    favoriteGenres?: string[]
    language?: string
    notifications?: boolean
    theme?: "light" | "dark" | "system"
    privacy?: {
      showEmail?: boolean
      showWatchlist?: boolean
      showFavorites?: boolean
    }
  }
  
  // Engagement statistics
  stats?: {
    reviewsCount: number
    favoritesCount: number
    watchlistCount: number
    viewsCount: number
    likesReceived: number
    followersCount: number
    followingCount: number
  }
  
  // Collections
  favorites: string[]  // Array of movie IDs
  watchlist: string[]  // Array of movie IDs
  followers: string[]  // Array of user IDs
  following: string[]  // Array of user IDs
  
  // Dates
  joinDate?: Date
  lastActive?: Date
  createdAt: Date
  updatedAt: Date
  
  // Verification
  isVerified?: boolean
  
  // Visual
  cover?: string  // Background/banner image for profile
}

// Movie type
export interface Movie {
  id: string
  title: string
  poster?: string
  backdrop?: string
  year: string
  rating?: string
  runtime?: string
  director?: string
  cast?: string[]
  genres?: string[]
  description?: string
  views?: number
  type?: "movie" | "tvSeries" | "tvMiniSeries"
  contentRating?: string
  language?: string
  country?: string
  budget?: number
  grossWorldwide?: number
  releaseDate?: string
  numVotes?: number
  url?: string
  createdAt?: Date
  updatedAt?: Date
}

// Review type
export interface Review {
  _id: string | ObjectId
  user: string | ObjectId | User
  movie: string
  movieTitle: string
  moviePoster?: string
  rating: number
  content: string
  likes: (string | ObjectId)[]
  comments?: Comment[]
  createdAt: Date
  updatedAt: Date
}

// Comment type
export interface Comment {
  _id: string | ObjectId
  user: string | ObjectId | User
  content: string
  likes: (string | ObjectId)[]
  createdAt: Date
  updatedAt: Date
} 