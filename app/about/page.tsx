import React from 'react'

export default function AboutPage() {
  return (
    <div className="container max-w-4xl py-12">
      <h1 className="text-3xl font-bold mb-6">About ReelCritic</h1>
      
      <div className="prose prose-lg dark:prose-invert">
        <p>
          ReelCritic is a community-driven platform for movie enthusiasts to discover, review, and discuss films of all genres and eras.
        </p>
        
        <p>
          Our mission is to create an engaging and inclusive space where film lovers can share their perspectives, connect with like-minded individuals, and explore new cinematic experiences.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Our Story</h2>
        <p>
          Founded in 2023, ReelCritic emerged from a passion for cinema and the desire to build a more personalized movie community than what was available. We believe that everyone's voice and perspective on film is valuable.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Join Our Community</h2>
        <p>
          Whether you're a casual moviegoer or a dedicated cinephile, ReelCritic welcomes your contributions. Create a profile to start tracking your watchlist, writing reviews, and connecting with other movie fans.
        </p>
      </div>
    </div>
  )
} 