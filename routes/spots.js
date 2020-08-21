const router = require("express").Router();

const pool = require("../models/pool");

const google = require("../services/google");
const flickr = require("../services/flickr");
const weather = require("../services/weather");
const wikipedia = require("../services/wikipedia");

const getSpot = async (id) => {
  // Get spot
  let spot = await pool.query("SELECT * FROM spots WHERE spot_id = $1", [id]);
  spot = spot.rows[0];

  // Join reviews
  let reviews = await pool.query(
    "SELECT accounts.account_id, accounts.username, reviews.review_id, reviews.rating, reviews.comment, reviews.visited_on FROM accounts INNER JOIN reviews ON accounts.account_id = reviews.account_id WHERE reviews.spot_id = $1",
    [id]
  );
  reviews = reviews.rows;

  // Get forecast
  const forecast = await weather.getForecast(spot.coordinates);

  // Return updated spot
  return { ...spot, reviews, forecast };
};

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const spot = await getSpot(id);

    res.status(200).json(spot);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/all/:place_id", async (req, res) => {
  try {
    // get area coordinates based off place id
    const area = await google.geocode(req.params.place_id);
    // prettier-ignore
    const { geometry: { location }, formatted_address} = area;

    // get nearby places of interest
    const POI = await google.getPOI(formatted_address, location);

    // convert POI to geoJSON format
    const geoJSON = await Promise.all(
      POI.map(async ({ place_id, name, geometry: { location } }) => {
        // get additional properties
        let description = await wikipedia.getExtract(name);
        let photos = await flickr.getPhotos(name, location);

        // return formatted object
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [location.lng, location.lat],
          },
          properties: {
            place_id,
            name,
            formatted_address,
            description,
            photos,
          },
        };
      })
    );

    // Filter out places without photos
    const places = {
      coords: [location.lng, location.lat],
      geoJSON: geoJSON.filter((place) => place.properties.photos.length !== 0),
    };

    res.status(200).json(places);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    // Extract spot data from request body and append timestamp
    const { custom, ...data } = req.body;
    const dataArr = [...Object.values(data), new Date()];

    let newSpot;

    // Create a custom spot
    if (custom) {
      const { rows } = await pool.query(
        "INSERT INTO spots (account_id, name, description, keywords, type, equipment, time, photos, coordinates, created_on) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *",
        dataArr
      );
      newSpot = rows[0];
    }
    // Create a "discovered" spot
    else {
      console.log(data);
      const { rows } = await pool.query(
        "INSERT INTO spots (place_id, name, formatted_address, description, photos, coordinates, created_on) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        dataArr
      );
      newSpot = rows[0];
    }

    // Get forecast
    const forecast = await weather.getForecast(data.coordinates);

    res.status(200).json({ ...newSpot, forecast, reviews: [] });
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
