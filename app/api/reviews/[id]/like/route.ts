import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { getCollection } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const reviewId = params.id

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

      // Get action from request
      const { action } = await request.json()

      if (!action) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }

      if (action !== "like" && action !== "unlike") {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
      }

      // Get review from database
      const reviewsCollection = await getCollection("reviews")
      const review = await reviewsCollection.findOne({ _id: new ObjectId(reviewId) })

      if (!review) {
        return NextResponse.json({ error: "Review not found" }, { status: 404 })
      }

      // Update review likes
      if (action === "like") {
        // Add user to likes if not already there
        await reviewsCollection.updateOne(
          { _id: new ObjectId(reviewId) },
          { $addToSet: { likes: new ObjectId(user._id) } },
        )
      } else {
        // Remove user from likes
        await reviewsCollection.updateOne({ _id: new ObjectId(reviewId) }, { $pull: { likes: new ObjectId(user._id) } })
      }

      // Get updated review
      const updatedReview = await reviewsCollection.findOne({ _id: new ObjectId(reviewId) })

      return NextResponse.json(
        {
          message: action === "like" ? "Review liked" : "Review unliked",
          likes: updatedReview?.likes || [],
        },
        { status: 200 },
      )
    } catch (tokenError) {
      console.error("Token verification error:", tokenError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }
  } catch (error) {
    console.error("Review like error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

