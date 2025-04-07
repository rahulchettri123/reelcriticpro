import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { getCollection } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(request: Request, { params }: { params: { id: string } }) {
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

      // Get user from database - only fetch required fields
      const usersCollection = await getCollection("users")
      const user = await usersCollection.findOne(
        { _id: new ObjectId(decoded.id) },
        { projection: { _id: 1, name: 1, username: 1, avatar: 1 } }
      )

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Get comment content and parentCommentId (if it's a reply) from request
      const { content, parentCommentId } = await request.json()

      if (!content || content.trim() === "") {
        return NextResponse.json({ error: "Comment content is required" }, { status: 400 })
      }

      // Extract mentions from the comment content using regex
      const mentionRegex = /@(\w+)/g
      const mentions: string[] = []
      let match;
      
      while ((match = mentionRegex.exec(content)) !== null) {
        mentions.push(match[1]) // Add the username without @ symbol
      }
      
      // Look up mentioned users to get their IDs
      const mentionedUsers = mentions.length > 0 
        ? await usersCollection.find(
            { username: { $in: mentions } },
            { projection: { _id: 1, username: 1 } }
          ).toArray()
        : []
      
      // Get mentioned user IDs in a format suitable for MongoDB
      const mentionedUserIds = mentionedUsers.map(u => u._id)

      // Get review from database - only fetch required fields
      const reviewsCollection = await getCollection("reviews")
      const review = await reviewsCollection.findOne(
        { _id: new ObjectId(reviewId) },
        { projection: { _id: 1, comments: 1, user: 1 } }
      )

      if (!review) {
        return NextResponse.json({ error: "Review not found" }, { status: 404 })
      }

      // Create new comment with a unique _id
      const commentId = new ObjectId()
      const comment = {
        _id: commentId,
        user: {
          _id: user._id,
          name: user.name,
          username: user.username,
          avatar: user.avatar
        },
        content,
        mentions: mentionedUserIds,
        parentId: parentCommentId || null,
        replies: [],
        likes: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Use appropriate update operation based on if it's a reply or not
      if (parentCommentId) {
        // This is a reply to an existing comment
        // Validate that parent comment exists
        const parentCommentExists = review.comments && review.comments.some(
          (c: any) => c._id.toString() === parentCommentId
        )

        if (!parentCommentExists) {
          return NextResponse.json({ error: "Parent comment not found" }, { status: 404 })
        }

        // Add the reply to the parent comment's replies array
        await reviewsCollection.updateOne(
          { 
            _id: new ObjectId(reviewId),
            "comments._id": new ObjectId(parentCommentId)
          },
          { 
            $push: { "comments.$.replies": comment },
            $set: { updatedAt: new Date() }
          }
        )
      } else {
        // This is a top-level comment
        // Add the comment to the review's comments array
        await reviewsCollection.updateOne(
          { _id: new ObjectId(reviewId) },
          { 
            $push: { 
              comments: {
                $each: [comment],
                $position: 0
              } 
            },
            $set: { updatedAt: new Date() }
          }
        )
      }

      // Send notifications to mentioned users if they're not the comment author
      if (mentionedUserIds.length > 0) {
        try {
          const notificationsCollection = await getCollection("notifications")
          
          // Prepare notifications for all mentioned users
          const notifications = mentionedUserIds
            .filter(mentionedId => mentionedId.toString() !== user._id.toString()) // Don't notify self
            .map(mentionedId => ({
              recipientId: mentionedId,
              senderId: user._id,
              type: 'mention',
              content: `${user.name} mentioned you in a comment`,
              reviewId: new ObjectId(reviewId),
              commentId: commentId,
              read: false,
              createdAt: new Date()
            }))
          
          if (notifications.length > 0) {
            await notificationsCollection.insertMany(notifications)
          }
        } catch (notificationError) {
          console.error("Error creating mention notifications:", notificationError)
          // Continue processing even if notifications fail
        }
      }

      return NextResponse.json(
        {
          message: "Comment added successfully",
          comment
        },
        { status: 201 }
      )
    } catch (tokenError) {
      console.error("Token verification error:", tokenError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }
  } catch (error) {
    console.error("Comment addition error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const reviewId = params.id
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50", 10)
    const skip = parseInt(searchParams.get("skip") || "0", 10)

    // Get review from database with just the comments field
    const reviewsCollection = await getCollection("reviews")
    const review = await reviewsCollection.findOne(
      { _id: new ObjectId(reviewId) },
      { projection: { comments: { $slice: [skip, limit] } } }
    )

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    // Count total comments for pagination info
    const commentsCount = review.comments?.length || 0
    
    return NextResponse.json({ 
      comments: review.comments || [],
      pagination: {
        total: commentsCount,
        limit,
        skip
      }
    })
  } catch (error) {
    console.error("Error fetching comments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 