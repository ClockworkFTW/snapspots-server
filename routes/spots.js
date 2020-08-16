const router = require("express").Router();

const pool = require("../models/pool");

const google = require("../services/google");
const flickr = require("../services/flickr");
const weather = require("../services/weather");
const wikipedia = require("../services/wikipedia");

const config = require("../config");

const getSpot = async (id) => {
  let spot = await pool.query("SELECT * FROM spots WHERE spot_id = $1", [id]);
  spot = spot.rows[0];

  const forecast = await weather.getForecast(spot.coords);

  let reviews = await pool.query(
    "SELECT accounts.account_id, accounts.username, reviews.review_id, reviews.rating, reviews.comment, reviews.visited_on FROM accounts INNER JOIN reviews ON accounts.account_id = reviews.account_id WHERE reviews.spot_id = $1",
    [id]
  );
  reviews = reviews.rows;

  return { ...spot, reviews, forecast };
};

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const spot = await getSpot(id);

    res.status(200).json(spot);
  } catch (error) {
    res.status(400).json({ error });
  }
});

router.get("/all/:place_id", async (req, res) => {
  try {
    // get area coordinates based off place id
    const location = await google.geocode(req.params.place_id);

    // get nearby places of interest
    let POI = await google.getPOI(
      location.formatted_address,
      location.geometry.location
    );

    // filter out unwanted place types
    POI = POI.filter(
      (place) =>
        !place.types.some((type) => config.excluded_place_types.includes(type))
    );

    // convert POI to geoJSON
    let geoJSON = await Promise.all(
      POI.map(async (place) => {
        // get additional properties
        let description = await wikipedia.getExtract(place.name);
        let reviews = await google.getReviews(place.place_id);
        let photos = await flickr.getPhotos(
          place.name,
          place.geometry.location
        );

        // photos = await Promise.all(
        //   photos.map(async (photo) => {
        //     const info = await flickr.getInfo(photo.id);

        //     return { ...photo, ...info };
        //   })
        // );

        // return formatted object
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [
              place.geometry.location.lng,
              place.geometry.location.lat,
            ],
          },
          properties: {
            id: place.place_id,
            name: place.name,
            vicinity: location.formatted_address,
            reviews,
            description,
            photos,
          },
        };
      })
    );

    geoJSON = geoJSON.filter((place) => place.properties.photos.length !== 0);

    res.status(200).json({
      coords: [location.geometry.location.lng, location.geometry.location.lat],
      geoJSON,
    });
  } catch (error) {
    res.status(400).json({ error });
  }
});

router.post("/", async (req, res) => {
  try {
    // create array from request body and append timestamp
    let spot = [...Object.values(req.body), new Date()];

    const { rows } = await pool.query(
      "INSERT INTO spots (account_id, name, description, keywords, type, equipment, time, photos, coords, created_on) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *",
      spot
    );

    res.status(200).json({ ...rows[0], reviews: [] });
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
