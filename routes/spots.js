const router = require("express").Router();

const pool = require("../models/pool");

const { getSpot, getSpots } = require("../util");
const google = require("../services/google");
const flickr = require("../services/flickr");
const weather = require("../services/weather");
const wikipedia = require("../services/wikipedia");

router.get("/preview", async (req, res) => {
  try {
    let spots = await pool.query(
      "SELECT * FROM spots ORDER BY created_on DESC LIMIT 10"
    );
    spots = spots.rows;

    res.status(200).json(spots);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// router.get("/explore", async (req, res) => {
//   try {
//     const { zoom, cLat, cLng, neLat, neLng, swLat, swLng } = req.query;

//     const coords = [];

//     // If the map is zoomed in too far only include the center coordinates
//     if (zoom > 12) {
//       coords.push([cLat, cLng]);
//     }

//     // Otherwise, search in 10,000 square kilometer increments until the viewport is complete
//     else {
//       const metersPerDegLat = 110574.2727;
//       const metersPerDegLng = (lat) =>
//         Math.cos((Math.PI / 180) * lat) * metersPerDegLat;

//       let curLat = neLat - 50000 / metersPerDegLat;
//       let curLng = neLng - 50000 / metersPerDegLng(neLat);

//       while (curLat > swLat) {
//         coords.push([curLat, curLng]);

//         if (curLng < swLng) {
//           curLat = curLat - 100000 / metersPerDegLat;
//           curLng = neLng - 50000 / metersPerDegLng(curLat);
//         } else {
//           curLng = curLng - 100000 / metersPerDegLng(curLat);
//         }
//       }
//     }

//     // Get POI's withing each area
//     // ADD DYNAMIC RADIUS
//     let POI = await Promise.all(
//       coords.map((coord) => {
//         return google.getPOI(null, { lat: coord[0], lng: coord[1] });
//       })
//     );

//     // Filter places outside viewbox
//     POI = POI.flat().filter((place) => {
//       const { lat, lng } = place.geometry.location;
//       const withinLat = lat < neLat && lat > swLat;
//       const withinLng = lng < neLng && lng > swLng;
//       return withinLat && withinLng;
//     });

//     // Convert discovered spots to geoJSON format
//     let discoveredSpots = await Promise.all(
//       POI.map(async ({ place_id, name, geometry: { location } }) => {
//         // get additional properties
//         let description = await wikipedia.getExtract(name);
//         let photos = await flickr.getPhotos(name, location);

//         // return formatted spot
//         return {
//           type: "Feature",
//           geometry: {
//             type: "Point",
//             coordinates: [location.lng, location.lat],
//           },
//           properties: {
//             place_id,
//             name,
//             formatted_address: "placeholder",
//             description,
//             photos,
//           },
//         };
//       })
//     );

//     discoveredSpots = discoveredSpots.filter(
//       (spot) => spot.properties.photos.length !== 0
//     );

//     const bounds = [neLat, swLat, neLng, swLng];

//     let customSpots = await pool.query(
//       "SELECT * FROM spots WHERE (latitude <= $1 AND latitude >= $2 AND longitude <= $3 AND longitude >= $4)",
//       bounds
//     );

//     // Convert custom spots to geoJSON format
//     customSpots = await Promise.all(
//       customSpots.rows.map(async (spot) => {
//         // Destructure properties
//         const { lat, lng, ...properties } = spot;

//         // Join reviews
//         let reviews = await pool.query(
//           "SELECT accounts.account_id, accounts.username, reviews.review_id, reviews.rating, reviews.comment, reviews.visited_on FROM accounts INNER JOIN reviews ON accounts.account_id = reviews.account_id WHERE reviews.spot_id = $1",
//           [properties.spot_id]
//         );
//         reviews = reviews.rows;

//         // Return formatted spot
//         return {
//           type: "Feature",
//           geometry: {
//             type: "Point",
//             coordinates: [lng, lat],
//           },
//           properties: { ...properties, reviews },
//         };
//       })
//     );

//     const spots = {
//       coords: [cLng, cLat],
//       geoJSON: [...discoveredSpots, ...customSpots],
//     };

//     res.status(200).send(spots);
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// });

router.get("/:spot_id", async (req, res) => {
  try {
    const spot = await getSpot(req.params.spot_id);

    res.status(200).json(spot);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/search/:place_id", async (req, res) => {
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
