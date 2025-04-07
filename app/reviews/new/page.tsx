"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Star, ArrowLeft } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

export default function NewReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const movieId = searchParams.get("movieId")
  const movieTitle = searchParams.get("title")
  const moviePoster = searchParams.get("poster")
  const { user } = useAuth()
  const { toast } = useToast()

  const [rating, setRating] = useState(0)
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // If no movie ID is provided, redirect to search
  if (!movieId || !movieTitle) {
    router.push("/search")
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please rate the movie before submitting your review",
        variant: "destructive",
      })
      return
    }

    if (!content.trim()) {
      toast({
        title: "Review content required",
        description: "Please write your review before submitting",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movie: movieId,
          movieTitle,
          moviePoster,
          rating,
          content,
        }),
        credentials: "include",
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Authentication required",
            description: "Please log in to submit a review",
            variant: "destructive",
          })
          router.push(`/login?callbackUrl=${encodeURIComponent(`/reviews/new?movieId=${movieId}&title=${encodeURIComponent(movieTitle || '')}&poster=${encodeURIComponent(moviePoster || '')}`)}`);
          return;
        }
        throw new Error(data.error || "Failed to submit review")
      }

      toast({
        title: "Review submitted",
        description: "Your review has been published successfully",
      })

      // Redirect to the movie details page
      router.push(`/details/${movieId}`)
    } catch (error) {
      console.error("Error submitting review:", error)
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container py-6 md:py-10">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href={`/details/${movieId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to movie
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Write a Review</h1>
        <p className="text-muted-foreground mt-2">Share your thoughts about {movieTitle}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[300px_1fr] lg:gap-12">
        {/* Movie Info */}
        <div>
          <Card>
            <div className="aspect-[2/3] relative overflow-hidden rounded-t-lg">
              <Image
                src={moviePoster || "/placeholder.svg?height=450&width=300"}
                alt={movieTitle}
                fill
                className="object-cover"
              />
            </div>
            <CardContent className="p-4">
              <h2 className="font-semibold text-lg">{movieTitle}</h2>
            </CardContent>
          </Card>
        </div>

        {/* Review Form */}
        <Card>
          <CardHeader>
            <CardTitle>Your Review</CardTitle>
            <CardDescription>Rate and review this movie. Be honest and constructive in your feedback.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-2">Your Rating</h3>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Button
                      key={star}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`p-1 ${rating >= star ? "text-primary" : "text-muted-foreground"}`}
                      onClick={() => setRating(star)}
                    >
                      <Star className={`h-8 w-8 ${rating >= star ? "fill-primary" : ""}`} />
                    </Button>
                  ))}
                  <span className="ml-2 text-sm">{rating > 0 ? `${rating} stars` : "Select rating"}</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Your Review</h3>
                <Textarea
                  placeholder="Share your thoughts about this movie..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="resize-none"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Publish Review"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

