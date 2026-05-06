import mongoose from "mongoose";
import dotenv from "dotenv";

import User from "./models/User.js";
import Artist from "./models/Artist.js";
import Song from "./models/Song.js";
import Playlist from "./models/Playlist.js";
import PlaylistUser from "./models/PlaylistUser.js";
import PlaylistSong from "./models/PlaylistSong.js";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
console.log("Connected for seeding");

await PlaylistSong.deleteMany({});
await PlaylistUser.deleteMany({});
await Playlist.deleteMany({});
await Song.deleteMany({});
await Artist.deleteMany({});
await User.deleteMany({});

const ron = await User.create({
  username: "ron",
  email: "ron@test.com"
});

const alex = await User.create({
  username: "alex",
  email: "alex@test.com"
});

const maya = await User.create({
  username: "maya",
  email: "maya@test.com"
});

const sza = await Artist.create({
  name: "SZA",
  genre: "R&B"
});

const weeknd = await Artist.create({
  name: "The Weeknd",
  genre: "Pop"
});

const kendrick = await Artist.create({
  name: "Kendrick Lamar",
  genre: "Hip-Hop"
});

const killBill = await Song.create({
  title: "Kill Bill",
  artistId: sza._id,
  genre: "R&B",
  releaseDate: "2022-12-09"
});

const snooze = await Song.create({
  title: "Snooze",
  artistId: sza._id,
  genre: "R&B",
  releaseDate: "2022-12-09"
});

const blindingLights = await Song.create({
  title: "Blinding Lights",
  artistId: weeknd._id,
  genre: "Pop",
  releaseDate: "2019-11-29"
});

const playlist = await Playlist.create({
  name: "Late Night Vibes",
  description: "Songs for studying late",
  isPublic: true
});

await PlaylistUser.insertMany([
  {
    playlistId: playlist._id,
    userId: ron._id,
    role: "owner"
  },
  {
    playlistId: playlist._id,
    userId: alex._id,
    role: "collaborator"
  },
  {
    playlistId: playlist._id,
    userId: maya._id,
    role: "collaborator"
  }
]);

await PlaylistSong.insertMany([
  {
    playlistId: playlist._id,
    songId: killBill._id,
    position: 1
  },
  {
    playlistId: playlist._id,
    songId: snooze._id,
    position: 2
  },
  {
    playlistId: playlist._id,
    songId: blindingLights._id,
    position: 3
  }
]);

console.log("Seeded!");
process.exit();