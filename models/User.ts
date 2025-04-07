import mongoose, { Schema, type Document } from "mongoose"

export interface IUser extends Document {
  name: string
  email: string
  password: string
  username: string
  avatar?: string
  bio?: string
  location?: string
  website?: string
  role: "admin" | "critic" | "viewer"
  following: mongoose.Types.ObjectId[]
  followers: mongoose.Types.ObjectId[]
  favorites: mongoose.Types.ObjectId[]
  watchlist: mongoose.Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    avatar: { type: String },
    bio: { type: String },
    location: { type: String },
    website: { type: String },
    role: {
      type: String,
      enum: ["admin", "critic", "viewer"],
      default: "viewer",
    },
    following: [{ type: Schema.Types.ObjectId, ref: "User" }],
    followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    favorites: [{ type: Schema.Types.ObjectId, ref: "Movie" }],
    watchlist: [{ type: Schema.Types.ObjectId, ref: "Movie" }],
  },
  { timestamps: true },
)

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema)

