/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add any specific NextJS configuration options here
  experimental: {
    serverComponentsExternalPackages: ["bcryptjs"],
  },
  // Configure server to use different cookie settings in development
  serverRuntimeConfig: {
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // Use lax for development to work with localhost
    }
  }
}

export default nextConfig 