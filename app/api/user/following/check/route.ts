import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { getCollection } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// Check if the current user is following a specific user
export async function GET(request: Request) {
  try {
    // Get token from cookies
    const cookieStore = await cookies()
    const token = cookieStore.get("token")

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get target user ID from query params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
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
      
      // Prevent checking following status with yourself
      if (currentUserId === userId) {
        return NextResponse.json({ error: "Cannot check following status with yourself" }, { status: 400 })
      }
      
      // Get the current user from database
      const usersCollection = await getCollection("users")
      const currentUser = await usersCollection.findOne(
        { _id: new ObjectId(currentUserId) },
        { projection: { following: 1 } }
      )
      
      if (!currentUser) {
        return NextResponse.json({ error: "Current user not found" }, { status: 404 })
      }
      
      // Check if the target user exists
      const targetUser = await usersCollection.findOne(
        { _id: new ObjectId(userId) },
        { projection: { _id: 1 } }
      )
      
      if (!targetUser) {
        return NextResponse.json({ error: "Target user not found" }, { status: 404 })
      }
      
      // Check if the current user is following the target user
      const following = Array.isArray(currentUser.following) ? currentUser.following : []
      const isFollowing = following.some(id => id.toString() === userId)
      
      return NextResponse.json({ isFollowing })
    } catch (tokenError) {
      console.error("Token verification error:", tokenError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }
  } catch (error) {
    console.error("Follow status check error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 