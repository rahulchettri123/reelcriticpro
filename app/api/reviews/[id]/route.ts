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

      // Check if user is the author of the review (comparing ObjectId as string)
      if (review.user.toString() !== currentUserId) {
        return NextResponse.json({ error: "Not authorized to delete this review" }, { status: 403 })
      }

      // Delete review
      const deleteResult = await reviewsCollection.deleteOne({ _id: new ObjectId(reviewId) })
      
      if (deleteResult.deletedCount === 0) {
        return NextResponse.json({ error: "Failed to delete review" }, { status: 500 })
      }

      // Update user's review count
      const usersCollection = await getCollection("users")
      await usersCollection.updateOne(
        { _id: new ObjectId(currentUserId) },
        { 
          $inc: { "stats.reviewsCount": -1 },
          $set: { updatedAt: new Date() }
        }
      )

      // Also delete any comments associated with this review
      const commentsCollection = await getCollection("comments")
      if (commentsCollection) {
        await commentsCollection.deleteMany({ reviewId: new ObjectId(reviewId) })
      }

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

      // Check if user is the author of the review (comparing ObjectId as string)
      if (review.user.toString() !== currentUserId) {
        return NextResponse.json({ error: "Not authorized to update this review" }, { status: 403 })
      }

      // Get updated fields from request
      const updates = await request.json()
      
      // Validate the rating
      if (updates.rating !== undefined) {
        const rating = Number(updates.rating)
        if (isNaN(rating) || rating < 1 || rating > 5) {
          return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
        }
        updates.rating = rating
      }
      
      // Validate content
      if (updates.content !== undefined && (!updates.content || updates.content.trim() === '')) {
        return NextResponse.json({ error: "Review content cannot be empty" }, { status: 400 })
      }
      
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
      const updateResult = await reviewsCollection.updateOne(
        { _id: new ObjectId(reviewId) },
        { $set: sanitizedUpdates }
      )
      
      if (updateResult.modifiedCount === 0) {
        return NextResponse.json({ error: "No changes were made to the review" }, { status: 304 })
      }

      // Get updated review with user data
      const updatedReview = await reviewsCollection.findOne({ _id: new ObjectId(reviewId) })
      
      // Populate user data for the response
      let responseReview = updatedReview
      
      if (updatedReview) {
        const usersCollection = await getCollection("users")
        const user = await usersCollection.findOne({ _id: new ObjectId(updatedReview.user) })
        
        if (user) {
          const { password, ...userWithoutPassword } = user
          responseReview = {
            ...updatedReview,
            user: userWithoutPassword
          }
        }
      }

      return NextResponse.json({
        message: "Review updated successfully",
        review: responseReview
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