const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 3000;

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,  // <-- make sure this matches your schema name
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create a connection pool (best practice)
const pool = mysql.createPool(dbConfig);

const app = express();
app.use(cors());            // <-- IMPORTANT for web apps (React)
app.use(express.json());


const allowedOrigins = [
  "http://localhost:3000",
  "https://webserviceweb.onrender.com/",
  // "https://YOUR-frontend.onrender.com"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (Postman/server-to-server)
      if (!origin) return callback(null, true);

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
// Health check (optional but useful for Render)
app.get("/", (req, res) => {
  res.json({ message: "Animal API is running!" });
});

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

app.get("/animals/category/:category", async (req, res) => {
  try {
    const { category } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM animals WHERE animal_cat = ?",
      [category]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/animals/count", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT COUNT(id) AS count FROM animalweb"
    );

    res.json({ count: rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch animal count" });
  }
});

// POST add animal
app.post("/addanimal", async (req, res) => {
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

  // Basic validation (prevents inserting empty stuff)
  if (!animal_name) {
    return res.status(400).json({ message: "animal_name is required." });
  }

  try {
    const sql =
      "INSERT INTO animalweb (animal_name, animal_char, animal_desc, animal_habitat, animal_diet, animal_agg, animal_cat,animal_pic) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
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

// PUT update animal by id
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

  if (!id) {
    return res.status(400).json({ message: "id is required in params." });
  }

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

// DELETE animal by id
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

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
