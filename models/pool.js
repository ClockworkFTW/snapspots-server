const { Pool } = require("pg");

// Desktop
const pool = new Pool({
  host: "127.0.0.1",
  user: "postgres",
  password: "#Trinity13",
  port: 5432,
  database: "snapspots",
});

// Macbook
// const pool = new Pool({
//   host: "localhost",
//   user: "johnboyle",
//   port: 5432,
//   database: "snapspots",
// });

module.exports = pool;
