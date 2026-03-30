import mongoose, { Schema } from "mongoose";

export type Role = "admin" | "editor" | "viewer";

export interface UserDocument {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  organizationId: string;
  organizationName: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "editor", "viewer"],
      required: true,
      default: "viewer"
    },
    organizationId: { type: String, required: true, index: true },
    organizationName: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

export const User = mongoose.model<UserDocument>("User", userSchema);

