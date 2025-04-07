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
      
      // Get follow action data
      const { targetUserId } = await request.json()
      
      if (!targetUserId) {
        return NextResponse.json({ error: "Target user ID is required" }, { status: 400 })
      }
      
      // Prevent following yourself
      if (currentUserId === targetUserId) {
        return NextResponse.json({ error: "You cannot follow yourself" }, { status: 400 })
      }
      
      const usersCollection = await getCollection("users")
      
      // Check if target user exists
      const targetUser = await usersCollection.findOne({ _id: new ObjectId(targetUserId) })
      if (!targetUser) {
        return NextResponse.json({ error: "Target user not found" }, { status: 404 })
      }
      
      // Check if current user exists
      const currentUser = await usersCollection.findOne({ _id: new ObjectId(currentUserId) })
      if (!currentUser) {
        return NextResponse.json({ error: "Current user not found" }, { status: 404 })
      }
      
      // Convert to arrays if they don't exist
      const currentUserFollowing = Array.isArray(currentUser.following) ? currentUser.following : []
      const targetUserFollowers = Array.isArray(targetUser.followers) ? targetUser.followers : []
      
      // Check if already following
      const isFollowing = currentUserFollowing.some(id => id.toString() === targetUserId)
      
      if (isFollowing) {
        // Unfollow
        await usersCollection.updateOne(
          { _id: new ObjectId(currentUserId) },
          { 
            $pull: { following: new ObjectId(targetUserId) },
            $set: { updatedAt: new Date() }
          }
        )
        
        await usersCollection.updateOne(
          { _id: new ObjectId(targetUserId) },
          { 
            $pull: { followers: new ObjectId(currentUserId) },
            $set: { updatedAt: new Date() }
          }
        )
        
        // Update stats
        await usersCollection.updateOne(
          { _id: new ObjectId(currentUserId) },
          { 
            $inc: { "stats.followingCount": -1 },
          }
        )
        
        await usersCollection.updateOne(
          { _id: new ObjectId(targetUserId) },
          { 
            $inc: { "stats.followersCount": -1 },
          }
        )
        
        return NextResponse.json({ 
          success: true, 
          action: "unfollowed",
          message: `You have unfollowed ${targetUser.name}` 
        })
      } else {
        // Follow
        await usersCollection.updateOne(
          { _id: new ObjectId(currentUserId) },
          { 
            $addToSet: { following: new ObjectId(targetUserId) },
            $set: { updatedAt: new Date() }
          }
        )
        
        await usersCollection.updateOne(
          { _id: new ObjectId(targetUserId) },
          { 
            $addToSet: { followers: new ObjectId(currentUserId) },
            $set: { updatedAt: new Date() }
          }
        )
        
        // Update stats
        await usersCollection.updateOne(
          { _id: new ObjectId(currentUserId) },
          { 
            $inc: { "stats.followingCount": 1 },
          }
        )
        
        await usersCollection.updateOne(
          { _id: new ObjectId(targetUserId) },
          { 
            $inc: { "stats.followersCount": 1 },
          }
        )
        
        return NextResponse.json({ 
          success: true, 
          action: "followed",
          message: `You are now following ${targetUser.name}` 
        })
      }
    } catch (tokenError) {
      console.error("Token verification error:", tokenError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }
  } catch (error) {
    console.error("Follow action error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Get user's followers or following lists
export async function GET(request: Request) {
  try {
    // Get parameters from URL
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const listType = searchParams.get("type") // "followers" or "following"

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    if (listType !== "followers" && listType !== "following") {
      return NextResponse.json({ error: "Invalid list type. Must be 'followers' or 'following'" }, { status: 400 })
    }

    // Get user from database
    const usersCollection = await getCollection("users")
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get the requested list
    const idList = Array.isArray(user[listType]) ? user[listType] : []
    
    // Empty list check
    if (idList.length === 0) {
      return NextResponse.json({ [listType]: [] })
    }

    // Convert string IDs to ObjectIds
    const objectIdList = idList.map(id => new ObjectId(id))
    
    // Fetch user details
    const usersList = await usersCollection.find(
      { _id: { $in: objectIdList } },
      { projection: { password: 0 } } // Exclude password field
    ).toArray()

    return NextResponse.json({ [listType]: usersList })
  } catch (error) {
    console.error(`Error fetching ${error}:`, error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 