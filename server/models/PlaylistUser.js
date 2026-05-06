import mongoose from "mongoose";

const schema = new mongoose.Schema({
  playlistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Playlist",
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  role: {
    type: String,
    enum: ["owner", "collaborator"],
    default: "collaborator"
  }
});

schema.index(
  { playlistId: 1, userId: 1 },
  { unique: true }
);

export default mongoose.model("PlaylistUser", schema);