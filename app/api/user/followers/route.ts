import { NextResponse } from "next/server"
import { getCollection } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')
  
  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  try {
    const usersCollection = await getCollection("users")
    
    // Find users who follow the specified user (userId is in their following array)
    const followers = await usersCollection.find(
      { following: new ObjectId(userId) }
    ).project({
      _id: 1,
      name: 1,
      username: 1,
      avatar: 1,
      bio: 1,
      role: 1
    }).toArray()
    
    return NextResponse.json({ followers })
  } catch (error) {
    console.error("Error fetching followers:", error)
    return NextResponse.json({ error: "Failed to fetch followers" }, { status: 500 })
  }
} 