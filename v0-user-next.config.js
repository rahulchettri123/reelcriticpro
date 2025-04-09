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
  // Set to export to make Netlify deployment easier
  output: 'export',
  // Disable image optimization to work better with Netlify
  images: {
    unoptimized: true,
  },
  // Disable 404 generation which causes issues
  skipTrailingSlashRedirect: true,
  // Avoid generating app/<route>/page
  skipMiddlewareUrlNormalize: true
}

export default nextConfig 