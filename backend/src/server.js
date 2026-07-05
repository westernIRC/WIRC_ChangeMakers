require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const houseRoutes = require("./routes/houses");
const entryRoutes = require("./routes/entries");
const leaderboardRoutes = require("./routes/leaderboard");
const adminRoutes = require("./routes/admin");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/houses", houseRoutes);
app.use("/entries", entryRoutes);
app.use("/leaderboard", leaderboardRoutes);
app.use("/admin", adminRoutes);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Change Makers API listening on port ${port}`));
