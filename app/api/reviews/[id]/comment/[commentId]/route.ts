import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { getCollection } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// Edit a comment
export async function PUT(
  request: Request,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const reviewId = params.id
    const commentId = params.commentId

    if (!reviewId || !commentId) {
      return NextResponse.json(
        { error: "Review ID and Comment ID are required" },
        { status: 400 }
      )
    }

    // Check authentication
    const cookieStore = await cookies()
    const token = cookieStore.get("token")

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error("JWT_SECRET environment variable is not set!")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    try {
      const decoded = jwt.verify(token.value, jwtSecret) as { id: string }
      const userId = decoded.id

      // Get request body
      const { content } = await request.json()

      if (!content || content.trim() === "") {
        return NextResponse.json(
          { error: "Comment content cannot be empty" },
          { status: 400 }
        )
      }

      // Get the reviews collection
      const reviewsCollection = await getCollection("reviews")
      
      // Find the review
      const review = await reviewsCollection.findOne({
        _id: new ObjectId(reviewId)
      })

      if (!review) {
        return NextResponse.json(
          { error: "Review not found" },
          { status: 404 }
        )
      }

      // Find the comment within the review
      let isTopLevelComment = false;
      let parentCommentId = null;
      let comment = null;
      
      // First check if it's a top-level comment
      if (review.comments) {
        comment = review.comments.find((c: any) => 
          c._id.toString() === commentId
        );
        
        if (comment) {
          isTopLevelComment = true;
        } else {
          // Check if it's a reply to a comment
          for (const topComment of review.comments) {
            if (topComment.replies) {
              const reply = topComment.replies.find((r: any) => 
                r._id.toString() === commentId
              );
              
              if (reply) {
                comment = reply;
                parentCommentId = topComment._id.toString();
                break;
              }
            }
          }
        }
      }

      if (!comment) {
        return NextResponse.json(
          { error: "Comment not found" },
          { status: 404 }
        )
      }

      // Check if user is the author of the comment
      if (comment.user._id.toString() !== userId) {
        // Check if user is the post author (post authors can also edit comments)
        if (review.user.toString() !== userId) {
          return NextResponse.json(
            { error: "Not authorized to edit this comment" },
            { status: 403 }
          )
        }
      }

      const updatedAt = new Date();
      let result;
      
      // Update the comment based on whether it's top-level or a reply
      if (isTopLevelComment) {
        // Update top-level comment
        result = await reviewsCollection.updateOne(
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
        )
      } else if (parentCommentId) {
        // Update reply
        result = await reviewsCollection.updateOne(
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
        )
      }

      if (!result || result.modifiedCount === 0) {
        return NextResponse.json(
          { error: "Failed to update comment" },
          { status: 500 }
        )
      }

      // Get the updated comment
      const updatedReview = await reviewsCollection.findOne({
        _id: new ObjectId(reviewId)
      })
      
      let updatedComment = null;
      
      if (isTopLevelComment && updatedReview.comments) {
        updatedComment = updatedReview.comments.find((c: any) => 
          c._id.toString() === commentId
        );
      } else if (parentCommentId && updatedReview.comments) {
        const parentComment = updatedReview.comments.find((c: any) => 
          c._id.toString() === parentCommentId
        );
        
        if (parentComment && parentComment.replies) {
          updatedComment = parentComment.replies.find((r: any) => 
            r._id.toString() === commentId
          );
        }
      }

      return NextResponse.json({
        message: "Comment updated successfully",
        comment: updatedComment
      })
    } catch (error) {
      console.error("Token verification or comment update error:", error)
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error("Comment update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Delete a comment
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const reviewId = params.id
    const commentId = params.commentId

    if (!reviewId || !commentId) {
      return NextResponse.json(
        { error: "Review ID and Comment ID are required" },
        { status: 400 }
      )
    }

    // Check authentication
    const cookieStore = await cookies()
    const token = cookieStore.get("token")

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error("JWT_SECRET environment variable is not set!")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    try {
      const decoded = jwt.verify(token.value, jwtSecret) as { id: string }
      const userId = decoded.id

      // Get the reviews collection
      const reviewsCollection = await getCollection("reviews")
      
      // Find the review
      const review = await reviewsCollection.findOne({
        _id: new ObjectId(reviewId)
      })

      if (!review) {
        return NextResponse.json(
          { error: "Review not found" },
          { status: 404 }
        )
      }

      // Find the comment within the review
      let isTopLevelComment = false;
      let parentCommentId = null;
      let comment = null;
      
      // First check if it's a top-level comment
      if (review.comments) {
        comment = review.comments.find((c: any) => 
          c._id.toString() === commentId
        );
        
        if (comment) {
          isTopLevelComment = true;
        } else {
          // Check if it's a reply to a comment
          for (const topComment of review.comments) {
            if (topComment.replies) {
              const reply = topComment.replies.find((r: any) => 
                r._id.toString() === commentId
              );
              
              if (reply) {
                comment = reply;
                parentCommentId = topComment._id.toString();
                break;
              }
            }
          }
        }
      }

      if (!comment) {
        return NextResponse.json(
          { error: "Comment not found" },
          { status: 404 }
        )
      }

      // Check if user is the author of the comment
      if (comment.user._id.toString() !== userId) {
        // Check if user is the post author (post authors can also delete comments)
        if (review.user.toString() !== userId) {
          return NextResponse.json(
            { error: "Not authorized to delete this comment" },
            { status: 403 }
          )
        }
      }

      let result;
      
      // Delete the comment based on whether it's top-level or a reply
      if (isTopLevelComment) {
        // Delete top-level comment
        result = await reviewsCollection.updateOne(
          { _id: new ObjectId(reviewId) },
          { $pull: { comments: { _id: new ObjectId(commentId) } } }
        )
      } else if (parentCommentId) {
        // Delete reply
        result = await reviewsCollection.updateOne(
          { 
            _id: new ObjectId(reviewId),
            "comments._id": new ObjectId(parentCommentId)
          },
          { 
            $pull: { 
              "comments.$.replies": { _id: new ObjectId(commentId) } 
            } 
          }
        )
      }

      if (!result || result.modifiedCount === 0) {
        return NextResponse.json(
          { error: "Failed to delete comment" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: "Comment deleted successfully"
      })
    } catch (error) {
      console.error("Token verification or comment deletion error:", error)
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error("Comment deletion error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 