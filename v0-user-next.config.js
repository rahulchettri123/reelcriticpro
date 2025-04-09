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
  },
  // Required for next-on-netlify
  target: "serverless",
  // Use standalone output
  output: "standalone",
  // Add trailingSlash for Netlify compatibility
  trailingSlash: true
}

export default nextConfig 