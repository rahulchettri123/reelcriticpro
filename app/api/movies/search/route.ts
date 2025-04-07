import { NextResponse } from "next/server"
import axios from "axios"
import type { NextRequest } from "next/server"
import { getCollection } from "@/lib/mongodb"

// Fallback search results for partial queries
const fetchFallbackSearch = (query: string) => {
  // Sample movie database for fallback
  const movieDatabase = [
    {
      id: "tt1375666",
      title: "Inception",
      poster: "/placeholder.svg?height=450&width=300",
      year: "2010",
      rating: "8.8",
      genres: ["Action", "Sci-Fi", "Thriller"],
    },
    {
      id: "tt0816692",
      title: "Interstellar",
      poster: "/placeholder.svg?height=450&width=300",
      year: "2014",
      rating: "8.6",
      genres: ["Adventure", "Drama", "Sci-Fi"],
    },
    {
      id: "tt0468569",
      title: "The Dark Knight",
      poster: "/placeholder.svg?height=450&width=300",
      year: "2008",
      rating: "9.0",
      genres: ["Action", "Crime", "Drama"],
    },
    {
      id: "tt0903747",
      title: "Breaking Bad",
      poster: "/placeholder.svg?height=450&width=300",
      year: "2008",
      rating: "9.5",
      genres: ["Crime", "Drama", "Thriller"],
    },
  ]

  // Filter movies that start with the query (case insensitive)
  const lowerQuery = query.toLowerCase()
  return movieDatabase.filter((movie) => movie.title.toLowerCase().includes(lowerQuery))
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("query")
  const forceRefresh = searchParams.get("refresh") === "true"

  if (!query) {
    return NextResponse.json({ results: [] })
  }

  const API_KEY = process.env.RAPIDAPI_KEY
  const API_HOST = process.env.RAPIDAPI_HOST
  let apiResults: any[] = []
  let dbResults: any[] = []

  // 1. Try to get results from DB first (unless force refresh)
  if (!forceRefresh) {
    try {
      console.log("🔍 Searching in MongoDB first...")
      const moviesCollection = await getCollection("movies")
      
      // Search for movies in MongoDB that match the query
      const cursor = moviesCollection.find({
        $or: [
          { title: { $regex: query, $options: "i" } },
          { genres: { $elemMatch: { $regex: query, $options: "i" } } }
        ]
      }).limit(20)
      
      dbResults = await cursor.toArray()
      
      if (dbResults.length > 0) {
        console.log(`✅ Found ${dbResults.length} results in MongoDB`)
        
        // If we have enough results from DB (10+), return them immediately
        if (dbResults.length >= 10) {
          console.log("✅ Returning MongoDB results (sufficient quantity)")
          return NextResponse.json({ results: dbResults })
        } else {
          console.log(`⚠️ Only found ${dbResults.length} results in MongoDB, will supplement with API results`)
        }
      } else {
        console.log("⚠️ No results found in MongoDB, will use API")
      }
    } catch (dbError) {
      console.error("❌ Error searching MongoDB:", dbError)
      // Continue to API if DB search fails
    }
  } else {
    console.log("🔄 Force refresh requested, skipping DB search")
  }

  // 2. Try to get results from API
  if (API_KEY && API_HOST && API_KEY !== "your_rapidapi_key_here") {
    try {
      console.log(`🔍 Fetching search results from API for: ${query}`)

      // First try the autocomplete endpoint which works well for partial queries
      const response = await axios.get(`https://imdb236.p.rapidapi.com/imdb/autocomplete`, {
        headers: {
          "X-RapidAPI-Key": API_KEY,
          "X-RapidAPI-Host": API_HOST,
        },
        params: { query },
      })

      // Extract all available fields from response
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        apiResults = response.data.map((movie: any) => ({
          id: movie.id || "N/A",
          title: movie.primaryTitle || movie.originalTitle || "Unknown Title",
          poster: movie.primaryImage || 
            `/placeholder.svg?height=450&width=300&text=${encodeURIComponent(movie.primaryTitle || "Movie")}`,
          backdrop: movie.primaryImage || 
            `/placeholder.svg?height=400&width=1000&text=${encodeURIComponent(movie.primaryTitle || "Movie")}`,
          type: movie.type || "Unknown Type",
          year: movie.startYear?.toString() || movie.releaseDate?.split("-")[0] || "",
          rating: movie.averageRating?.toString() || "N/A",
          description: movie.description || null,
          genres: Array.isArray(movie.genres) ? movie.genres : [],
          runtime: movie.runtimeMinutes ? `${movie.runtimeMinutes}m` : null,
          url: movie.url || null,
          releaseDate: movie.releaseDate || null,
          language: movie.language || null,
          contentRating: movie.contentRating || null,
          startYear: movie.startYear || null,
          numVotes: movie.numVotes || 0
        }))

        console.log(`✅ Found ${apiResults.length} results from API`)
        
        // 3. Store API results in MongoDB for future searches
        try {
          if (apiResults.length > 0) {
            const moviesCollection = await getCollection("movies")
            
            // Process each result and upsert it to MongoDB
            const bulkOps = apiResults.map(movieData => {
              return {
                updateOne: {
                  filter: { id: movieData.id },
                  update: {
                    $set: {
                      ...movieData,
                      lastAPIUpdate: new Date()
                    },
                    // Increment search count
                    $inc: { searchCount: 1 },
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
              console.log(`✅ Stored ${result.upsertedCount} new movies in MongoDB`)
            }
          }
        } catch (storeError) {
          console.error("❌ Error storing API results in MongoDB:", storeError)
          // Continue even if storage fails
        }
      } else {
        console.log("⚠️ No results from API")
      }
    } catch (error) {
      console.error("❌ Error fetching search results from API:", 
        error instanceof Error ? error.message : 
        (error as any)?.response?.data || String(error))
      // Continue with DB results or fallback
    }
  } else {
    console.log("⚠️ API credentials missing or invalid")
  }

  // 4. Combine results from DB and API, prioritizing API but preserving DB data
  const combinedResults = [...apiResults]
  
  // For each DB result, check if it's already in API results
  // If not, add it to combined results
  // If yes, preserve certain fields from DB
  for (const dbMovie of dbResults) {
    const apiIndex = combinedResults.findIndex(m => m.id === dbMovie.id)
    
    if (apiIndex === -1) {
      // Movie not in API results, add it
      combinedResults.push(dbMovie)
    } else {
      // Movie in both sources, preserve user-generated data from DB
      const preserveFields = [
        'views', 'likes', 'searchCount', 'comments', 
        'userRating', 'createdAt', '_id'
      ]
      
      preserveFields.forEach(field => {
        if (dbMovie[field] !== undefined) {
          combinedResults[apiIndex][field] = dbMovie[field]
        }
      })
    }
  }
  
  // 5. If we have results, return them, otherwise use fallback
  if (combinedResults.length > 0) {
    console.log(`✅ Returning ${combinedResults.length} combined results`)
    
    // Calculate and add local ratings for search results
    try {
      const reviewsCollection = await getCollection("reviews")
      
      // Get all movie IDs to fetch ratings for
      const movieIds = combinedResults.map(movie => movie.id)
      
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
      combinedResults = combinedResults.map(movie => {
        const movieRating = ratingAggregation.find(r => r._id === movie.id)
        
        return {
          ...movie,
          localRating: movieRating ? {
            average: parseFloat(movieRating.averageRating.toFixed(1)),
            count: movieRating.reviewCount
          } : null
        }
      })
    } catch (error) {
      console.error("Error calculating local ratings:", error)
      // Continue even if rating calculation fails
    }
    
    return NextResponse.json({ results: combinedResults })
  } else {
    console.log("⚠️ No results from any source, using fallback")
    return NextResponse.json({ results: fetchFallbackSearch(query) })
  }
}

