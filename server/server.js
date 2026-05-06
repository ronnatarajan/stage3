import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import User from "./models/User.js";
import Artist from "./models/Artist.js";
import Song from "./models/Song.js";
import Playlist from "./models/Playlist.js";
import PlaylistSong from "./models/PlaylistSong.js";
import PlaylistUser from "./models/PlaylistUser.js";

dotenv.config({ path: "./.env" });

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

await mongoose.connect(process.env.MONGO_URI);
console.log("MongoDB connected");

app.get("/", (req, res) => {
  res.json({ message: "API running" });
});

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const badIdResponse = (res, name) => {
  return res.status(400).json({ message: `Invalid ${name}` });
};

/* ---------------- USERS ---------------- */
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().sort({ username: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({ message: "username and email are required" });
    }

    const usernameClean = String(username).trim();
    const emailClean = String(email).trim();

    const user = await User.create({
      username: usernameClean,
      email: emailClean
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ---------------- ARTISTS ---------------- */
app.get("/api/artists", async (req, res) => {
  try {
    const artists = await Artist.find().sort({ name: 1 });
    res.json(artists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/artists", async (req, res) => {
  try {
    const { name, genre } = req.body;

    if (!name || !genre) {
      return res.status(400).json({ message: "name and genre are required" });
    }

    const artist = await Artist.create({
      name: String(name).trim(),
      genre: String(genre).trim()
    });
    res.status(201).json(artist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ---------------- SONGS ---------------- */
app.get("/api/songs", async (req, res) => {
  try {
    const { artistId, genre, startDate, endDate } = req.query;
    const filter = {};

    if (artistId) {
      if (!mongoose.Types.ObjectId.isValid(artistId)) {
        return res.status(400).json({ message: "Invalid artistId" });
      }
      filter.artistId = artistId;
    }

    if (genre) {
      filter.genre = String(genre).trim();
    }

    if (startDate || endDate) {
      filter.releaseDate = {};

      if (startDate) {
        const parsedStart = new Date(startDate);
        if (Number.isNaN(parsedStart.getTime())) {
          return res.status(400).json({ message: "Invalid startDate" });
        }
        filter.releaseDate.$gte = parsedStart;
      }

      if (endDate) {
        const parsedEnd = new Date(endDate);
        if (Number.isNaN(parsedEnd.getTime())) {
          return res.status(400).json({ message: "Invalid endDate" });
        }
        filter.releaseDate.$lte = parsedEnd;
      }
    }

    const songs = await Song.find(filter)
      .populate("artistId")
      .sort({ releaseDate: 1, title: 1 });

    res.json(songs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/songs", async (req, res) => {
  try {
    const { title, artistId, genre, releaseDate } = req.body;

    if (!title || !artistId || !genre || !releaseDate) {
      return res
        .status(400)
        .json({ message: "title, artistId, genre, and releaseDate are required" });
    }

    if (!isValidObjectId(artistId)) {
      return badIdResponse(res, "artistId");
    }

    const parsedReleaseDate = new Date(releaseDate);
    if (Number.isNaN(parsedReleaseDate.getTime())) {
      return res.status(400).json({ message: "Invalid releaseDate" });
    }

    const song = await Song.create({
      title: String(title).trim(),
      artistId,
      genre: String(genre).trim(),
      releaseDate: parsedReleaseDate
    });

    const populatedSong = await Song.findById(song._id).populate("artistId");
    res.status(201).json(populatedSong);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/songs/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return badIdResponse(res, "song id");
    }

    const { title, artistId, genre, releaseDate } = req.body;

    const update = {};

    if (title !== undefined) {
      update.title = String(title).trim();
    }

    if (artistId !== undefined) {
      if (!isValidObjectId(artistId)) {
        return badIdResponse(res, "artistId");
      }
      update.artistId = artistId;
    }

    if (genre !== undefined) {
      update.genre = String(genre).trim();
    }

    if (releaseDate !== undefined) {
      const parsedReleaseDate = new Date(releaseDate);
      if (Number.isNaN(parsedReleaseDate.getTime())) {
        return res.status(400).json({ message: "Invalid releaseDate" });
      }
      update.releaseDate = parsedReleaseDate;
    }

    const song = await Song.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true
    }).populate("artistId");

    if (!song) {
      return res.status(404).json({ message: "Song not found" });
    }

    res.json(song);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ---------------- PLAYLISTS ---------------- */
app.get("/api/playlists", async (req, res) => {
  try {
    const playlists = await Playlist.find().sort({ name: 1 });

    const result = await Promise.all(
      playlists.map(async (playlist) => {
        const users = await PlaylistUser.find({ playlistId: playlist._id })
          .populate("userId")
          .sort({ role: 1 });

        const songs = await PlaylistSong.find({ playlistId: playlist._id })
          .populate({
            path: "songId",
            populate: { path: "artistId" }
          })
          .sort({ position: 1 });

        return {
          ...playlist.toObject(),
          users,
          songs
        };
      })
    );

    res.json(result);
  } catch (error) {
    console.error("Get playlists error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/playlists", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { name, description, isPublic, members = [] } = req.body;

    if (!name || members.length === 0) {
      return res.status(400).json({
        message: "name and at least one playlist member are required"
      });
    }

    const ownerCount = members.filter((member) => member.role === "owner").length;
    if (ownerCount === 0) {
      return res.status(400).json({
        message: "At least one member must be an owner"
      });
    }

    const validRoles = ["owner", "collaborator"];

    for (const member of members) {
      if (!member.userId || !isValidObjectId(member.userId)) {
        return badIdResponse(res, "member userId");
      }

      if (!validRoles.includes(member.role)) {
        return res.status(400).json({ message: "Invalid member role" });
      }
    }
    session.startTransaction();

    const [playlist] = await Playlist.create(
      [
        {
          name: String(name).trim(),
          description: description ? String(description).trim() : "",
          isPublic: isPublic ?? true
        }
      ],
      { session }
    );

    const playlistUsers = members.map((member) => ({
      playlistId: playlist._id,
      userId: member.userId,
      role: member.role
    }));

    await PlaylistUser.insertMany(playlistUsers, { session });

    await session.commitTransaction();

    const users = await PlaylistUser.find({ playlistId: playlist._id })
      .populate("userId")
      .sort({ role: 1 });

    res.status(201).json({
      ...playlist.toObject(),
      users,
      songs: []
    });
  } catch (error) {
    await session.abortTransaction();

    if (error.code === 11000) {
      return res.status(400).json({
        message: "Duplicate playlist member"
      });
    }

    console.error("Create playlist error:", error);
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

app.put("/api/playlists/:id", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const { name, description, isPublic, members = [] } = req.body;

    if (!isValidObjectId(id)) {
      return badIdResponse(res, "playlist id");
    }

    if (!name || members.length === 0) {
      return res.status(400).json({
        message: "name and at least one playlist member are required"
      });
    }

    const validRoles = ["owner", "collaborator"];

    for (const member of members) {
      if (!member.userId || !isValidObjectId(member.userId)) {
        return badIdResponse(res, "member userId");
      }

      if (!validRoles.includes(member.role)) {
        return res.status(400).json({ message: "Invalid member role" });
      }
    }

    const ownerCount = members.filter((member) => member.role === "owner").length;
    if (ownerCount === 0) {
      return res.status(400).json({
        message: "At least one member must be an owner"
      });
    }

    session.startTransaction();

    const playlist = await Playlist.findByIdAndUpdate(
      id,
      {
        name: String(name).trim(),
        description: description ? String(description).trim() : "",
        isPublic: isPublic ?? true
      },
      { new: true, runValidators: true, session }
    );

    if (!playlist) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Playlist not found" });
    }

    await PlaylistUser.deleteMany({ playlistId: playlist._id }, { session });

    const playlistUsers = members.map((member) => ({
      playlistId: playlist._id,
      userId: member.userId,
      role: member.role
    }));

    await PlaylistUser.insertMany(playlistUsers, { session });

    await session.commitTransaction();

    const users = await PlaylistUser.find({ playlistId: playlist._id })
      .populate("userId")
      .sort({ role: 1 });

    const songs = await PlaylistSong.find({ playlistId: playlist._id })
      .populate({
        path: "songId",
        populate: { path: "artistId" }
      })
      .sort({ position: 1 });

    res.json({
      ...playlist.toObject(),
      users,
      songs
    });
  } catch (error) {
    await session.abortTransaction();

    if (error.code === 11000) {
      return res.status(400).json({
        message: "Update playlist error"
      });
    }

    console.error("Update playlist error:", error);
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

app.delete("/api/playlists/:id", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return badIdResponse(res, "playlist id");
    }

    session.startTransaction();

    const playlist = await Playlist.findByIdAndDelete(id, { session });

    if (!playlist) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Playlist not found" });
    }

    await PlaylistUser.deleteMany({ playlistId: id }, { session });
    await PlaylistSong.deleteMany({ playlistId: id }, { session });

    await session.commitTransaction();

    res.json({ message: "Playlist deleted" });
  } catch (error) {
    await session.abortTransaction();
    console.error("Delete playlist error:", error);
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

/* ---------------- PLAYLIST SONGS ---------------- */
app.post("/api/playlists/:id/songs", async (req, res) => {
  try {
    const { id } = req.params;
    const { songId } = req.body;

    if (!isValidObjectId(id)) {
      return badIdResponse(res, "playlist id");
    }

    if (!songId) {
      return res.status(400).json({ message: "songId is required" });
    }

    if (!isValidObjectId(songId)) {
      return badIdResponse(res, "songId");
    }

    const existing = await PlaylistSong.findOne({
      playlistId: id,
      songId
    });

    if (existing) {
      return res.status(400).json({ message: "Song already in playlist" });
    }

    const count = await PlaylistSong.countDocuments({ playlistId: id });

    const playlistSong = await PlaylistSong.create({
      playlistId: id,
      songId,
      position: count + 1
    });

    const populated = await PlaylistSong.findById(playlistSong._id).populate({
      path: "songId",
      populate: { path: "artistId" }
    });

    res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Song already in playlist" });
    }

    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/playlists/:playlistId/songs/:songId", async (req, res) => {
  try {
    const { playlistId, songId } = req.params;

    if (!isValidObjectId(playlistId)) {
      return badIdResponse(res, "playlist id");
    }

    if (!isValidObjectId(songId)) {
      return badIdResponse(res, "song id");
    }

    await PlaylistSong.findOneAndDelete({
      playlistId,
      songId
    });

    const remaining = await PlaylistSong.find({
      playlistId
    }).sort({ position: 1 });

    for (let i = 0; i < remaining.length; i++) {
      remaining[i].position = i + 1;
      await remaining[i].save();
    }

    res.json({ message: "Song removed from playlist" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});