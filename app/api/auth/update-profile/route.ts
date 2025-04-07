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
      
      // Get user from database
      const usersCollection = await getCollection("users")
      const currentUser = await usersCollection.findOne({ _id: new ObjectId(decoded.id) })

      if (!currentUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Get profile updates from request body
      const updates = await request.json()
      
      // List of allowed fields to update
      const allowedUpdates = [
        "name",
        "username",
        "bio",
        "location",
        "website",
        "avatar",
        "cover",
        "social",
        "preferences"
      ]
      
      // Filter out disallowed fields
      const sanitizedUpdates = Object.keys(updates)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key]
          return obj
        }, {} as Record<string, any>)
      
      // Make sure there are valid updates
      if (Object.keys(sanitizedUpdates).length === 0) {
        return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
      }

      // Check username uniqueness if being updated
      if (sanitizedUpdates.username && sanitizedUpdates.username !== currentUser.username) {
        const existingUser = await usersCollection.findOne({ 
          username: sanitizedUpdates.username,
          _id: { $ne: new ObjectId(decoded.id) } // Exclude current user
        })
        
        if (existingUser) {
          return NextResponse.json({ error: "Username already taken" }, { status: 400 })
        }
      }
      
      // Add updatedAt timestamp
      sanitizedUpdates.updatedAt = new Date()
      sanitizedUpdates.lastActive = new Date()
      
      // Update user document
      await usersCollection.updateOne(
        { _id: new ObjectId(decoded.id) },
        { $set: sanitizedUpdates }
      )
      
      // Get updated user
      const updatedUser = await usersCollection.findOne({ _id: new ObjectId(decoded.id) })
      
      // Remove sensitive data
      const { password, ...userWithoutPassword } = updatedUser

      return NextResponse.json({
        message: "Profile updated successfully",
        user: userWithoutPassword
      })
    } catch (tokenError) {
      console.error("Token verification error:", tokenError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 