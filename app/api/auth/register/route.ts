import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getCollection } from "@/lib/mongodb"

export async function POST(request: Request) {
  try {
    const { name, email, username, password, role } = await request.json()

    // Validate input
    if (!name || !email || !username || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get users collection
    const usersCollection = await getCollection("users")

    // Check if user already exists
    const existingUser = await usersCollection.findOne({
      $or: [{ email }, { username }],
    })

    if (existingUser) {
      return NextResponse.json({ error: "User with this email or username already exists" }, { status: 409 })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create new user
    const newUser = {
      name,
      email,
      username,
      password: hashedPassword,
      role: role || "viewer",
      avatar: `/placeholder.svg?height=200&width=200&text=${name.charAt(0)}`,
      following: [],
      followers: [],
      favorites: [],
      watchlist: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Insert user into database
    const result = await usersCollection.insertOne(newUser)

    // Return success response (excluding password)
    const { password: _, ...userWithoutPassword } = newUser

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: userWithoutPassword,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

