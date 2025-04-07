import mongoose, { Schema, type Document } from "mongoose"

export interface IComment extends Document {
  user: mongoose.Types.ObjectId
  review: mongoose.Types.ObjectId
  content: string
  likes: mongoose.Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const CommentSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    review: { type: Schema.Types.ObjectId, ref: "Review", required: true },
    content: { type: String, required: true },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
)

export default mongoose.models.Comment || mongoose.model<IComment>("Comment", CommentSchema)

