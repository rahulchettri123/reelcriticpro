import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { getCollection } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// Get a specific review by ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const reviewId = params.id

    if (!reviewId) {
      return NextResponse.json({ error: "Review ID is required" }, { status: 400 })
    }

    // Get review from database
    const reviewsCollection = await getCollection("reviews")
    const review = await reviewsCollection.findOne({ _id: new ObjectId(reviewId) })

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    // Populate user data
    const usersCollection = await getCollection("users")
    const user = await usersCollection.findOne({ _id: review.user })
    
    if (user) {
      const { password, ...userWithoutPassword } = user
      review.user = userWithoutPassword
    }

    return NextResponse.json({ review })
  } catch (error) {
    console.error("Error fetching review:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Delete a review (only by the review author)
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const reviewId = params.id

    // Get token from cookies
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
      const currentUserId = decoded.id

      // Get review from database
      const reviewsCollection = await getCollection("reviews")
      const review = await reviewsCollection.findOne({ _id: new ObjectId(reviewId) })

      if (!review) {
        return NextResponse.json({ error: "Review not found" }, { status: 404 })
      }

      // Check if user is the author of the review
      if (review.user.toString() !== currentUserId) {
        return NextResponse.json({ error: "Not authorized to delete this review" }, { status: 403 })
      }

      // Delete review
      await reviewsCollection.deleteOne({ _id: new ObjectId(reviewId) })

      // Update user's review count
      const usersCollection = await getCollection("users")
      await usersCollection.updateOne(
        { _id: new ObjectId(currentUserId) },
        { 
          $inc: { "stats.reviewsCount": -1 },
          $set: { updatedAt: new Date() }
        }
      )

      return NextResponse.json({ message: "Review deleted successfully" })
    } catch (tokenError) {
      console.error("Token verification error:", tokenError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }
  } catch (error) {
    console.error("Review deletion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Update a review (only by the review author)
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const reviewId = params.id

    // Get token from cookies
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
      const currentUserId = decoded.id

      // Get review from database
      const reviewsCollection = await getCollection("reviews")
      const review = await reviewsCollection.findOne({ _id: new ObjectId(reviewId) })

      if (!review) {
        return NextResponse.json({ error: "Review not found" }, { status: 404 })
      }

      // Check if user is the author of the review
      if (review.user.toString() !== currentUserId) {
        return NextResponse.json({ error: "Not authorized to update this review" }, { status: 403 })
      }

      // Get updated fields from request
      const updates = await request.json()
      const allowedUpdates = ["rating", "content"]
      
      // Filter out disallowed fields
      const sanitizedUpdates = Object.keys(updates)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key]
          return obj
        }, {} as Record<string, any>)
      
      if (Object.keys(sanitizedUpdates).length === 0) {
        return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
      }

      // Add updatedAt timestamp
      sanitizedUpdates.updatedAt = new Date()
      
      // Update review
      await reviewsCollection.updateOne(
        { _id: new ObjectId(reviewId) },
        { $set: sanitizedUpdates }
      )

      // Get updated review
      const updatedReview = await reviewsCollection.findOne({ _id: new ObjectId(reviewId) })

      return NextResponse.json({
        message: "Review updated successfully",
        review: updatedReview
      })
    } catch (tokenError) {
      console.error("Token verification error:", tokenError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }
  } catch (error) {
    console.error("Review update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 