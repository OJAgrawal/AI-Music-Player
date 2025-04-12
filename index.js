// server/index.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const querystring = require("querystring");

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 🏠 Home route - welcome page
app.get("/", (req, res) => {
  res.send(`
    <h1>🎵 Welcome to Spotify AI Music Player</h1>
    <p><a href="/login">Click here to log in with Spotify</a></p>
  `);
});

// 🔐 Login route - starts the Spotify OAuth process
app.get("/login", (req, res) => {
  const scope = "user-read-private user-read-email playlist-read-private";
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  const params = querystring.stringify({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope,
    redirect_uri: redirectUri,
  });
  console.log("🎯 Redirecting to Spotify with:", redirectUri);
  res.redirect("https://accounts.spotify.com/authorize?" + params);
});

// 🎯 Callback route - handles redirect from Spotify after login
app.get("/callback", async (req, res) => {
  console.log("🎯 /callback hit with code:", req.query.code);

  const code = req.query.code || null;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  const authOptions = {
    method: "post",
    url: "https://accounts.spotify.com/api/token",
    data: new URLSearchParams({
      code: code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
        ).toString("base64"),
    },
  };

  try {
    const response = await axios(authOptions);
    const { access_token, refresh_token } = response.data;

    // 🧪 Optional: Save tokens for reuse later (in memory for now)
    app.set("access_token", access_token);

    res.send(`
      <h2>🎉 Logged in with Spotify!</h2>
      <p><strong>Access Token:</strong></p>
      <pre>${access_token}</pre>
      <p><strong>Refresh Token:</strong></p>
      <pre>${refresh_token}</pre>
      <p><a href="/me">Click here to view your profile info</a></p>
    `);
  } catch (error) {
    console.error("Token exchange failed:", error.response?.data || error);
    res.send("❌ Error during authentication.");
  }
});

// 👤 /me route - fetches user's Spotify profile
app.get("/me", async (req, res) => {
  const accessToken = app.get("access_token");

  if (!accessToken) {
    return res.status(401).send("Access token not found. Login first.");
  }

  try {
    const profileResponse = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    res.json(profileResponse.data);
  } catch (error) {
    console.error("Error fetching profile:", error.response?.data || error);
    res.send("❌ Failed to fetch profile.");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});