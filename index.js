const express = require("express");
const app = express();
const port = 3005;

const bodyParser = require("body-parser");
const cors = require("cors");

app.use(bodyParser.json());
app.use(cors());

const spots = require("./routes/spots");

app.use("/spots", spots);

app.listen(port, () =>
  console.log(`Server listening at http://localhost:${port}`)
);
