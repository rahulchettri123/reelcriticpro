import { NextResponse } from "next/server"
import { getCollection } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// Utility function to check if a string is a valid ObjectId
function isValidObjectId(id: string): boolean {
  try {
    new ObjectId(id);
    return true;
  } catch (error) {
    return false;
  }
}

export async function GET(request: Request) {
  try {
    // Get the userId from the query params
    const url = new URL(request.url)
    const userId = url.searchParams.get("userId")
    const limit = parseInt(url.searchParams.get("limit") || "20")
    const page = parseInt(url.searchParams.get("page") || "1")
    const skip = (page - 1) * limit

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Validate userId is a valid ObjectId
    if (!isValidObjectId(userId)) {
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 }
      )
    }

    const userObjectId = new ObjectId(userId);
    const reviewsCollection = await getCollection("reviews")

    // Aggregate to find all reviews where the user has commented
    const pipeline = [
      // Match reviews that have comments by this user
      {
        $match: {
          $or: [
            { "comments.user._id": userObjectId },
            { "comments.replies.user._id": userObjectId }
          ]
        }
      },
      // Unwind the comments array
      { $unwind: "$comments" },
      // Match top-level comments by this user or unwind replies that might contain user's comments
      {
        $match: {
          $or: [
            { "comments.user._id": userObjectId },
            { "comments.replies": { $exists: true, $ne: [] } }
          ]
        }
      },
      // Select fields needed
      {
        $project: {
          _id: 1,
          movieTitle: 1,
          comment: "$comments",
        }
      },
      // Handle top-level comments and replies separately
      {
        $facet: {
          // Process top-level comments
          topLevelComments: [
            {
              $match: { "comment.user._id": userObjectId }
            },
            {
              $project: {
                _id: "$comment._id",
                reviewId: "$_id",
                movieTitle: "$movieTitle",
                content: "$comment.content",
                createdAt: "$comment.createdAt",
                updatedAt: "$comment.updatedAt",
                parentId: null,
                isReply: false
              }
            }
          ],
          // Process replies
          replies: [
            {
              $match: { "comment.replies": { $exists: true, $ne: [] } }
            },
            { $unwind: "$comment.replies" },
            {
              $match: { "comment.replies.user._id": userObjectId }
            },
            {
              $project: {
                _id: "$comment.replies._id",
                reviewId: "$_id",
                movieTitle: "$movieTitle",
                content: "$comment.replies.content",
                createdAt: "$comment.replies.createdAt",
                updatedAt: "$comment.replies.updatedAt",
                parentId: "$comment._id",
                isReply: true
              }
            }
          ]
        }
      },
      // Combine the results
      {
        $project: {
          comments: { 
            $cond: {
              if: { $and: [
                { $isArray: "$topLevelComments" }, 
                { $isArray: "$replies" }
              ]},
              then: { $concatArrays: ["$topLevelComments", "$replies"] },
              else: []
            }
          }
        }
      },
      { $unwind: { path: "$comments", preserveNullAndEmptyArrays: true } },
      // Sort by creation date (newest first)
      { $sort: { "comments.createdAt": -1 } },
      // Skip and limit for pagination
      { $skip: skip },
      { $limit: limit },
      // Group back to get final result
      {
        $group: {
          _id: null,
          comments: { 
            $push: {
              $cond: [
                { $ifNull: ["$comments", false] },
                "$comments",
                "$$REMOVE"
              ]
            }
          }
        }
      }
    ]

    const result = await reviewsCollection.aggregate(pipeline).toArray()
    
    const comments = result.length > 0 && result[0].comments ? result[0].comments : []

    // Get total count for pagination - simplified to avoid potential errors
    const countResult = await reviewsCollection.countDocuments({
      $or: [
        { "comments.user._id": userObjectId },
        { "comments.replies.user._id": userObjectId }
      ]
    });

    return NextResponse.json({
      comments,
      pagination: {
        total: countResult,
        page,
        limit,
        totalPages: Math.ceil(countResult / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching user comments:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 