import { NextResponse } from "next/server"
import axios from "axios"
import type { NextRequest } from "next/server"
import { getCollection } from "@/lib/mongodb" 

// Fallback search results
const fetchFallbackSuggestions = (query: string) => {
  const fallbackMovies = [
    {
      id: "tt1375666",
      title: "Inception",
      poster: "/placeholder.svg?height=60&width=40",
      year: "2010",
      genres: ["Action", "Sci-Fi", "Thriller"],
      backdrop: "/placeholder.svg?height=400&width=1000",
      rating: "8.8",
      runtime: "2h 28m",
      director: "Christopher Nolan",
      type: "movie",
      description: "A thief who steals corporate secrets through dream-sharing technology is given the task of planting an idea in someone's mind.",
    },
    {
      id: "tt0816692",
      title: "Interstellar",
      poster: "/placeholder.svg?height=60&width=40",
      year: "2014",
      genres: ["Adventure", "Drama", "Sci-Fi"],
      backdrop: "/placeholder.svg?height=400&width=1000",
      rating: "8.6",
      runtime: "2h 49m", 
      director: "Christopher Nolan",
      type: "movie",
      description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    },
    {
      id: "tt0468569",
      title: "The Dark Knight",
      poster: "/placeholder.svg?height=60&width=40", 
      year: "2008",
      genres: ["Action", "Crime", "Drama"],
      backdrop: "/placeholder.svg?height=400&width=1000",
      rating: "9.0",
      runtime: "2h 32m",
      director: "Christopher Nolan",
      type: "movie",
      description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    },
  ]

  return fallbackMovies.filter((movie) => movie.title.toLowerCase().includes(query.toLowerCase()))
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("query")

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  // Try to get results from database first
  try {
    const moviesCollection = await getCollection("movies")
    
    // Search for movies in MongoDB that match the query
    const cursor = moviesCollection.find({
      title: { $regex: query, $options: "i" }
    }).limit(10)
    
    const dbResults = await cursor.toArray()
    
    if (dbResults.length > 0) {
      console.log(`✅ Found ${dbResults.length} autocomplete results in MongoDB`)
      // If we have results from the database, return them immediately 
      return NextResponse.json({ results: dbResults })
    }
  } catch (dbError) {
    console.error("❌ Error searching MongoDB for autocomplete:", dbError)
    // Continue to API if DB search fails
  }

  const API_KEY = process.env.RAPIDAPI_KEY
  const API_HOST = process.env.RAPIDAPI_HOST

  // If API keys are missing or invalid, use fallback data
  if (!API_KEY || !API_HOST || API_KEY === "your_rapidapi_key_here") {
    console.log("Missing or invalid API credentials. Using fallback suggestions...")
    return NextResponse.json({ results: fetchFallbackSuggestions(query) })
  }

  try {
    console.log(`🔍 Fetching autocomplete suggestions for: ${query}`)

    const response = await axios.get(`https://imdb236.p.rapidapi.com/imdb/autocomplete`, {
      headers: {
        "X-RapidAPI-Key": API_KEY,
        "X-RapidAPI-Host": API_HOST,
      },
      params: { query },
    })

    // Extract all available fields from response
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      // Process the basic results first
      const basicResults = response.data.map((movie: any) => ({
        id: movie.id || "N/A",
        title: movie.primaryTitle || movie.originalTitle || "Unknown Title",
        poster:
          movie.primaryImage ||
          `/placeholder.svg?height=60&width=40&text=${encodeURIComponent(movie.primaryTitle || "Movie")}`,
        backdrop: movie.primaryImage || 
          `/placeholder.svg?height=400&width=1000&text=${encodeURIComponent(movie.primaryTitle || "Movie")}`,
        year: movie.startYear?.toString() || movie.releaseDate?.split("-")[0] || "",
        type: movie.type || "movie",
        rating: movie.averageRating?.toString() || "N/A",
        description: movie.description || "No description available.",
        genres: Array.isArray(movie.genres) ? movie.genres : [],
        runtime: movie.runtimeMinutes ? `${movie.runtimeMinutes}m` : "Unknown",
        director: movie.director || "Unknown",
        cast: Array.isArray(movie.cast) ? movie.cast : [],
      }))
      
      // Store these results in the database for future use
      try {
        if (basicResults.length > 0) {
          const moviesCollection = await getCollection("movies")
          
          // Process each result and upsert it to MongoDB
          const bulkOps = basicResults.map(movieData => {
            return {
              updateOne: {
                filter: { id: movieData.id },
                update: {
                  $set: {
                    ...movieData,
                    lastAPIUpdate: new Date()
                  },
                  // Only set createdAt if it's a new document
                  $setOnInsert: { createdAt: new Date() }
                },
                upsert: true
              }
            }
          })
          
          // Execute bulk operation if there are operations to perform
          if (bulkOps.length > 0) {
            const result = await moviesCollection.bulkWrite(bulkOps)
            console.log(`✅ Stored ${result.upsertedCount} new movies in MongoDB from autocomplete`)
          }
        }
      } catch (storeError) {
        console.error("❌ Error storing autocomplete results in MongoDB:", storeError)
        // Continue even if storage fails
      }
      
      return NextResponse.json({ results: basicResults })
    }

    return NextResponse.json({ results: fetchFallbackSuggestions(query) })
  } catch (error: any) {
    console.error("❌ Error fetching autocomplete suggestions:", error?.response?.data || error.message)
    return NextResponse.json({ results: fetchFallbackSuggestions(query) })
  }
}

