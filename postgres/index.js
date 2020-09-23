const fs = require("fs");
const path = require("path");

const { Pool } = require("pg");

// Production
const pool = new Pool({
  host: "db-postgresql-snapspots-do-user-7165271-0.b.db.ondigitalocean.com",
  user: "doadmin",
  password: "nb4kp1zwcx6yl1zt",
  port: 25060,
  database: "defaultdb",
  ssl: {
    rejectUnauthorized: true,
    ca: fs
      .readFileSync(path.resolve(__dirname, "./ca-certificate.crt"))
      .toString(),
  },
});

// Desktop
// const pool = new Pool({
//   host: "127.0.0.1",
//   user: "postgres",
//   password: "#Trinity13",
//   port: 5432,
//   database: "snapspots",
// });

// Macbook
// const pool = new Pool({
//   host: "localhost",
//   user: "johnboyle",
//   port: 5432,
//   database: "snapspots",
// });

module.exports = pool;
