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
  // Mobile and Netlify optimizations
  images: {
    unoptimized: true,
    domains: [],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Responsive design settings
  webpack: (config) => {
    // Custom webpack settings if needed
    return config
  },
  // Ensure pages render properly on mobile
  poweredByHeader: false,
  reactStrictMode: true,
}

export default nextConfig 