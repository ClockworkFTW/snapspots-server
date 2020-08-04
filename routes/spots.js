const router = require("express").Router();

const pool = require("../models/pool");

const google = require("../services/google");
const flickr = require("../services/flickr");

const getSpot = async (id) => {
  const spot = await pool.query("SELECT * FROM spots WHERE spot_id = $1", [id]);
  const reviews = await pool.query(
    "SELECT accounts.account_id, accounts.username, reviews.review_id, reviews.rating, reviews.comment, reviews.visited_on FROM accounts INNER JOIN reviews ON accounts.account_id = reviews.account_id WHERE reviews.spot_id = $1",
    [id]
  );

  return { ...spot.rows[0], reviews: reviews.rows };
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
    const location = await google.geocode(req.params.place_id);

    const POI = await google.getPOI(location);

    const geoJSON = await Promise.all(
      POI.map(async (place) => {
        let photos = await flickr.getPhotos(
          place.name,
          place.geometry.location
        );

        photos = await Promise.all(
          photos.map(async (photo) => {
            const info = await flickr.getInfo(photo.id);

            return { ...photo, ...info };
          })
        );

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
            id: place.id,
            name: place.name,
            photos,
          },
        };
      })
    );

    res.status(200).json({ coords: [location.lng, location.lat], geoJSON });
  } catch (error) {
    res.status(400).json({ error });
  }
});

router.post("/", async (req, res) => {
  try {
    // create array from request body and append timestamp
    let spot = [...Object.values(req.body), new Date()];

    console.log(spot);

    const { rows } = await pool.query(
      "INSERT INTO spots (account_id, name, description, keywords, type, equipment, time, photos, created_on) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
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
