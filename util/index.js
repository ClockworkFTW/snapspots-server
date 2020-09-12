const pool = require("../models/pool");

const google = require("../services/google");
const flickr = require("../services/flickr");
const weather = require("../services/weather");
const wikipedia = require("../services/wikipedia");

const getSpot = async (spot_id) => {
  // Get spot from database
  let spot = await pool.query("SELECT * FROM spots WHERE spot_id = $1", [
    spot_id,
  ]);
  spot = spot.rows[0];

  // Join reviews
  let reviews = await pool.query(
    "SELECT accounts.account_id, accounts.username, reviews.review_id, reviews.rating, reviews.comment, reviews.visited_on FROM accounts INNER JOIN reviews ON accounts.account_id = reviews.account_id WHERE reviews.spot_id = $1",
    [spot_id]
  );
  reviews = reviews.rows;

  // Get forecast
  const forecast = await weather.getForecast(spot.latitude, spot.longitude);

  return { ...spot, reviews, forecast };
};

const getSpots = async (place_id) => {
  // get search area coordinates based off google place id
  const area = await google.geocode(place_id);
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
  customSpots = await Promise.all(
    customSpots.rows.map(async (spot) => {
      // Destructure properties
      const { lat, lng, ...properties } = spot;

      // Join reviews
      let reviews = await pool.query(
        "SELECT accounts.account_id, accounts.username, reviews.review_id, reviews.rating, reviews.comment, reviews.visited_on FROM accounts INNER JOIN reviews ON accounts.account_id = reviews.account_id WHERE reviews.spot_id = $1",
        [properties.spot_id]
      );
      reviews = reviews.rows;

      // Return formatted spot
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },
        properties: { ...properties, reviews },
      };
    })
  );

  // Get places of interest within 50,000 meters
  const POI = await google.getPOI(formatted_address, { lat, lng });

  // Convert discovered spots to geoJSON format
  let discoveredSpots = await Promise.all(
    POI.map(async ({ place_id, name, geometry: { location } }) => {
      // get additional properties
      let description = await wikipedia.getExtract(name);
      let photos = await flickr.getPhotos(name, location);

      // return formatted spot
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

  return { coords: [lng, lat], geoJSON: [...customSpots, ...discoveredSpots] };
};

module.exports = { getSpot, getSpots };
