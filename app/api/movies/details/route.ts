import { NextResponse } from "next/server"
import axios from "axios"
import type { NextRequest } from "next/server"
import { getCollection } from "@/lib/mongodb"

// Fallback movie details for specific popular movies
const getFallbackMovie = (id: string) => {
  // Popular movies fallback data
  const fallbackMovies: Record<string, any> = {
    tt0468569: {
      id: "tt0468569",
      title: "The Dark Knight",
      poster: "https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_.jpg",
      backdrop: "https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_.jpg",
      year: "2008",
      rating: "9.0",
      runtime: "2h 32m",
      director: "Christopher Nolan",
      cast: ["Christian Bale", "Heath Ledger", "Aaron Eckhart"],
      genres: ["Action", "Crime", "Drama"],
      description:
        "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
      url: "https://www.imdb.com/title/tt0468569/",
      contentRating: "PG-13",
      type: "movie",
      releaseDate: "2008-07-18"
    },
    tt1375666: {
      id: "tt1375666",
      title: "Inception",
      poster: "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_.jpg",
      backdrop: "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_.jpg",
      year: "2010",
      rating: "8.8",
      runtime: "2h 28m",
      director: "Christopher Nolan",
      cast: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Elliot Page"],
      genres: ["Action", "Adventure", "Sci-Fi"],
      description:
        "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    },
    tt0133093: {
      id: "tt0133093",
      title: "The Matrix",
      poster:
        "https://m.media-amazon.com/images/M/MV5BNzQzOTk3OTAtNDQ0Zi00ZTVkLWI0MTEtMDllZjNkYzNjNTc4L2ltYWdlXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_.jpg",
      backdrop:
        "https://m.media-amazon.com/images/M/MV5BNzQzOTk3OTAtNDQ0Zi00ZTVkLWI0MTEtMDllZjNkYzNjNTc4L2ltYWdlXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_.jpg",
      year: "1999",
      rating: "8.7",
      runtime: "2h 16m",
      director: "Lana Wachowski, Lilly Wachowski",
      cast: ["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss"],
      genres: ["Action", "Sci-Fi"],
      description:
        "When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth--the life he knows is the elaborate deception of an evil cyber-intelligence.",
    },
    tt0903747: {
      id: "tt0903747",
      title: "Breaking Bad",
      poster:
        "https://m.media-amazon.com/images/M/MV5BMzU5ZGYzNmQtMTdhYy00OGRiLTg0NmQtYjVjNzliZTg1ZGE4XkEyXkFqcGc@._V1_.jpg",
      backdrop:
        "https://m.media-amazon.com/images/M/MV5BMzU5ZGYzNmQtMTdhYy00OGRiLTg0NmQtYjVjNzliZTg1ZGE4XkEyXkFqcGc@._V1_.jpg",
      year: "2008",
      rating: "9.5",
      runtime: "49m",
      director: "Vince Gilligan",
      cast: ["Bryan Cranston", "Aaron Paul", "Anna Gunn"],
      genres: ["Crime", "Drama", "Thriller"],
      description:
        "A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student to secure his family's future.",
    },
  }

  // Return the specific movie if it exists in our fallback data
  if (fallbackMovies[id]) {
    return fallbackMovies[id]
  }

  // Otherwise return a generic fallback with the requested ID
  return {
    id,
    title: `Movie ${id}`,
    poster: `/placeholder.svg?height=600&width=400&text=Movie%20${id}`,
    backdrop: `/placeholder.svg?height=400&width=1000&text=Movie%20${id}`,
    year: "Unknown",
    rating: "N/A",
    runtime: "Unknown",
    director: "Unknown",
    cast: [],
    genres: [],
    description: "No description available for this movie.",
    url: null,
    contentRating: "Not Rated",
    type: "movie",
    releaseDate: null,
    countriesOfOrigin: [],
    spokenLanguages: [],
    filmingLocations: []
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const forceRefresh = searchParams.get("refresh") === "true"

  if (!id) {
    return NextResponse.json({ error: "Movie ID is required" }, { status: 400 })
  }

  console.log(`Processing request for movie ID: ${id}${forceRefresh ? " (with force refresh)" : ""}`)

  const API_KEY = process.env.RAPIDAPI_KEY
  const API_HOST = process.env.RAPIDAPI_HOST
  let movieDataFromAPI: any = null
  let apiError: any = null

  // Check DB first unless force refresh is requested
  let movieDataFromDB: any = null
  let dbError: any = null
  let needsEnrichment = false

  // Get local average rating from our reviews
  let localRating = {
    average: 0,
    count: 0
  }

  try {
    // Get reviews for this movie to calculate average rating
    const reviewsCollection = await getCollection("reviews")
    const reviewsAggregation = await reviewsCollection.aggregate([
      { $match: { movie: id } },
      { 
        $group: { 
          _id: null, 
          averageRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 }
        } 
      }
    ]).toArray()
    
    if (reviewsAggregation.length > 0) {
      localRating.average = parseFloat(reviewsAggregation[0].averageRating.toFixed(1))
      localRating.count = reviewsAggregation[0].reviewCount
      console.log(`📊 Found ${localRating.count} reviews with average rating: ${localRating.average}`)
    }
  } catch (error) {
    console.error("❌ Error calculating local rating:", error)
  }

  if (!forceRefresh) {
    try {
      const moviesCollection = await getCollection("movies")
      movieDataFromDB = await moviesCollection.findOne({ id: id })
      
      if (movieDataFromDB) {
        console.log("✅ Found movie in DB:", movieDataFromDB.title)
        
        // Check if the DB record needs enrichment (has limited fields)
        const essentialFields = ["description", "cast", "director", "url", "language", "budget", "grossWorldwide", "numVotes"]
        needsEnrichment = essentialFields.some(field => !movieDataFromDB[field])
        
        if (!needsEnrichment) {
          // Increment views if we found a complete record
          await moviesCollection.updateOne(
            { id: id },
            { $inc: { views: 1 }, $set: { lastAccessed: new Date() } }
          )
          
          console.log("✅ Movie record is complete, incrementing views and returning")
          
          // Add local rating data to the response
          movieDataFromDB.localRating = localRating
          
          return NextResponse.json({ movie: movieDataFromDB })
        } else {
          console.log("⚠️ Movie found in DB but has incomplete data, will attempt enrichment")
        }
      } else {
        console.log("ℹ️ Movie not found in DB, will fetch from API")
      }
    } catch (error) {
      console.error("❌ Error checking database:", error)
      dbError = error
    }
  } else {
    console.log("🔄 Force refresh requested, skipping DB check")
  }

  // 1. Try fetching from APIs if needed (force refresh OR not in DB OR needs enrichment)
  if (forceRefresh || !movieDataFromDB || needsEnrichment) {
    if (API_KEY && API_HOST && API_KEY !== "your_rapidapi_key_here") {
      try {
        // Try popular movies API first
        console.log("🔍 Trying most-popular-movies API...")
        const popularResponse = await axios.get(`https://imdb236.p.rapidapi.com/imdb/most-popular-movies`, {
          headers: {
            "X-RapidAPI-Key": API_KEY,
            "X-RapidAPI-Host": API_HOST,
          }
        })
        
        if (popularResponse.data && Array.isArray(popularResponse.data)) {
          const exactMatch = popularResponse.data.find((item: any) => item.id === id)
          if (exactMatch) {
            console.log("✅ Found match in popular movies API!")
            
            // Map response to our movie object structure
            movieDataFromAPI = {
              id: exactMatch.id,
              title: exactMatch.primaryTitle || exactMatch.originalTitle || "Unknown Title",
              poster: exactMatch.primaryImage || `/placeholder.svg?height=450&width=300&text=${encodeURIComponent(exactMatch.primaryTitle || "Movie")}`,
              backdrop: exactMatch.primaryImage || `/placeholder.svg?height=400&width=1000&text=${encodeURIComponent(exactMatch.primaryTitle || "Movie")}`,
              year: exactMatch.startYear?.toString() || exactMatch.releaseDate?.split("-")[0] || "Unknown",
              rating: exactMatch.averageRating?.toString() || "N/A",
              runtime: exactMatch.runtimeMinutes ? `${exactMatch.runtimeMinutes}m` : "Unknown",
              director: exactMatch.director || "Unknown",
              cast: Array.isArray(exactMatch.cast) ? exactMatch.cast : [],
              genres: Array.isArray(exactMatch.genres) ? exactMatch.genres : [],
              description: exactMatch.description || "No description available.",
              contentRating: exactMatch.contentRating || "Not Rated",
              type: exactMatch.type || "movie",
              url: exactMatch.url || null,
              releaseDate: exactMatch.releaseDate || null,
              startYear: exactMatch.startYear || null,
              endYear: exactMatch.endYear || null,
              language: exactMatch.language || null,
              interests: exactMatch.interests || null,
              countriesOfOrigin: exactMatch.countriesOfOrigin || [],
              externalLinks: exactMatch.externalLinks || null,
              spokenLanguages: exactMatch.spokenLanguages || [],
              filmingLocations: exactMatch.filmingLocations || [],
              budget: exactMatch.budget || null,
              grossWorldwide: exactMatch.grossWorldwide || null,
              isAdult: exactMatch.isAdult || false,
              numVotes: exactMatch.numVotes || 0
            }
          } else {
            console.log("⚠️ Movie not found in popular movies API, trying autocomplete...")
          }
        }
        
        // If popular API failed, try autocomplete as fallback
        if (!movieDataFromAPI) {
          console.log("🔍 Trying autocomplete API...")
          const autocompleteResponse = await axios.get(`https://imdb236.p.rapidapi.com/imdb/autocomplete`, {
            headers: {
              "X-RapidAPI-Key": API_KEY,
              "X-RapidAPI-Host": API_HOST,
            },
            params: { query: id.replace(/^tt/, "") },
          })
          
          if (autocompleteResponse.data && Array.isArray(autocompleteResponse.data) && autocompleteResponse.data.length > 0) {
            const exactMatch = autocompleteResponse.data.find((item: any) => item.id === id)
            if (exactMatch) {
              console.log("✅ Found match in autocomplete API!")
              
              // Map response to our movie object structure
              movieDataFromAPI = {
                id: exactMatch.id,
                title: exactMatch.primaryTitle || exactMatch.originalTitle || "Unknown Title",
                poster: exactMatch.primaryImage || `/placeholder.svg?height=450&width=300&text=${encodeURIComponent(exactMatch.primaryTitle || "Movie")}`,
                backdrop: exactMatch.primaryImage || `/placeholder.svg?height=400&width=1000&text=${encodeURIComponent(exactMatch.primaryTitle || "Movie")}`,
                year: exactMatch.startYear?.toString() || exactMatch.releaseDate?.split("-")[0] || "Unknown",
                rating: exactMatch.averageRating?.toString() || "N/A",
                runtime: exactMatch.runtimeMinutes ? `${exactMatch.runtimeMinutes}m` : "Unknown",
                director: exactMatch.director || "Unknown",
                cast: Array.isArray(exactMatch.cast) ? exactMatch.cast : [],
                genres: Array.isArray(exactMatch.genres) ? exactMatch.genres : [],
                description: exactMatch.description || "No description available.",
                contentRating: exactMatch.contentRating || "Not Rated",
                type: exactMatch.type || "movie",
                url: exactMatch.url || null,
                releaseDate: exactMatch.releaseDate || null,
                startYear: exactMatch.startYear || null,
                endYear: exactMatch.endYear || null,
                language: exactMatch.language || null,
                interests: exactMatch.interests || null,
                countriesOfOrigin: exactMatch.countriesOfOrigin || [],
                externalLinks: exactMatch.externalLinks || null,
                spokenLanguages: exactMatch.spokenLanguages || [],
                filmingLocations: exactMatch.filmingLocations || [],
                budget: exactMatch.budget || null,
                grossWorldwide: exactMatch.grossWorldwide || null,
                isAdult: exactMatch.isAdult || false,
                numVotes: exactMatch.numVotes || 0
              }
            } else {
              console.log("⚠️ No exact match found in autocomplete API for ID:", id)
            }
          } else {
            console.log("⚠️ Empty or invalid response from autocomplete API")
          }
        }

        // If we still don't have data, try the fallback
        if (!movieDataFromAPI && !movieDataFromDB) {
          console.log("🔄 No API data found, trying fallback...")
          const fallbackMovie = getFallbackMovie(id)
          if (fallbackMovie) {
            console.log("✅ Using fallback data for:", fallbackMovie.title)
            movieDataFromAPI = fallbackMovie
          }
        }
      } catch (error) {
        console.error("❌ Error fetching from APIs:", error)
        apiError = error
      }
    } else {
      console.log("⚠️ API credentials missing or invalid")
    }
  }

  // 3. Update DB with API data if available
  if (movieDataFromAPI) {
    try {
      const moviesCollection = await getCollection("movies")
      
      // Prepare the data for database storage
      const dbData = {
        ...movieDataFromAPI,
        views: (movieDataFromDB?.views || 0) + 1,
        updatedAt: new Date()
      }
      
      if (!movieDataFromDB) {
        // New record
        dbData.createdAt = new Date()
      }
      
      // Replace or create the document
      await moviesCollection.replaceOne(
        { id: id },
        dbData,
        { upsert: true }
      )
      
      console.log("✅ Successfully updated/inserted movie in database:", movieDataFromAPI.title)
      
      // Add MongoDB _id if it exists
      if (movieDataFromDB?._id) {
        movieDataFromAPI._id = movieDataFromDB._id
      }
      
      // Set views from the DB or initialize to 1
      movieDataFromAPI.views = (movieDataFromDB?.views || 0) + 1
      
      // Add local rating data to the response
      movieDataFromAPI.localRating = localRating
      
      return NextResponse.json({ movie: movieDataFromAPI })
    } catch (error) {
      console.error("❌ Error updating database:", error)
      dbError = error
      
      // Even if DB update fails, still return the API data with local rating
      movieDataFromAPI.localRating = localRating
      return NextResponse.json({ movie: movieDataFromAPI })
    }
  } else if (movieDataFromDB) {
    // API failed but we have DB data (even if incomplete)
    console.log("⚠️ API fetch failed, returning possibly incomplete DB data")
    
    // Add local rating data to the response
    movieDataFromDB.localRating = localRating
    
    return NextResponse.json({ movie: movieDataFromDB })
  } else {
    // Both API and DB failed
    console.error("🚨 Failed to retrieve movie from both API and DB")
    return NextResponse.json({ 
      error: "Movie not found or failed to load details",
      apiError: apiError?.message,
      dbError: dbError?.message
    }, { status: 404 })
  }
}

