import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify, importJWK } from "jose"

// Routes that require authentication
const protectedRoutes = ["/profile", "/settings", "/reviews/new"]

// Routes that are only accessible to non-authenticated users
const authRoutes = ["/login", "/register"]

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // Skip middleware for API routes
  if (path.startsWith('/api/')) {
    return NextResponse.next()
  }

  const tokenCookie = request.cookies.get("token")
  let isAuthenticated = false
  
  if (tokenCookie?.value) {
    try {
      // Verify the token is valid - using jose library which is edge-compatible
      const jwtSecret = process.env.JWT_SECRET
      if (!jwtSecret) {
        console.error("JWT_SECRET environment variable is not set in middleware!")
        isAuthenticated = false
      } else {
        // Print first few characters of the token for debugging
        console.log(`Middleware - Token first 10 chars: ${tokenCookie.value.substring(0, 10)}...`)
        
        // Create a secret key from your JWT_SECRET
        const secret = new TextEncoder().encode(jwtSecret)
        
        // Verify the token
        const { payload } = await jwtVerify(tokenCookie.value, secret)
        
        if (payload) {
          isAuthenticated = true
          console.log(`Middleware - Path: ${path}, Valid token detected, user authenticated: ${payload.email}`)
        }
      }
    } catch (error) {
      // Invalid token, clear it
      isAuthenticated = false
      console.log(`Middleware - Path: ${path}, Token verification failed: ${(error as Error).message}`)
      
      // If token is invalid, we should clear it and redirect to login
      if (path !== "/login" && path !== "/register") {
        console.log("Redirecting to login and clearing invalid token")
        const response = NextResponse.redirect(new URL("/login", request.url))
        response.cookies.delete("token") 
        return response
      }
    }
  } else {
    console.log(`Middleware - Path: ${path}, No token detected`)
  }

  // Check if the route is protected and user is not authenticated
  const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route))
  if (isProtectedRoute && !isAuthenticated) {
    console.log(`Redirecting to login from protected route: ${path}`)
    const url = new URL("/login", request.url)
    url.searchParams.set("callbackUrl", encodeURI(request.url))
    return NextResponse.redirect(url)
  }

  // Check if the route is for non-authenticated users and user is authenticated
  const isAuthRoute = authRoutes.some((route) => path.startsWith(route))
  if (isAuthRoute && isAuthenticated) {
    console.log(`Redirecting to home from auth route: ${path}`)
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

// Update the matcher to include ALL routes where actions like reviews, profile etc. might be protected
export const config = {
  matcher: [
    "/profile/:path*", 
    "/settings/:path*", 
    "/reviews/:path*",
    "/reviews/new/:path*", 
    "/details/:path*",
    "/login", 
    "/register"
  ],
}

