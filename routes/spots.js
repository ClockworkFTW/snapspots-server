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
  const { latitude, longitude } = spot;
  const forecast = await weather.getForecast(latitude, longitude);

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
    // get search area coordinates based off google place id
    const area = await google.geocode(req.params.place_id);
    // prettier-ignore
    const { geometry: { location: {lat, lng} }, formatted_address} = area;

    // get custom spots within 50,000 meter radius
    const r = 0.45045;
    const bounds = [lat + r, lat - r, lng + r, lng - r];

    let customSpots = await pool.query(
      "SELECT * FROM spots WHERE (latitude <= $1 AND latitude >= $2 AND longitude <= $3 AND longitude >= $4)",
      bounds
    );

    // Convert custom spots to geoJSON format
    customSpots = customSpots.rows.map((spot) => {
      // Destructure properties
      const { lat, lng, ...properties } = spot;

      // Return formatted object
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },
        properties,
      };
    });

    // Get places of interest within 50,000 meters
    const POI = await google.getPOI(formatted_address, { lat, lng });

    // Convert discovered spots to geoJSON format
    let discoveredSpots = await Promise.all(
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

    // Filter out discovered spots without photos and duplicate custom spots
    discoveredSpots = discoveredSpots.filter((discoveredSpot) => {
      const hasPhotos = discoveredSpot.properties.photos.length !== 0;
      let duplicate = false;

      customSpots.forEach((customSpot) => {
        if (
          discoveredSpot.properties.place_id === customSpot.properties.place_id
        ) {
          duplicate = true;
        }
      });

      return hasPhotos && !duplicate ? true : false;
    });

    // Merge spots
    const spots = {
      coords: [lng, lat],
      geoJSON: [...customSpots, ...discoveredSpots],
    };

    res.status(200).json(spots);
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
        "INSERT INTO spots (account_id, name, description, keywords, type, equipment, time, photos, latitude, longitude, created_on) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *",
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

    // Get forecast
    const { latitude, longitude } = data;
    const forecast = await weather.getForecast(latitude, longitude);

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
