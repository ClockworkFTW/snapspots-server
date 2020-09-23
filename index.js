const express = require("express");
const app = express();
const port = 3005;

const bodyParser = require("body-parser");
const cors = require("cors");

app.use(bodyParser.json());
app.use(cors());

const users = require("./routes/users");
app.use("/api/users", users);

const profiles = require("./routes/profile");
app.use("/api/profile", profiles);

const spots = require("./routes/spots");
app.use("/api/spots", spots);

app.listen(port, () =>
  console.log(`Server listening at http://localhost:${port}`)
);
