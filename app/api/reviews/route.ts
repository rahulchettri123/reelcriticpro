import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { getCollection } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(request: Request) {
  try {
    // Get token from cookies using cookies() directly to avoid warnings
    const cookieStore = await cookies()
    const token = cookieStore.get("token")

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Verify token
    try {
      const jwtSecret = process.env.JWT_SECRET
      if (!jwtSecret) {
        console.error("JWT_SECRET environment variable is not set!")
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
      }
      
      const decoded = jwt.verify(token.value, jwtSecret) as { id: string }

      // Get user from database
      const usersCollection = await getCollection("users")
      const user = await usersCollection.findOne({ _id: new ObjectId(decoded.id) })

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Get review data from request
      const { movie, movieTitle, moviePoster, rating, content } = await request.json()

      // Validate input
      if (!movie || !movieTitle || !rating || !content) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }

      // Create new review
      const reviewsCollection = await getCollection("reviews")
      const newReview = {
        user: new ObjectId(user._id),
        movie,
        movieTitle,
        moviePoster,
        rating,
        content,
        likes: [],
        comments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Insert review into database
      const result = await reviewsCollection.insertOne(newReview)

      // Update user's review count
      await usersCollection.updateOne(
        { _id: new ObjectId(user._id) },
        { 
          $inc: { "stats.reviewsCount": 1 },
          $set: { updatedAt: new Date() }
        }
      )

      // Update movie's local rating in the database
      try {
        // Calculate new average rating for this movie
        const reviewsAggregation = await reviewsCollection.aggregate([
          { $match: { movie: movie } },
          { 
            $group: { 
              _id: null, 
              averageRating: { $avg: "$rating" },
              reviewCount: { $sum: 1 }
            } 
          }
        ]).toArray();
        
        if (reviewsAggregation.length > 0) {
          const localRating = {
            average: parseFloat(reviewsAggregation[0].averageRating.toFixed(1)),
            count: reviewsAggregation[0].reviewCount
          };
          
          // Get movies collection
          const moviesCollection = await getCollection("movies");
          
          // Update movie with new local rating
          await moviesCollection.updateOne(
            { id: movie },
            { 
              $set: { 
                localRating: localRating,
                updatedAt: new Date() 
              }
            },
            { upsert: true }
          );
          
          console.log(`Updated movie ${movie} with new local rating: ${localRating.average}/5 (${localRating.count} reviews)`);
        }
      } catch (ratingError) {
        console.error("Error updating movie local rating:", ratingError);
        // Non-critical error, continue with review creation
      }

      return NextResponse.json(
        {
          message: "Review created successfully",
          review: { ...newReview, _id: result.insertedId },
        },
        { status: 201 },
      )
    } catch (tokenError) {
      console.error("Token verification error:", tokenError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }
  } catch (error) {
    console.error("Review creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const movie = searchParams.get("movie")
    const user = searchParams.get("user")
    const limitParam = searchParams.get("limit")
    const skipParam = searchParams.get("skip")
    const rating = searchParams.get("rating")
    const genres = searchParams.get("genres")
    
    // Parse pagination params
    const limit = limitParam ? parseInt(limitParam, 10) : 20
    const skip = skipParam ? parseInt(skipParam, 10) : 0

    const reviewsCollection = await getCollection("reviews")
    const moviesCollection = await getCollection("movies")
    let query = {}

    // Basic filters
    if (movie) {
      query = { ...query, movie }
    }

    if (user) {
      query = { ...query, user: new ObjectId(user) }
    }
    
    // Rating filter
    if (rating && !isNaN(parseInt(rating, 10))) {
      const ratingValue = parseInt(rating, 10)
      query = { ...query, rating: { $gte: ratingValue } }
    }
    
    // Get reviews that match the basic criteria first
    let filteredReviews = []
    
    // Check if we need to filter by genre
    if (genres) {
      const genresList = genres.split(',')
      
      // We need a two-step process for genre filtering:
      // 1. Get the reviews that match the basic criteria
      const basicFilteredReviews = await reviewsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray()
      
      // 2. For each review, check if the movie has the specified genres
      const reviewsWithGenres = await Promise.all(
        basicFilteredReviews.map(async (review) => {
          const movie = await moviesCollection.findOne({ id: review.movie })
          if (movie && movie.genres) {
            const movieGenres = movie.genres.map((g: string) => g.toLowerCase())
            // Check if any of the requested genres match the movie's genres
            const hasMatchingGenre = genresList.some(genre => 
              movieGenres.includes(genre.toLowerCase())
            )
            return hasMatchingGenre ? review : null
          }
          return null
        })
      )
      
      // Filter out nulls
      filteredReviews = reviewsWithGenres.filter(review => review !== null)
      
      // Apply pagination manually
      const total = filteredReviews.length
      filteredReviews = filteredReviews.slice(skip, skip + limit)
      
      // Populate user data for each review
      const usersCollection = await getCollection("users")
      const populatedReviews = await Promise.all(
        filteredReviews.map(async (review) => {
          const user = await usersCollection.findOne({ _id: review.user })
          const { password, ...userWithoutPassword } = user || {}
          return {
            ...review,
            user: userWithoutPassword,
          }
        })
      )
      
      return NextResponse.json({ 
        reviews: populatedReviews,
        pagination: {
          total,
          page: Math.floor(skip / limit) + 1,
          limit,
          pages: Math.ceil(total / limit)
        }
      })
    } else {
      // No genre filtering needed, proceed with standard query
      // Get total count for pagination
      const total = await reviewsCollection.countDocuments(query)
      
      // Get reviews with pagination
      const reviews = await reviewsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray()

      // Populate user data for each review
      const usersCollection = await getCollection("users")
      const populatedReviews = await Promise.all(
        reviews.map(async (review) => {
          const user = await usersCollection.findOne({ _id: review.user })
          const { password, ...userWithoutPassword } = user || {}
          return {
            ...review,
            user: userWithoutPassword,
          }
        })
      )

      return NextResponse.json({ 
        reviews: populatedReviews,
        pagination: {
          total,
          page: Math.floor(skip / limit) + 1,
          limit,
          pages: Math.ceil(total / limit)
        }
      })
    }
  } catch (error) {
    console.error("Error fetching reviews:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

