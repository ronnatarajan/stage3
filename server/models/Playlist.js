import mongoose from "mongoose";

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  isPublic: { type: Boolean, default: true },
});

export default mongoose.model("Playlist", schema);