import mongoose from "mongoose";

const schema = new mongoose.Schema({
  title: { type: String, required: true },
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Artist",
    required: true
  },
  genre: { type: String, required: true },
  releaseDate: { type: Date, required: true }
});
schema.index({ artistId: 1, genre: 1, releaseDate: 1 });

export default mongoose.model("Song", schema);