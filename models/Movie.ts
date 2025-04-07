import mongoose, { Schema, type Document } from "mongoose"

export interface IMovie extends Document {
  id: string // IMDb ID
  title: string
  poster?: string
  backdrop?: string
  year?: string
  rating?: string
  runtime?: string
  director?: string
  cast: string[]
  genres: string[]
  description?: string
  views: number
  createdAt: Date
  updatedAt: Date
}

const MovieSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true }, // IMDb ID
    title: { type: String, required: true },
    poster: { type: String },
    backdrop: { type: String },
    year: { type: String },
    rating: { type: String },
    runtime: { type: String },
    director: { type: String },
    cast: [{ type: String }],
    genres: [{ type: String }],
    description: { type: String },
    views: { type: Number, default: 0 },
  },
  { timestamps: true },
)

export default mongoose.models.Movie || mongoose.model<IMovie>("Movie", MovieSchema)

