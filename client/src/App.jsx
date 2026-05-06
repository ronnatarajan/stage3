import { useEffect, useMemo, useState } from "react";

const API = "http://localhost:5001";

export default function App() {
  const [users, setUsers] = useState([]);
  const [artists, setArtists] = useState([]);
  const [songs, setSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [reportSongs, setReportSongs] = useState([]);

  const genres = useMemo(() => {
    return [...new Set(songs.map((song) => song.genre).filter(Boolean))].sort();
  }, [songs]);

  const [userForm, setUserForm] = useState({
    username: "",
    email: ""
  });

  const [artistForm, setArtistForm] = useState({
    name: "",
    genre: ""
  });

  const [songForm, setSongForm] = useState({
    title: "",
    artistId: "",
    genre: "",
    releaseDate: ""
  });

  const [playlistForm, setPlaylistForm] = useState({
    name: "",
    description: "",
    isPublic: true,
    members: []
  });

  const [filters, setFilters] = useState({
    artistId: "",
    genre: "",
    startDate: "",
    endDate: ""
  });

  const [memberSearch, setMemberSearch] = useState("");
  const [editingPlaylistId, setEditingPlaylistId] = useState(null);
  const [playlistSongSelections, setPlaylistSongSelections] = useState({});
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    await Promise.all([
      loadUsers(),
      loadArtists(),
      loadSongs(),
      loadPlaylists()
    ]);
  }

  async function loadUsers() {
    const res = await fetch(`${API}/api/users`);
    const data = await res.json();
    setUsers(data);
  }

  async function loadArtists() {
    const res = await fetch(`${API}/api/artists`);
    const data = await res.json();
    setArtists(data);

    if (data.length > 0) {
      setSongForm((prev) => ({
        ...prev,
        artistId: prev.artistId || data[0]._id
      }));
    }
  }

  async function loadSongs() {
    const res = await fetch(`${API}/api/songs`);
    const data = await res.json();
    setSongs(data);
  }

  async function loadPlaylists() {
    const res = await fetch(`${API}/api/playlists`);
    const data = await res.json();
    setPlaylists(data);
  }

  function showMessage(message) {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(""), 2500);
  }

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    return String(dateString).slice(0, 10);
  }

  function isMemberSelected(userId) {
    return playlistForm.members.some(
      (member) => String(member.userId) === String(userId)
    );
  }

  function togglePlaylistMember(userId) {
    setPlaylistForm((prev) => {
      const exists = prev.members.some(
        (member) => String(member.userId) === String(userId)
      );

      if (exists) {
        return {
          ...prev,
          members: prev.members.filter(
            (member) => String(member.userId) !== String(userId)
          )
        };
      }

      return {
        ...prev,
        members: [...prev.members, { userId, role: "collaborator" }]
      };
    });
  }

  function updateMemberRole(userId, role) {
    setPlaylistForm((prev) => ({
      ...prev,
      members: prev.members.map((member) =>
        String(member.userId) === String(userId)
          ? { ...member, role }
          : member
      )
    }));
  }

  const filteredUsers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return users;

    return users.filter((user) => {
      const username = user.username?.toLowerCase() || "";
      const email = user.email?.toLowerCase() || "";
      return username.includes(q) || email.includes(q);
    });
  }, [users, memberSearch]);

  async function createUser(e) {
    e.preventDefault();

    const res = await fetch(`${API}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userForm)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showMessage(data.message || "Could not create user");
      return;
    }

    setUserForm({ username: "", email: "" });
    await loadUsers();
    showMessage("User created");
  }

  async function createArtist(e) {
    e.preventDefault();

    const res = await fetch(`${API}/api/artists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(artistForm)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showMessage(data.message || "Could not create artist");
      return;
    }

    setArtistForm({ name: "", genre: "" });
    await loadArtists();
    showMessage("Artist created");
  }

  async function createSong(e) {
    e.preventDefault();

    const res = await fetch(`${API}/api/songs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(songForm)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showMessage(data.message || "Could not create song");
      return;
    }

    setSongForm({
      title: "",
      artistId: artists[0]?._id || "",
      genre: "",
      releaseDate: ""
    });

    await loadSongs();
    await loadPlaylists();
    await runReport();
    showMessage("Song created");
  }

  async function submitPlaylist(e) {
    e.preventDefault();

    if (playlistForm.members.length === 0) {
      showMessage("Select at least one user");
      return;
    }

    const ownerCount = playlistForm.members.filter(
      (member) => member.role === "owner"
    ).length;

    if (ownerCount === 0) {
      showMessage("Select at least one owner");
      return;
    }

    const payload = {
      ...playlistForm
    };

    const res = await fetch(
      editingPlaylistId
        ? `${API}/api/playlists/${editingPlaylistId}`
        : `${API}/api/playlists`,
      {
        method: editingPlaylistId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showMessage(data.message || "Could not save playlist");
      return;
    }

    setPlaylistForm({
      name: "",
      description: "",
      isPublic: true,
      members: []
    });
    setMemberSearch("");
    setEditingPlaylistId(null);
    await loadPlaylists();
    showMessage(editingPlaylistId ? "Playlist updated" : "Playlist created");
  }

  function startEditPlaylist(playlist) {
    setEditingPlaylistId(playlist._id);
    setPlaylistForm({
      name: playlist.name,
      description: playlist.description || "",
      isPublic: playlist.isPublic,
      members: (playlist.users || []).map((entry) => ({
        userId:
          typeof entry.userId === "object" && entry.userId !== null
            ? entry.userId._id
            : entry.userId,
        role: entry.role
      }))
    });
    setMemberSearch("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingPlaylistId(null);
    setPlaylistForm({
      name: "",
      description: "",
      isPublic: true,
      members: []
    });
    setMemberSearch("");
  }

  async function deletePlaylist(id) {
    const res = await fetch(`${API}/api/playlists/${id}`, {
      method: "DELETE"
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showMessage(data.message || "Could not delete playlist");
      return;
    }

    await loadPlaylists();
    showMessage("Playlist deleted");
  }

  function setSelectedSongForPlaylist(playlistId, songId) {
    setPlaylistSongSelections((prev) => ({
      ...prev,
      [playlistId]: songId
    }));
  }

  async function addSongToPlaylist(playlistId) {
    const songId = playlistSongSelections[playlistId];

    if (!songId) {
      showMessage("Select a song first");
      return;
    }

    const res = await fetch(`${API}/api/playlists/${playlistId}/songs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songId })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showMessage(data.message || "Could not add song");
      return;
    }

    setPlaylistSongSelections((prev) => ({
      ...prev,
      [playlistId]: ""
    }));

    await loadPlaylists();
    showMessage("Song added to playlist");
  }

  async function removeSongFromPlaylist(playlistId, songId) {
    const res = await fetch(`${API}/api/playlists/${playlistId}/songs/${songId}`, {
      method: "DELETE"
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showMessage(data.message || "Could not remove song");
      return;
    }

    await loadPlaylists();
    showMessage("Song removed from playlist");
  }

  async function runReport() {
    const params = new URLSearchParams();

    if (filters.artistId) params.append("artistId", filters.artistId);
    if (filters.genre) params.append("genre", filters.genre);
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);

    const res = await fetch(`${API}/api/songs?${params.toString()}`);
    const data = await res.json();
    setReportSongs(data);
  }

  return (
    <div className="container">
      <h1>Music App Dashboard</h1>

      <div className="card">
        <h2>Create User</h2>
        <p className="muted">Add users who can collaborate on playlists.</p>
        <form onSubmit={createUser}>
          <label>Username</label>
          <input
            value={userForm.username}
            onChange={(e) =>
              setUserForm({ ...userForm, username: e.target.value })
            }
            placeholder="Enter username"
            required
          />

          <label>Email</label>
          <input
            type="email"
            value={userForm.email}
            onChange={(e) =>
              setUserForm({ ...userForm, email: e.target.value })
            }
            placeholder="Enter email"
            required
          />

          <button type="submit">Create User</button>
        </form>
      </div>

      <div className="card">
        <h2>Create Artist</h2>
        <p className="muted">Create artists before adding songs.</p>
        <form onSubmit={createArtist}>
          <label>Artist Name</label>
          <input
            value={artistForm.name}
            onChange={(e) =>
              setArtistForm({ ...artistForm, name: e.target.value })
            }
            placeholder="Enter artist name"
            required
          />

          <label>Genre</label>
          <input
            value={artistForm.genre}
            onChange={(e) =>
              setArtistForm({ ...artistForm, genre: e.target.value })
            }
            placeholder="Enter genre"
            required
          />

          <button type="submit">Create Artist</button>
        </form>
      </div>

      <div className="card">
        <h2>Create Song</h2>
        <p className="muted">Each song belongs to one artist.</p>
        <form onSubmit={createSong}>
          <label>Song Title</label>
          <input
            value={songForm.title}
            onChange={(e) =>
              setSongForm({ ...songForm, title: e.target.value })
            }
            placeholder="Enter song title"
            required
          />

          <label>Artist</label>
          <select
            value={songForm.artistId}
            onChange={(e) =>
              setSongForm({ ...songForm, artistId: e.target.value })
            }
            required
          >
            <option value="">Select Artist</option>
            {artists.map((artist) => (
              <option key={artist._id} value={artist._id}>
                {artist.name}
              </option>
            ))}
          </select>

          <label>Genre</label>
          <input
            value={songForm.genre}
            onChange={(e) =>
              setSongForm({ ...songForm, genre: e.target.value })
            }
            placeholder="Enter song genre"
            required
          />

          <label>Release Date</label>
          <input
            type="date"
            value={songForm.releaseDate}
            onChange={(e) =>
              setSongForm({ ...songForm, releaseDate: e.target.value })
            }
            required
          />

          <button type="submit" disabled={artists.length === 0}>
            Create Song
          </button>
        </form>
      </div>

      <div className="card">
        <h2>{editingPlaylistId ? "Edit Playlist" : "Create Playlist"}</h2>
        <p className="muted">
          Search users, select who should belong to the playlist, and mark each
          person as owner or collaborator.
        </p>

        <form onSubmit={submitPlaylist}>
          <label>Playlist Name</label>
          <input
            value={playlistForm.name}
            onChange={(e) =>
              setPlaylistForm({ ...playlistForm, name: e.target.value })
            }
            placeholder="Enter playlist name"
            required
          />

          <label>Description</label>
          <textarea
            value={playlistForm.description}
            onChange={(e) =>
              setPlaylistForm({ ...playlistForm, description: e.target.value })
            }
            placeholder="Enter playlist description"
          />

          <label>Visibility</label>
          <select
            value={String(playlistForm.isPublic)}
            onChange={(e) =>
              setPlaylistForm({
                ...playlistForm,
                isPublic: e.target.value === "true"
              })
            }
          >
            <option value="true">Public</option>
            <option value="false">Private</option>
          </select>

          <label>Search Users</label>
          <input
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Search by username or email"
          />

          <label>Playlist Members</label>
          {users.length === 0 ? (
            <p className="muted">Create a user before creating playlists.</p>
          ) : filteredUsers.length === 0 ? (
            <p className="muted">No users match your search.</p>
          ) : (
            filteredUsers.map((user) => {
              const selected = isMemberSelected(user._id);
              const member = playlistForm.members.find(
                (entry) => String(entry.userId) === String(user._id)
              );

              return (
                <div key={user._id} className="member-card">
                  <label className="member-select">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => togglePlaylistMember(user._id)}
                    />
                    <span className="member-name">{user.username}</span>
                  </label>

                  <div className="member-email">{user.email}</div>

                  {selected && (
                    <div className="member-role">
                      <label>Role</label>
                      <select
                        value={member?.role || "collaborator"}
                        onChange={(e) =>
                          updateMemberRole(user._id, e.target.value)
                        }
                      >
                        <option value="owner">Owner</option>
                        <option value="collaborator">Collaborator</option>
                      </select>
                    </div>
                  )}
                </div>
              );
            })
          )}

          <div className="actions">
            <button type="submit" disabled={users.length === 0}>
              {editingPlaylistId ? "Update Playlist" : "Create Playlist"}
            </button>
            {editingPlaylistId && (
              <button type="button" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h2>All Songs</h2>
        <p className="muted">Available songs you can add to playlists.</p>
        {songs.length === 0 ? (
          <p className="muted">No songs yet.</p>
        ) : (
          songs.map((song) => (
            <div key={song._id} className="song-box">
              <strong>{song.title}</strong>
              <div>Artist: {song.artistId?.name}</div>
              <div>Genre: {song.genre}</div>
              <div>Release Date: {formatDate(song.releaseDate)}</div>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h2>All Playlists</h2>
        <p className="muted">Manage playlists, users, and the songs inside them.</p>

        {playlists.length === 0 ? (
          <p className="muted">No playlists yet.</p>
        ) : (
          playlists.map((playlist) => (
            <div className="playlist-box" key={playlist._id}>
              <strong>{playlist.name}</strong>
              <div>{playlist.description || "No description"}</div>
              <div>Visibility: {playlist.isPublic ? "Public" : "Private"}</div>

              <div style={{ marginTop: "12px" }}>
                <strong>Users</strong>
                {playlist.users?.length === 0 ? (
                  <p className="muted" style={{ marginTop: "8px" }}>
                    No users assigned.
                  </p>
                ) : (
                  <ul>
                    {playlist.users.map((entry) => (
                      <li key={entry._id}>
                        {entry.userId?.username} ({entry.role})
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={{ marginTop: "12px" }}>
                <strong>Songs</strong>
                {playlist.songs?.length === 0 ? (
                  <p className="muted" style={{ marginTop: "8px" }}>
                    No songs in this playlist yet.
                  </p>
                ) : (
                  <ol>
                    {playlist.songs.map((entry) => (
                      <li key={entry._id}>
                        <div>
                          {entry.songId?.title} - {entry.songId?.artistId?.name}
                        </div>
                        <div className="muted">
                          Release Date: {formatDate(entry.songId?.releaseDate)}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            removeSongFromPlaylist(playlist._id, entry.songId._id)
                          }
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <div className="inline-row" style={{ marginTop: "14px" }}>
                <select
                  value={playlistSongSelections[playlist._id] || ""}
                  onChange={(e) =>
                    setSelectedSongForPlaylist(playlist._id, e.target.value)
                  }
                >
                  <option value="">Select Song</option>
                  {songs.map((song) => (
                    <option key={song._id} value={song._id}>
                      {song.title} - {song.artistId?.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => addSongToPlaylist(playlist._id)}
                >
                  Add Song
                </button>
              </div>

              <div className="actions">
                <button
                  type="button"
                  onClick={() => startEditPlaylist(playlist)}
                >
                  Edit Playlist
                </button>
                <button
                  type="button"
                  onClick={() => deletePlaylist(playlist._id)}
                >
                  Delete Playlist
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h2>Song Report</h2>
        <p className="muted">
          Filter songs directly in the database and display the matching report.
        </p>

        <label>Artist</label>
        <select
          value={filters.artistId}
          onChange={(e) =>
            setFilters({ ...filters, artistId: e.target.value })
          }
        >
          <option value="">All Artists</option>
          {artists.map((artist) => (
            <option key={artist._id} value={artist._id}>
              {artist.name}
            </option>
          ))}
        </select>

        <label>Genre</label>
        <select
          value={filters.genre}
          onChange={(e) =>
            setFilters({ ...filters, genre: e.target.value })
          }
        >
          <option value="">All Genres</option>
          {genres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>

        <label>Start Date</label>
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) =>
            setFilters({ ...filters, startDate: e.target.value })
          }
        />

        <label>End Date</label>
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) =>
            setFilters({ ...filters, endDate: e.target.value })
          }
        />

        <div className="actions">
          <button type="button" onClick={runReport}>
            Run Report
          </button>
        </div>

        {reportSongs.length === 0 ? (
          <p className="muted">No songs in report yet.</p>
        ) : (
          reportSongs.map((song) => (
            <div key={song._id} className="song-box">
              <strong>{song.title}</strong>
              <div>Artist: {song.artistId?.name}</div>
              <div>Genre: {song.genre}</div>
              <div>Release Date: {formatDate(song.releaseDate)}</div>
            </div>
          ))
        )}
      </div>

      {statusMessage && (
        <div
          className="card"
          style={{
            gridColumn: "1 / -1",
            padding: "14px 18px"
          }}
        >
          <strong>{statusMessage}</strong>
        </div>
      )}
    </div>
  );
}