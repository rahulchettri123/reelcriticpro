import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { getCollection } from "@/lib/mongodb"

export async function POST(request: Request) {
  try {
    const { movieId } = await request.json()

    if (!movieId) {
      return NextResponse.json({ error: "Movie ID is required" }, { status: 400 })
    }

    // Get token from cookies using cookies() directly to avoid warnings
    const cookieStore = await cookies()
    const token = cookieStore.get("token")

    if (!token) {
      // Allow anonymous tracking, but return 401 so client knows user is not authenticated
      console.log("Anonymous view tracked for movie:", movieId)
      return NextResponse.json({ error: "Not authenticated", anonymousTracked: true }, { status: 401 })
    }

    // Verify token
    try {
      const jwtSecret = process.env.JWT_SECRET
      if (!jwtSecret) {
        console.error("JWT_SECRET environment variable is not set!")
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
      }
      
      const decoded = jwt.verify(token.value, jwtSecret) as { id: string }

      // Update movie views in database
      const moviesCollection = await getCollection("movies")

      // Check if movie exists in our database
      const movie = await moviesCollection.findOne({ id: movieId })

      if (movie) {
        // Increment views
        await moviesCollection.updateOne({ id: movieId }, { $inc: { views: 1 }, $set: { updatedAt: new Date() } })
      }

      return NextResponse.json({ success: true })
    } catch (tokenError) {
      console.error("Token verification error:", tokenError)
      
      // Still track the view, but return 401 so client knows authentication failed
      const moviesCollection = await getCollection("movies")
      const movie = await moviesCollection.findOne({ id: movieId })
      
      if (movie) {
        await moviesCollection.updateOne({ id: movieId }, { $inc: { views: 1 }, $set: { updatedAt: new Date() } })
      }
      
      return NextResponse.json({ error: "Authentication failed", anonymousTracked: true }, { status: 401 })
    }
  } catch (error) {
    console.error("Error in track-view API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

