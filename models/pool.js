const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  user: "johnboyle",
  port: 5432,
  database: "snapspots",
});

module.exports = pool;
