import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    name: { type: String, required: true, trim: true },
    membership: { type: mongoose.Schema.Types.ObjectId, ref: "Membership" },
    status: { type: String, enum: ["active", "blocked"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);

