const router = require("express").Router();

const pool = require("../models/pool");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

router.post("/sign-up", async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const created_on = new Date();
    const hashedPassword = await bcrypt.hash(password, 10);

    const text =
      "INSERT INTO account (username, password, email, created_on) VALUES ($1, $2, $3, $4) RETURNING *";
    const values = [username, hashedPassword, email, created_on];

    const { rows } = await pool.query(text, values);

    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(400).json({ error });
  }
});

router.post("/sign-in", async (req, res) => {
  try {
    const { username, password } = req.body;

    const text = "SELECT * FROM account WHERE username = $1";
    const values = [username];

    const { rows } = await pool.query(text, values);

    let pass = false;

    if (rows.length !== 0) {
      pass = await bcrypt.compare(password, rows[0].password);
    }

    if (!pass) {
      return res.status(401).json({ error: "invalid username or password" });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(400).json({ error });
  }
});

module.exports = router;
