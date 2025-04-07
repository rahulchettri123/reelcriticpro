import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

export async function GET() {
  try {
    // Test MongoDB connection
    const moviesCollection = await getCollection("movies");
    const count = await moviesCollection.countDocuments();
    
    // Return success response
    return NextResponse.json({ 
      success: true, 
      message: "Database connection successful", 
      movieCount: count,
      mongoUri: process.env.MONGODB_URI ? "Set" : "Not set",
      env: process.env.NODE_ENV 
    });
  } catch (error) {
    console.error("Database connection test failed:", error);
    
    // Return error response
    return NextResponse.json({ 
      success: false, 
      message: "Database connection failed", 
      error: error instanceof Error ? error.message : String(error),
      mongoUri: process.env.MONGODB_URI ? "Set" : "Not set",
      env: process.env.NODE_ENV 
    }, { status: 500 });
  }
} 