import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import axios from "axios"
import { getCollection } from "@/lib/mongodb"

// Cache duration in seconds
const CACHE_MAX_AGE = 60 * 60; // 1 hour

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "10")
    const forceRefresh = searchParams.get("forceRefresh") === "true"
    
    console.log(`Requested ${limit} upcoming movies${forceRefresh ? " with force refresh" : ""}`)

    // Initialize response headers with caching
    const headers = {
      'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`,
      'Content-Type': 'application/json',
    };

    // Check if we have API credentials
    const API_KEY = process.env.RAPIDAPI_KEY
    const API_HOST = process.env.RAPIDAPI_HOST
    
    console.log(`API Key available: ${Boolean(API_KEY && API_KEY !== 'your_rapidapi_key_here')}`)
    console.log(`API Host available: ${Boolean(API_HOST)}`)
    
    // First, try to get from our database (unless force refresh)
    if (!forceRefresh) {
      try {
        const moviesCollection = await getCollection("movies")
        
        // Efficient query with projection to select only needed fields
        const upcomingMovies = await moviesCollection.find(
          { 
            isUpcoming: true,
            releaseDate: { $exists: true }
          },
          { 
            projection: {
              id: 1,
              title: 1,
              poster: 1,
              year: 1,
              genres: 1,
              releaseDate: 1,
              rating: 1,
              _id: 0 // Exclude _id to reduce payload size
            }
          }
        )
        .sort({ releaseDate: 1 })
        .limit(limit)
        .toArray()
        
        if (upcomingMovies.length > 0) {
          console.log(`✅ Returning ${upcomingMovies.length} upcoming movies from database`)
          return NextResponse.json(
            { movies: upcomingMovies }, 
            { headers }
          )
        } else {
          console.log("⚠️ No upcoming movies in database, will fetch from API")
        }
      } catch (dbError) {
        console.error("❌ Database error:", dbError)
      }
    }
    
    // If we get here, we need to fetch from API
    if (API_KEY && API_HOST && API_KEY !== 'your_rapidapi_key_here') {
      console.log("🚀 Fetching upcoming movies from RapidAPI...")
      
      try {
        const response = await axios.request({
          method: 'GET',
          url: 'https://imdb236.p.rapidapi.com/imdb/upcoming-releases',
          params: {
            countryCode: 'US',
            type: 'MOVIE'
          },
          headers: {
            'x-rapidapi-key': API_KEY,
            'x-rapidapi-host': API_HOST
          },
          timeout: 5000 // Set a timeout to avoid hanging requests
        })
        
        if (response.data && Array.isArray(response.data)) {
          const upcomingReleases = response.data
          
          // Transform the API response to our format
          let allMovies: any[] = []
          const bulkOps: any[] = [] // For bulk database operations
          
          // Process each release date
          for (const release of upcomingReleases) {
            if (release.titles && Array.isArray(release.titles)) {
              // Process each movie in this release date
              for (const movie of release.titles) {
                // Convert to our movie format
                const movieData = {
                  id: movie.id,
                  title: movie.title,
                  poster: movie.primaryImage || null,
                  backdrop: movie.primaryImage || null,
                  year: movie.startYear?.toString() || "Upcoming",
                  genres: Array.isArray(movie.ganre) ? movie.ganre : [],
                  cast: Array.isArray(movie.principalCredits) ? movie.principalCredits : [],
                  description: `Upcoming release: ${movie.title}`,
                  releaseDate: release.date || null,
                  isUpcoming: true,
                  views: 0,
                  updatedAt: new Date(),
                  createdAt: new Date()
                }
                
                allMovies.push(movieData)
                
                // Add to bulk operations
                bulkOps.push({
                  updateOne: {
                    filter: { id: movieData.id },
                    update: { $set: movieData },
                    upsert: true
                  }
                })
              }
            }
          }
          
          // Perform bulk database update in background
          if (bulkOps.length > 0) {
            // Don't await this to improve response time
            getCollection("movies").then(collection => {
              collection.bulkWrite(bulkOps)
                .then(result => console.log(`✅ Stored/updated ${result.upsertedCount + result.modifiedCount} movies in MongoDB`))
                .catch(err => console.error("❌ Bulk write error:", err))
            })
          }
          
          // Return the movies up to requested limit
          const limitedMovies = allMovies.slice(0, limit)
          
          // Calculate and add local ratings for each movie
          try {
            const reviewsCollection = await getCollection("reviews")
            
            // Get all movie IDs to fetch ratings for
            const movieIds = limitedMovies.map(movie => movie.id)
            
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
            const moviesWithRatings = limitedMovies.map(movie => {
              const movieRating = ratingAggregation.find(r => r._id === movie.id)
              
              return {
                ...movie,
                localRating: movieRating ? {
                  average: parseFloat(movieRating.averageRating.toFixed(1)),
                  count: movieRating.reviewCount
                } : null
              }
            })
            
            return NextResponse.json(
              { movies: moviesWithRatings }, 
              { headers }
            )
          } catch (ratingError) {
            console.error("❌ Error calculating local ratings:", ratingError)
            // Continue with movies without ratings if calculation fails
            return NextResponse.json(
              { movies: limitedMovies }, 
              { headers }
            )
          }
        } else {
          console.error("❌ Invalid API response format:", response.data)
          return NextResponse.json(
            { error: "Invalid API response" },
            { status: 500 }
          )
        }
      } catch (apiError: any) {
        console.error("❌ API request error:", apiError.message)
        return NextResponse.json(
          { error: "Failed to fetch upcoming movies" },
          { status: 500 }
        )
      }
    } else {
      console.log("⚠️ API credentials not available, using fallback data")
      
      // Return fallback data
      const fallbackMovies = [
        {
          id: "tt21955520",
          title: "Peter Pan's Neverland Nightmare",
          poster: "https://m.media-amazon.com/images/M/MV5BNGZmNzhkZDAtMzJlZC00OTkxLWE1NWUtZDNjYTVlNjk0ZjNkXkEyXkFqcGc@._V1_.jpg",
          year: "2025",
          releaseDate: "2025-01-13",
          genres: ["Adventure", "Fantasy", "Horror"],
          cast: ["Kierston Wareing", "Kit Green", "Chrissie Wunna"],
          isUpcoming: true
        },
        {
          id: "tt14260836",
          title: "Better Man",
          poster: "https://m.media-amazon.com/images/M/MV5BYWU3YzU0NTItMGVlYi00YTFmLWE5MmQtNjg4ODQ3ZWYyNjRkXkEyXkFqcGc@._V1_.jpg",
          year: "2024",
          releaseDate: "2025-01-17",
          genres: ["Biography", "Fantasy", "Musical"],
          cast: ["Robbie Williams", "Jonno Davies", "Steve Pemberton"],
          isUpcoming: true
        },
        {
          id: "tt4216984",
          title: "Wolf Man",
          poster: "https://m.media-amazon.com/images/M/MV5BYmFkYTNhMWUtMjEyNy00MWE0LWJlYTQtMWFmNDUwNmFjMzAxXkEyXkFqcGc@._V1_.jpg",
          year: "2025",
          releaseDate: "2025-02-15",
          genres: ["Horror"],
          cast: ["Julia Garner", "Christopher Abbott", "Sam Jaeger"],
          isUpcoming: true
        }
      ]
      
      // Calculate and add local ratings for fallback movies
      try {
        const reviewsCollection = await getCollection("reviews")
        
        // Get all movie IDs to fetch ratings for
        const movieIds = fallbackMovies.map(movie => movie.id)
        
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
        const moviesWithRatings = fallbackMovies.map(movie => {
          const movieRating = ratingAggregation.find(r => r._id === movie.id)
          
          return {
            ...movie,
            localRating: movieRating ? {
              average: parseFloat(movieRating.averageRating.toFixed(1)),
              count: movieRating.reviewCount
            } : null
          }
        })
        
        return NextResponse.json(
          { movies: moviesWithRatings.slice(0, limit) }, 
          { headers }
        )
      } catch (ratingError) {
        console.error("❌ Error calculating local ratings for fallback movies:", ratingError)
        // Continue with movies without ratings if calculation fails
        return NextResponse.json(
          { movies: fallbackMovies.slice(0, limit) }, 
          { headers }
        )
      }
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 