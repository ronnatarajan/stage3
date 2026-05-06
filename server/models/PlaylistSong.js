import mongoose from "mongoose";

const schema = new mongoose.Schema({
  playlistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Playlist",
    required: true
  },
  songId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Song",
    required: true
  },
  position: {
    type: Number,
    required: true
  }
});
schema.index(
  { playlistId: 1, songId: 1 },
  { unique: true }
);
export default mongoose.model("PlaylistSong", schema);