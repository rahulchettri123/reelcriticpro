import { NextResponse, type NextRequest } from "next/server"
import jwt from "jsonwebtoken"
import { getCollection } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest) {
  try {
    // Get token from the request cookies
    const token = request.cookies.get("token")

    if (!token || !token.value) {
      console.log("No token found in request cookies")
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log(`Token found (first 10 chars): ${token.value.substring(0, 10)}...`)

    // Verify token
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error("JWT_SECRET environment variable is not set!")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }
    
    let decoded
    try {
      decoded = jwt.verify(token.value, jwtSecret) as { id: string; email: string }
      console.log(`Token verified successfully for user: ${decoded.email}`)
    } catch (tokenError: any) {
      console.error(`Token verification failed: ${tokenError.message}`)
      
      // Return a 401 and clear the invalid token
      const response = NextResponse.json({ error: "Authentication failed" }, { status: 401 })
      response.cookies.delete("token")
      return response
    }

    // Get user from database
    const usersCollection = await getCollection("users")
    if (!usersCollection) {
      console.error("Failed to get users collection")
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    // Convert string ID to ObjectId
    let objectId
    try {
      objectId = new ObjectId(decoded.id)
    } catch (idError) {
      console.error("Invalid ObjectId format:", decoded.id)
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const user = await usersCollection.findOne({ _id: objectId })

    if (!user) {
      console.log("User not found in database for ID:", decoded.id)
      return NextResponse.json({ error: "User not found" }, { status: 401 })
    }

    console.log("User authenticated successfully:", user.email)
    
    // Return user data (excluding password)
    const { password, ...userWithoutPassword } = user

    return NextResponse.json({ user: userWithoutPassword })
  } catch (error) {
    console.error("Error in /api/auth/me:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

