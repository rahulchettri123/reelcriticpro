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

// Edit a comment
export async function PUT(
  request: Request,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const reviewId = params.id;
    const commentId = params.commentId;

    if (!reviewId || !commentId) {
      return NextResponse.json(
        { error: "Review ID and Comment ID are required" },
        { status: 400 }
      );
    }

    // Validate IDs
    if (!isValidObjectId(reviewId) || !isValidObjectId(commentId)) {
      return NextResponse.json(
        { error: "Invalid ID format" },
        { status: 400 }
      );
    }

    // Check authentication
    const cookieStore = cookies();
    const token = cookieStore.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify JWT
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
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const userId = decoded.userId;
    const { content } = await request.json();

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }

    const reviewCollection = await getCollection("reviews");

    // First, find the review to ensure it exists
    const review = await reviewCollection.findOne({
      _id: new ObjectId(reviewId)
    });

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    // Check if the comment is a top-level comment or a reply
    let isTopLevelComment = false;
    let parentCommentId = null;
    let commentFound = false;

    // Check if it's a top-level comment
    for (const comment of review.comments || []) {
      if (comment._id.toString() === commentId) {
        isTopLevelComment = true;
        commentFound = true;
        // Check if the user is the comment author
        if (comment.user._id.toString() !== userId) {
          return NextResponse.json(
            { error: "You can only edit your own comments" },
            { status: 403 }
          );
        }
        break;
      }

      // Check if it's a reply
      if (comment.replies && comment.replies.length > 0) {
        for (const reply of comment.replies) {
          if (reply._id.toString() === commentId) {
            parentCommentId = comment._id.toString();
            commentFound = true;
            // Check if the user is the reply author
            if (reply.user._id.toString() !== userId) {
              return NextResponse.json(
                { error: "You can only edit your own comments" },
                { status: 403 }
              );
            }
            break;
          }
        }
        if (parentCommentId) break;
      }
    }

    if (!commentFound) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    const updatedAt = new Date();
    let result;

    if (isTopLevelComment) {
      // Update top-level comment
      result = await reviewCollection.updateOne(
        { 
          _id: new ObjectId(reviewId),
          "comments._id": new ObjectId(commentId) 
        },
        {
          $set: {
            "comments.$.content": content.trim(),
            "comments.$.updatedAt": updatedAt
          }
        }
      );
    } else {
      // Update reply
      result = await reviewCollection.updateOne(
        { 
          _id: new ObjectId(reviewId),
          "comments._id": new ObjectId(parentCommentId),
          "comments.replies._id": new ObjectId(commentId)
        },
        {
          $set: {
            "comments.$[comment].replies.$[reply].content": content.trim(),
            "comments.$[comment].replies.$[reply].updatedAt": updatedAt
          }
        },
        {
          arrayFilters: [
            { "comment._id": new ObjectId(parentCommentId) },
            { "reply._id": new ObjectId(commentId) }
          ]
        }
      );
    }

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Failed to update comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Comment updated successfully",
      content: content.trim(),
      updatedAt
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }
}

// Delete a comment
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const reviewId = params.id;
    const commentId = params.commentId;

    if (!reviewId || !commentId) {
      return NextResponse.json(
        { error: "Review ID and Comment ID are required" },
        { status: 400 }
      );
    }

    // Validate IDs
    if (!isValidObjectId(reviewId) || !isValidObjectId(commentId)) {
      return NextResponse.json(
        { error: "Invalid ID format" },
        { status: 400 }
      );
    }

    // Check authentication
    const cookieStore = cookies();
    const token = cookieStore.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify JWT
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
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const userId = decoded.userId;
    const reviewCollection = await getCollection("reviews");

    // First, find the review
    const review = await reviewCollection.findOne({
      _id: new ObjectId(reviewId)
    });

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    // Check if the comment is a top-level comment or a reply
    let isTopLevelComment = false;
    let parentCommentId = null;
    let commentFound = false;
    let canDelete = false;

    // Check if user is the review author (can delete any comment)
    const isReviewAuthor = review.user._id.toString() === userId;

    // Check if it's a top-level comment
    for (const comment of review.comments || []) {
      if (comment._id.toString() === commentId) {
        isTopLevelComment = true;
        commentFound = true;
        // User can delete if they are the comment author or the review author
        canDelete = comment.user._id.toString() === userId || isReviewAuthor;
        break;
      }

      // Check if it's a reply
      if (comment.replies && comment.replies.length > 0) {
        for (const reply of comment.replies) {
          if (reply._id.toString() === commentId) {
            parentCommentId = comment._id.toString();
            commentFound = true;
            // User can delete if they are the reply author or the review author
            canDelete = reply.user._id.toString() === userId || isReviewAuthor;
            break;
          }
        }
        if (parentCommentId) break;
      }
    }

    if (!commentFound) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    if (!canDelete) {
      return NextResponse.json(
        { error: "You don't have permission to delete this comment" },
        { status: 403 }
      );
    }

    let result;

    if (isTopLevelComment) {
      // Delete top-level comment and all its replies
      result = await reviewCollection.updateOne(
        { _id: new ObjectId(reviewId) },
        { $pull: { comments: { _id: new ObjectId(commentId) } } }
      );
    } else {
      // Delete reply only
      result = await reviewCollection.updateOne(
        { 
          _id: new ObjectId(reviewId),
          "comments._id": new ObjectId(parentCommentId)
        },
        {
          $pull: { "comments.$.replies": { _id: new ObjectId(commentId) } }
        }
      );
    }

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Failed to delete comment" },
        { status: 500 }
      );
    }

    // Decrement the comment count
    await reviewCollection.updateOne(
      { _id: new ObjectId(reviewId) },
      { $inc: { commentCount: -1 } }
    );

    return NextResponse.json({
      message: "Comment deleted successfully",
      reviewId,
      commentId
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
} 