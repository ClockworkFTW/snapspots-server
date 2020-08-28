const router = require("express").Router();

const pool = require("../models/pool");

const { getSpot, getSpots } = require("../util");
const google = require("../services/google");
const weather = require("../services/weather");

router.get("/:spot_id", async (req, res) => {
  try {
    const spot = await getSpot(req.params.spot_id);
    const nearby = await getSpots(spot.properties.place_id);

    spot.properties.nearby = nearby;

    res.status(200).json(spot);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/all/:place_id", async (req, res) => {
  try {
    const spots = await getSpots(req.params.place_id);

    res.status(200).json(spots);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    // Extract spot data from request body and append timestamp
    const { custom, ...data } = req.body;
    const { latitude, longitude } = data;
    const dataArr = [...Object.values(data), new Date()];

    const { place_id, formatted_address } = await google.reverseGeocode(
      `${latitude},${longitude}`
    );

    let newSpot;

    // Create a custom spot
    if (custom) {
      dataArr.splice(1, 0, place_id, formatted_address);
      const { rows } = await pool.query(
        "INSERT INTO spots (account_id, place_id, formatted_address, name, description, keywords, type, equipment, time, photos, latitude, longitude, created_on) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *",
        dataArr
      );
      newSpot = rows[0];
    }

    // Discover a spot
    else {
      const { rows } = await pool.query(
        "INSERT INTO spots (place_id, name, formatted_address, description, photos, latitude, longitude, created_on) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
        dataArr
      );
      newSpot = rows[0];
    }

    // Get aditional properties
    const nearby = await getSpots(place_id);
    const forecast = await weather.getForecast(latitude, longitude);

    newSpot = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      properties: { ...newSpot, nearby, forecast, reviews: [] },
    };

    res.status(200).json(newSpot);
    res.end();
  } catch (error) {
    res.status(400).json({ error });
  }
});

router.post("/review", async (req, res) => {
  try {
    // create array from request body and append timestamp
    let review = [...Object.values(req.body), new Date()];

    await pool.query(
      "INSERT INTO reviews (spot_id, account_id, rating, comment, visited_on) VALUES ($1, $2, $3, $4, $5)",
      review
    );

    const spot = await getSpot(req.body.spot_id);

    res.status(200).json(spot);
  } catch (error) {
    res.status(400).json({ error });
  }
});

module.exports = router;
