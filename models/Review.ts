import mongoose, { Schema, type Document } from "mongoose"

export interface IReview extends Document {
  user: mongoose.Types.ObjectId
  movie: string // IMDb ID
  movieTitle: string
  moviePoster?: string
  rating: number
  content: string
  likes: mongoose.Types.ObjectId[]
  comments: mongoose.Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const ReviewSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    movie: { type: String, required: true }, // IMDb ID
    movieTitle: { type: String, required: true },
    moviePoster: { type: String },
    rating: { type: Number, required: true, min: 0, max: 5 },
    content: { type: String, required: true },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
  },
  { timestamps: true },
)

export default mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema)

