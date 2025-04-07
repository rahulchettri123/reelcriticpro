import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
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
      const userId = decoded.id
      
      // Get password data from request
      const { currentPassword, newPassword } = await request.json()
      
      if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: "Current password and new password are required" }, { status: 400 })
      }
      
      if (newPassword.length < 8) {
        return NextResponse.json({ error: "New password must be at least 8 characters long" }, { status: 400 })
      }
      
      // Get user from database
      const usersCollection = await getCollection("users")
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) })

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password)
      if (!isPasswordValid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
      }
      
      // Hash new password
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(newPassword, salt)
      
      // Update password in database
      await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { 
          $set: { 
            password: hashedPassword,
            updatedAt: new Date()
          } 
        }
      )
      
      return NextResponse.json({ message: "Password updated successfully" })
    } catch (tokenError) {
      console.error("Token verification error:", tokenError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }
  } catch (error) {
    console.error("Password change error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 