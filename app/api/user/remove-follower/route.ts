import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { getCollection } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(request: Request) {
  try {
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
      
      // Get follower ID to remove
      const { followerId } = await request.json()
      
      if (!followerId) {
        return NextResponse.json({ error: "Follower ID is required" }, { status: 400 })
      }
      
      const usersCollection = await getCollection("users")
      
      // Check if current user exists
      const currentUser = await usersCollection.findOne({ _id: new ObjectId(currentUserId) })
      if (!currentUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }
      
      // Check if follower exists
      const follower = await usersCollection.findOne({ _id: new ObjectId(followerId) })
      if (!follower) {
        return NextResponse.json({ error: "Follower not found" }, { status: 404 })
      }
      
      // Check if the user is actually in the followers list
      const currentUserFollowers = Array.isArray(currentUser.followers) ? currentUser.followers : []
      const isFollower = currentUserFollowers.some(id => id.toString() === followerId)
      
      if (!isFollower) {
        return NextResponse.json({ error: "This user is not following you" }, { status: 400 })
      }
      
      // Remove follower from current user's followers list
      await usersCollection.updateOne(
        { _id: new ObjectId(currentUserId) },
        { 
          $pull: { followers: new ObjectId(followerId) },
          $set: { updatedAt: new Date() }
        }
      )
      
      // Remove current user from follower's following list
      await usersCollection.updateOne(
        { _id: new ObjectId(followerId) },
        { 
          $pull: { following: new ObjectId(currentUserId) },
          $set: { updatedAt: new Date() }
        }
      )
      
      // Update stats
      await usersCollection.updateOne(
        { _id: new ObjectId(currentUserId) },
        { 
          $inc: { "stats.followersCount": -1 },
        }
      )
      
      await usersCollection.updateOne(
        { _id: new ObjectId(followerId) },
        { 
          $inc: { "stats.followingCount": -1 },
        }
      )
      
      return NextResponse.json({ 
        success: true, 
        message: `Removed follower successfully`
      })
    } catch (tokenError) {
      console.error("Token verification error:", tokenError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }
  } catch (error) {
    console.error("Remove follower error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 