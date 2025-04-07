import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { getCollection } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// Handle follow/unfollow actions
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
      
      // Get data from request
      const { userId, action } = await request.json()
      
      if (!userId) {
        return NextResponse.json({ error: "User ID is required" }, { status: 400 })
      }
      
      if (action !== "follow" && action !== "unfollow") {
        return NextResponse.json({ error: "Invalid action. Must be 'follow' or 'unfollow'" }, { status: 400 })
      }
      
      // Prevent following yourself
      if (currentUserId === userId) {
        return NextResponse.json({ error: "You cannot follow yourself" }, { status: 400 })
      }
      
      const usersCollection = await getCollection("users")
      
      // Check if target user exists
      const targetUser = await usersCollection.findOne(
        { _id: new ObjectId(userId) },
        { projection: { _id: 1, name: 1, username: 1 } }
      )
      
      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }
      
      if (action === "follow") {
        // Add to following list
        await usersCollection.updateOne(
          { _id: new ObjectId(currentUserId) },
          { 
            $addToSet: { following: new ObjectId(userId) },
            $set: { updatedAt: new Date() }
          }
        )
        
        // Add to followers list
        await usersCollection.updateOne(
          { _id: new ObjectId(userId) },
          { 
            $addToSet: { followers: new ObjectId(currentUserId) },
            $set: { updatedAt: new Date() }
          }
        )
        
        return NextResponse.json({ 
          success: true, 
          message: `You are now following ${targetUser.name}` 
        })
      } else {
        // Remove from following list
        await usersCollection.updateOne(
          { _id: new ObjectId(currentUserId) },
          { 
            $pull: { following: new ObjectId(userId) },
            $set: { updatedAt: new Date() }
          }
        )
        
        // Remove from followers list
        await usersCollection.updateOne(
          { _id: new ObjectId(userId) },
          { 
            $pull: { followers: new ObjectId(currentUserId) },
            $set: { updatedAt: new Date() }
          }
        )
        
        return NextResponse.json({ 
          success: true, 
          message: `You have unfollowed ${targetUser.name}` 
        })
      }
    } catch (tokenError) {
      console.error("Token verification error:", tokenError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }
  } catch (error) {
    console.error("Follow/unfollow error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET endpoint to fetch the users that the specified user is following
export async function GET(request: Request) {
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')
  
  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  try {
    const usersCollection = await getCollection("users")
    
    // First get the user's following list
    const user = await usersCollection.findOne(
      { _id: new ObjectId(userId) }
    )
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    
    // If the user has no following list or it's empty, return empty array
    if (!user.following || user.following.length === 0) {
      return NextResponse.json({ following: [] })
    }
    
    // Get the details of users they're following
    const following = await usersCollection.find(
      { _id: { $in: user.following } }
    ).project({
      _id: 1,
      name: 1,
      username: 1,
      avatar: 1,
      bio: 1,
      role: 1
    }).toArray()
    
    return NextResponse.json({ following })
  } catch (error) {
    console.error("Error fetching following:", error)
    return NextResponse.json({ error: "Failed to fetch following" }, { status: 500 })
  }
} 