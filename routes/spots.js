const router = require("express").Router();

const pool = require("../models/pool");

const google = require("../services/google");
const flickr = require("../services/flickr");

const getSpot = async (id) => {
  const spot = await pool.query("SELECT * FROM spots WHERE spot_id = $1", [id]);
  const votes = await pool.query("SELECT * FROM votes WHERE spot_id = $1", [
    id,
  ]);

  return { ...spot.rows[0], votes: votes.rows };
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
    const {
      name,
      description,
      keywords,
      coords,
      type,
      equipment,
      time,
      photos,
      user,
    } = req.body;

    const text =
      "INSERT INTO spots (name, description, type, equipment, time, photos, account_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *";
    const values = [name, description, type, equipment, time, photos, user];

    const { rows } = await pool.query(text, values);

    res.status(200).json({ ...rows[0], votes: [] });
  } catch (error) {
    res.status(400).json({ error });
  }
});

router.post("/vote", async (req, res) => {
  try {
    const { vote_id, spot_id, account_id, up } = req.body;

    if (vote_id) {
      await pool.query("DELETE FROM votes WHERE vote_id=($1)", [vote_id]);
    } else {
      await pool.query(
        "INSERT INTO votes (spot_id, account_id, up) VALUES ($1, $2, $3)",
        [spot_id, account_id, up]
      );
    }

    const spot = await getSpot(spot_id);

    res.status(200).json(spot);
  } catch (error) {
    res.status(400).json({ error });
  }
});

module.exports = router;
