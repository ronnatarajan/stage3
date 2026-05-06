import mongoose from "mongoose";

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  genre: { type: String, required: true }
});

export default mongoose.model("Artist", schema);