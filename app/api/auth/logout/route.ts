import { NextResponse } from "next/server"

export async function POST() {
  try {
    console.log("Logging out user, clearing token cookie")

    // Create response with success message
    const response = NextResponse.json(
      { success: true, message: "Logged out successfully" },
      { status: 200 }
    )

    // Clear the token cookie - multiple approaches to ensure it works
    // Method 1: Using delete
    response.cookies.delete({
      name: "token",
      path: "/",
    })
    
    // Method 2: Set with empty value and immediate expiry
    response.cookies.set({
      name: "token",
      value: "",
      httpOnly: true,
      expires: new Date(0),
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: false,
    })

    console.log("Token cookie cleared using multiple methods")
    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "An error occurred during logout" }, { status: 500 })
  }
}

