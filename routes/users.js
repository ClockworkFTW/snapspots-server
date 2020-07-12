const router = require("express").Router();

const pool = require("../models/pool");

router.post("/sign-up", async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const created_on = new Date();

    const text =
      "INSERT INTO account (username, password, email, created_on) VALUES ($1, $2, $3, $4) RETURNING *";
    const values = [username, password, email, created_on];

    const { rows } = await pool.query(text, values);

    res.status(200).json(rows);
  } catch (error) {
    console.log(error);
    res.status(400);
  }
});

router.post("/sign-in", async (req, res) => {
  try {
    const { username, password } = req.body;

    const text = "SELECT * FROM account WHERE username = $1 AND password = $2";
    const values = [username, password];

    const { rows } = await pool.query(text, values);

    res.status(200).json(rows);
  } catch (error) {
    console.log(error);
    res.status(400);
  }
});

module.exports = router;
