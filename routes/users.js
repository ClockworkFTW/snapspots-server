const router = require("express").Router();

const pool = require("../models/pool");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const jwtSecret = process.env.JWT_SECRET;

router.post("/sign-up", async (req, res) => {
  try {
    const { username, passwordOne, passwordTwo, email } = req.body;

    if (passwordOne !== passwordTwo) {
      return res.status(400).json("Passwords must match");
    }

    const password = await bcrypt.hash(passwordOne, 10);
    const created_on = new Date();

    const text =
      "INSERT INTO account (username, password, email, created_on) VALUES ($1, $2, $3, $4) RETURNING *";
    const values = [username, password, email, created_on];

    const { rows } = await pool.query(text, values);

    const token = jwt.sign(rows[0], jwtSecret);

    res.status(200).json(token);
  } catch (error) {
    const message =
      error.code === "23505"
        ? "Username already exists"
        : "Something went wrong";
    res.status(400).json(message);
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
      return res.status(400).json("Invalid username or password");
    }

    const token = jwt.sign(rows[0], jwtSecret);

    res.status(200).json(token);
  } catch (error) {
    res.status(400).json("Something went wrong");
  }
});

module.exports = router;
