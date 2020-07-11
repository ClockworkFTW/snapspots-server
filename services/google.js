const axios = require("axios");

// remove in prod
axios.defaults.headers.common["Origin"] = "X-Requested-With";

const cors = "https://cors-anywhere.herokuapp.com";
const api = "https://maps.googleapis.com/maps/api";
const key = process.env.GOOGLE_API_KEY;

const geocode = async (place_id) => {
  const endpoint = "geocode/json";

  const url = `${cors}/${api}/${endpoint}?key=${key}&place_id=${place_id}`;
  try {
    const response = await axios.get(url);
    return response.data.results[0].geometry.location;
  } catch (error) {
    return error;
  }
};

const getPOI = async ({ lat, lng }) => {
  const endpoint = "place/nearbysearch/json";

  const type = "tourist_attraction";
  const radius = "50000";

  const url = `${cors}/${api}/${endpoint}?key=${key}&location=${lat},${lng}&radius=${radius}&type=${type}`;

  try {
    const response = await axios.get(url);
    return response.data.results;
  } catch (error) {
    console.log(error);
  }
};

module.exports = { geocode, getPOI };
