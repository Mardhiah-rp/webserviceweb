const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const port = process.env.PORT || 3000;

// Demo user (hardcoded)
const DEMO_USER = { id: 1, username: "admin", password: "admin123" };
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create a connection pool
const pool = mysql.createPool(dbConfig);

const app = express();
app.use(express.json());

// ✅ Keep only ONE cors middleware (configured)
const allowedOrigins = [
  "http://localhost:3000",
  "https://webserviceweb.onrender.com", // remove trailing slash
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // Postman/server-to-server

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Animal API is running!" });
});


// ==========================
// ✅ 1) LOGIN ENDPOINT
// ==========================
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username !== DEMO_USER.username || password !== DEMO_USER.password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { userId: DEMO_USER.id, username: DEMO_USER.username },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({ token });
});


// ==========================
// ✅ 2) AUTH MIDDLEWARE
// ==========================
function requireAuth(req, res, next) {
  const header = req.headers.authorization; // "Bearer <token>"
  if (!header) return res.status(401).json({ error: "Missing Authorization header" });

  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) {
    return res.status(401).json({ error: "Invalid Authorization format" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // attach decoded user info
    next();
  } catch {
    return res.status(401).json({ error: "Invalid/Expired token" });
  }
}


// ==========================
// YOUR EXISTING ROUTES
// ==========================

// GET all animals
app.get("/allanimals", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM animalweb");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error for allanimals!" });
  }
});

// ✅ FIXED category route (was using db.query + wrong table name)
app.get("/animals/category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const [rows] = await pool.execute(
      "SELECT * FROM animalweb WHERE animal_cat = ?",
      [category]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Count route
app.get("/api/animals/count", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT COUNT(id) AS count FROM animalweb");
    res.json({ count: rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch animal count" });
  }
});


// ==========================
// ✅ PROTECT ONLY THIS ROUTE
// (like the worksheet says)
// ==========================
app.post("/addanimal", requireAuth, async (req, res) => {
  const {
    animal_name,
    animal_char,
    animal_desc,
    animal_habitat,
    animal_diet,
    animal_agg,
    animal_cat,
    animal_pic,
  } = req.body;

  if (!animal_name) {
    return res.status(400).json({ message: "animal_name is required." });
  }

  try {
    const sql =
      "INSERT INTO animalweb (animal_name, animal_char, animal_desc, animal_habitat, animal_diet, animal_agg, animal_cat, animal_pic) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    const values = [
      animal_name,
      animal_char,
      animal_desc,
      animal_habitat,
      animal_diet,
      animal_agg,
      animal_cat,
      animal_pic,
    ];

    await pool.execute(sql, values);
    res.status(201).json({ message: `Animal ${animal_name} added successfully.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Server error - could not add animal ${animal_name}` });
  }
});

// PUT update animal (not protected yet)
app.put("/updateanimal/:id", async (req, res) => {
  const { id } = req.params;
  const {
    animal_name,
    animal_char,
    animal_desc,
    animal_habitat,
    animal_diet,
    animal_agg,
    animal_cat,
    animal_pic,
  } = req.body;

  try {
    const sql = `
      UPDATE animalweb
      SET animal_name = ?, animal_char = ?, animal_desc = ?, animal_habitat = ?, animal_diet = ?, animal_agg = ?, animal_cat = ?, animal_pic = ?
      WHERE id = ?
    `;

    const values = [
      animal_name,
      animal_char,
      animal_desc,
      animal_habitat,
      animal_diet,
      animal_agg,
      animal_cat,
      animal_pic,
      id,
    ];

    const [result] = await pool.execute(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: `No animal found with id ${id}` });
    }

    res.json({ message: `Animal with id ${id} updated successfully.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
});

// DELETE animal (not protected yet)
app.delete("/deleteanimal/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.execute("DELETE FROM animalweb WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: `No animal found with id ${id}` });
    }

    res.json({ message: `Animal with id ${id} deleted successfully.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
