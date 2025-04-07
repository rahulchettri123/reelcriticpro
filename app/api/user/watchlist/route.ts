import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { getCollection } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(request: Request) {
  try {
    // Get token from cookies using cookies() directly to avoid warnings
    const cookieStore = cookies()
    const token = cookieStore.get("token")

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Verify token
    try {
      const jwtSecret = process.env.JWT_SECRET
      if (!jwtSecret) {
        console.error("JWT_SECRET environment variable is not set!")
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
      }
      
      const decoded = jwt.verify(token.value, jwtSecret) as { id: string }
      
      // Get user from database
      const usersCollection = await getCollection("users")
      const user = await usersCollection.findOne({ _id: new ObjectId(decoded.id) })

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Get movie ID, action, and movie data from request
      const { movieId, action, movieData } = await request.json()

      if (!movieId || !action) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }

      if (action !== "add" && action !== "remove") {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
      }

      // If we have movie data and we're adding to watchlist, ensure it's in our database
      if (action === "add" && movieData) {
        try {
          const moviesCollection = await getCollection("movies")
          const existingMovie = await moviesCollection.findOne({ id: movieId })

          if (!existingMovie) {
            // Add movie to database
            await moviesCollection.insertOne({
              id: movieId,
              title: movieData.title || "Unknown Title",
              poster: movieData.poster || null,
              backdrop: movieData.backdrop || null,
              year: movieData.year || "Unknown",
              rating: movieData.rating || "N/A",
              runtime: movieData.runtime || "Unknown",
              director: movieData.director || "Unknown",
              cast: Array.isArray(movieData.cast) ? movieData.cast : [],
              genres: Array.isArray(movieData.genres) ? movieData.genres : [],
              description: movieData.description || "No description available.",
              views: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          }
        } catch (dbError) {
          console.error("Error saving movie to database:", dbError)
          // Continue even if saving fails
        }
      }

      // Ensure watchlist array exists
      if (!user.watchlist) {
        await usersCollection.updateOne(
          { _id: new ObjectId(user._id) }, 
          { $set: { watchlist: [] } }
        )
        user.watchlist = []
      }

      // Update user's watchlist
      if (action === "add") {
        // Add movie to watchlist if not already there
        if (!user.watchlist.includes(movieId)) {
          await usersCollection.updateOne({ _id: new ObjectId(user._id) }, { $push: { watchlist: movieId } })
        }
      } else {
        // Remove movie from watchlist
        await usersCollection.updateOne({ _id: new ObjectId(user._id) }, { $pull: { watchlist: movieId } })
      }

      return NextResponse.json(
        {
          message: action === "add" ? "Added to watchlist" : "Removed from watchlist",
          action,
        },
        { status: 200 },
      )
    } catch (tokenError) {
      console.error("Token verification error:", tokenError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }
  } catch (error) {
    console.error("Watchlist update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    // Get token from cookies using cookies() directly to avoid warnings
    const cookieStore = await cookies()
    const token = cookieStore.get("token")

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Verify token
    try {
      const jwtSecret = process.env.JWT_SECRET
      if (!jwtSecret) {
        console.error("JWT_SECRET environment variable is not set!")
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
      }
      
      const decoded = jwt.verify(token.value, jwtSecret) as { id: string }
      
      // Get user from database
      const usersCollection = await getCollection("users")
      const user = await usersCollection.findOne({ _id: new ObjectId(decoded.id) })

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      return NextResponse.json({ watchlist: user.watchlist || [] })
    } catch (tokenError) {
      console.error("Token verification error:", tokenError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }
  } catch (error) {
    console.error("Watchlist fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

