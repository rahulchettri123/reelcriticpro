import { NextResponse } from "next/server"
import axios from "axios"
import { getCollection } from "@/lib/mongodb"
import type { NextRequest } from "next/server"

// Fallback data in case API fails
const fetchFallbackMovies = () => {
  return [
    {
      id: "tt1375666",
      title: "Inception",
      poster: "/placeholder.svg?height=450&width=300",
      backdrop: "/placeholder.svg?height=450&width=800",
      year: "2010",
      rating: "8.8",
      genres: ["Action", "Sci-Fi", "Thriller"],
    },
    {
      id: "tt0816692",
      title: "Interstellar",
      poster: "/placeholder.svg?height=450&width=300",
      backdrop: "/placeholder.svg?height=450&width=800",
      year: "2014",
      rating: "8.6",
      genres: ["Adventure", "Drama", "Sci-Fi"],
    },
    {
      id: "tt0468569",
      title: "The Dark Knight",
      poster: "/placeholder.svg?height=450&width=300",
      backdrop: "/placeholder.svg?height=450&width=800",
      year: "2008",
      rating: "9.0",
      genres: ["Action", "Crime", "Drama"],
    },
    {
      id: "tt0109830",
      title: "Forrest Gump",
      poster: "/placeholder.svg?height=450&width=300",
      backdrop: "/placeholder.svg?height=450&width=800",
      year: "1994",
      rating: "8.8",
      genres: ["Drama", "Romance"],
    },
    {
      id: "tt0111161",
      title: "The Shawshank Redemption",
      poster: "/placeholder.svg?height=450&width=300",
      backdrop: "/placeholder.svg?height=450&width=800",
      year: "1994",
      rating: "9.3",
      genres: ["Drama"],
    },
    {
      id: "tt0068646",
      title: "The Godfather",
      poster: "/placeholder.svg?height=450&width=300",
      backdrop: "/placeholder.svg?height=450&width=800",
      year: "1972",
      rating: "9.2",
      genres: ["Crime", "Drama"],
    },
    {
      id: "tt0133093",
      title: "The Matrix",
      poster: "/placeholder.svg?height=450&width=300",
      backdrop: "/placeholder.svg?height=450&width=800",
      year: "1999",
      rating: "8.7",
      genres: ["Action", "Sci-Fi"],
    },
    {
      id: "tt0120737",
      title: "The Lord of the Rings: The Fellowship of the Ring",
      poster: "/placeholder.svg?height=450&width=300",
      backdrop: "/placeholder.svg?height=450&width=800",
      year: "2001",
      rating: "8.8",
      genres: ["Adventure", "Drama", "Fantasy"],
    },
  ]
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limitParam = searchParams.get("limit")
  const forceRefresh = searchParams.get("forceRefresh") === "true"
  const limit = limitParam ? parseInt(limitParam, 10) : 8 // Default to 8 movies

  const API_KEY = process.env.RAPIDAPI_KEY
  const API_HOST = process.env.RAPIDAPI_HOST

  console.log("API Key available:", !!API_KEY)
  console.log("API Host available:", !!API_HOST)
  console.log(`Requested ${limit} popular movies${forceRefresh ? " with force refresh" : ""}`)

  let dbMovies: any[] = []

  // Try to get from MongoDB if not forcing refresh
  if (!forceRefresh) {
    try {
      const moviesCollection = await getCollection("movies")
      
      // Get popular movies from database, sorted by views
      const cursor = moviesCollection.find({})
        .sort({ views: -1, updatedAt: -1 })
        .limit(limit)
      
      dbMovies = await cursor.toArray()
      
      if (dbMovies.length >= limit) {
        console.log(`✅ Returning ${dbMovies.length} popular movies from database`)
        
        // Calculate and add local ratings for each movie
        const reviewsCollection = await getCollection("reviews")
        
        // Get all movie IDs to fetch ratings for
        const movieIds = dbMovies.map(movie => movie.id)
        
        // Get average ratings for all movies in one aggregation query
        const ratingAggregation = await reviewsCollection.aggregate([
          { $match: { movie: { $in: movieIds } } },
          { 
            $group: { 
              _id: "$movie", 
              averageRating: { $avg: "$rating" },
              reviewCount: { $sum: 1 }
            } 
          }
        ]).toArray()
        
        // Add local ratings to each movie
        dbMovies = dbMovies.map(movie => {
          const movieRating = ratingAggregation.find(r => r._id === movie.id)
          
          return {
            ...movie,
            localRating: movieRating ? {
              average: parseFloat(movieRating.averageRating.toFixed(1)),
              count: movieRating.reviewCount
            } : null
          }
        })
        
        return NextResponse.json({ movies: dbMovies })
      } else {
        console.log(`⚠️ Only found ${dbMovies.length} movies in database, supplementing with API`)
      }
    } catch (dbError) {
      console.error("❌ Error fetching from database:", dbError)
      // Continue to API if database fails
    }
  }

  // If API keys are missing or invalid, use fallback data or DB results
  if (!API_KEY || !API_HOST || API_KEY === "your_rapidapi_key_here") {
    console.log("Missing or invalid API credentials. Using fallback data...")
    return NextResponse.json({ 
      movies: dbMovies.length > 0 ? dbMovies : fetchFallbackMovies().slice(0, limit) 
    })
  }

  try {
    console.log("🚀 Fetching most popular movies from RapidAPI...")

    const options = {
      method: 'GET',
      url: 'https://imdb236.p.rapidapi.com/imdb/most-popular-movies',
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': API_HOST
      }
    };

    const response = await axios.request(options)
    
    // Check if the response has the expected structure
    if (!response.data || !Array.isArray(response.data)) {
      console.error("🚨 API Response does not contain a valid movie list:", response.data)
      return NextResponse.json({ 
        movies: dbMovies.length > 0 ? dbMovies : fetchFallbackMovies().slice(0, limit) 
      })
    }

    // Process the movies to ensure consistent format with the new API structure
    const processedMovies = response.data.map((movie: any) => ({
      id: movie.id || "unknown",
      title: movie.primaryTitle || movie.originalTitle || "Unknown Title",
      poster: movie.primaryImage || 
        `/placeholder.svg?height=450&width=300&text=${encodeURIComponent(movie.primaryTitle || "Movie")}`,
      backdrop: movie.primaryImage || 
        `/placeholder.svg?height=450&width=800&text=${encodeURIComponent(movie.primaryTitle || "Movie")}`,
      year: movie.startYear?.toString() || movie.releaseDate?.split("-")[0] || "Unknown",
      rating: movie.averageRating?.toString() || "N/A",
      genres: Array.isArray(movie.genres) ? movie.genres : [],
      description: movie.description || "No description available.",
      runtime: movie.runtimeMinutes ? `${movie.runtimeMinutes}m` : null,
      contentRating: movie.contentRating || null,
      type: movie.type || "movie",
      url: movie.url || null,
      language: movie.language || null,
      budget: movie.budget || null,
      grossWorldwide: movie.grossWorldwide || null,
      isAdult: movie.isAdult || false,
      numVotes: movie.numVotes || 0
    }))

    // Store movies in database
    try {
      if (processedMovies.length > 0) {
        const moviesCollection = await getCollection("movies")
        
        // Process each result and upsert it to MongoDB
        const bulkOps = processedMovies.map(movieData => {
          return {
            updateOne: {
              filter: { id: movieData.id },
              update: {
                $set: {
                  ...movieData,
                  lastAPIUpdate: new Date()
                },
                $inc: { popularity: 1 },
                $setOnInsert: { 
                  createdAt: new Date(),
                  views: 0
                }
              },
              upsert: true
            }
          }
        })
        
        // Execute bulk operation if there are operations to perform
        if (bulkOps.length > 0) {
          const result = await moviesCollection.bulkWrite(bulkOps)
          console.log(`✅ Stored/updated ${result.upsertedCount} movies in MongoDB`)
        }
      }
    } catch (storeError) {
      console.error("❌ Error storing API results in MongoDB:", storeError)
      // Continue even if storage fails
    }

    console.log(`✅ Returning ${Math.min(processedMovies.length, limit)} movies from API`)
    return NextResponse.json({ movies: processedMovies.slice(0, limit) })
  } catch (error: any) {
    console.error("❌ Error fetching movies:", error?.response?.data || error.message)
    return NextResponse.json({ 
      movies: dbMovies.length > 0 ? dbMovies : fetchFallbackMovies().slice(0, limit) 
    })
  }
}

