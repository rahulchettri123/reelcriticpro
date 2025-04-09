import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { getCollection } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// Helper function to validate ObjectId
function isValidObjectId(id: string): boolean {
  try {
    new ObjectId(id);
    return true;
  } catch (error) {
    return false;
  }
}

// Get a specific review by ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Check if id is a valid ObjectId
    const reviewId = params.id;
    if (!reviewId || !isValidObjectId(reviewId)) {
      return NextResponse.json(
        { error: "Invalid review ID format" },
        { status: 400 }
      );
    }

    const collection = await getCollection("reviews");
    const review = await collection.findOne({ _id: new ObjectId(reviewId) });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    return NextResponse.json({ review });
  } catch (error) {
    console.error("Error fetching review:", error);
    return NextResponse.json(
      { error: "Failed to fetch review" },
      { status: 500 }
    );
  }
}

// Delete a review (only by the review author)
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const reviewId = params.id;
    
    // Validate reviewId
    if (!reviewId || !isValidObjectId(reviewId)) {
      return NextResponse.json(
        { error: "Invalid review ID format" },
        { status: 400 }
      );
    }

    // Get token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token.value, jwtSecret);
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Find the review
    const collection = await getCollection("reviews");
    const review = await collection.findOne({ _id: new ObjectId(reviewId) });

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    // Check if user is the owner of the review
    if (review.user._id.toString() !== decoded.userId) {
      return NextResponse.json(
        { error: "You can only delete your own reviews" },
        { status: 403 }
      );
    }

    // Delete the review
    const result = await collection.deleteOne({ _id: new ObjectId(reviewId) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Failed to delete review" },
        { status: 500 }
      );
    }

    // Update user stats in user collection
    const usersCollection = await getCollection("users");
    await usersCollection.updateOne(
      { _id: new ObjectId(decoded.userId) },
      { $inc: { "stats.reviewsCount": -1 } }
    );

    return NextResponse.json({
      message: "Review deleted successfully",
      reviewId,
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    return NextResponse.json(
      { error: "Failed to delete review" },
      { status: 500 }
    );
  }
}

// Update a review (only by the review author)
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const reviewId = params.id;
    
    // Validate reviewId
    if (!reviewId || !isValidObjectId(reviewId)) {
      return NextResponse.json(
        { error: "Invalid review ID format" },
        { status: 400 }
      );
    }

    // Get token from cookies
    const cookieStore = cookies();
    const token = cookieStore.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token.value, jwtSecret);
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Get request body
    const { content, rating } = await request.json();

    // Validate input
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Review content is required" },
        { status: 400 }
      );
    }

    if (rating !== undefined && (typeof rating !== "number" || rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: "Rating must be a number between 1 and 5" },
        { status: 400 }
      );
    }

    // Find the review
    const collection = await getCollection("reviews");
    const review = await collection.findOne({ _id: new ObjectId(reviewId) });

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    // Check if user is the owner of the review
    if (review.user._id.toString() !== decoded.userId) {
      return NextResponse.json(
        { error: "You can only edit your own reviews" },
        { status: 403 }
      );
    }

    // Update fields to be updated
    const updateFields: any = {
      content: content.trim(),
      updatedAt: new Date(),
    };

    if (rating !== undefined) {
      updateFields.rating = rating;
    }

    // Update the review
    const result = await collection.updateOne(
      { _id: new ObjectId(reviewId) },
      { $set: updateFields }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Failed to update review" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Review updated successfully",
      reviewId,
      ...updateFields,
    });
  } catch (error) {
    console.error("Error updating review:", error);
    return NextResponse.json(
      { error: "Failed to update review" },
      { status: 500 }
    );
  }
} 