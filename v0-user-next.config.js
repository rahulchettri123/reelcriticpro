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
  // Netlify specific configuration
  images: {
    unoptimized: true,
    domains: ['cdn.example.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  }
}

export default nextConfig 