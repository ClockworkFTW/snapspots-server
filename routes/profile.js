const router = require("express").Router();

const pool = require("../models/pool");

router.get("/:account_id", async (req, res) => {
  try {
    const { account_id } = req.params;

    const queryText =
      "SELECT account_id, username, created_on FROM accounts WHERE account_id = $1";
    const queryValues = [account_id];

    const { rows } = await pool.query(queryText, queryValues);

    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
