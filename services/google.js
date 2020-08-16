const axios = require("axios");

// remove in prod
axios.defaults.headers.common["Origin"] = "X-Requested-With";

const cors = "http://localhost:8080";
// const cors = "https://cors-anywhere.herokuapp.com";
const api = "https://maps.googleapis.com/maps/api";
const key = process.env.GOOGLE_API_KEY;

const geocode = async (place_id) => {
  const endpoint = "geocode/json";

  const url = `${cors}/${api}/${endpoint}?key=${key}&place_id=${place_id}`;
  try {
    const response = await axios.get(url);
    return response.data.results[0];
  } catch (error) {
    console.log("GOOGLE 'geocode' ERROR:", error.message);
  }
};

const getPOI = async (name, { lat, lng }) => {
  const endpoint = "place/nearbysearch/json";

  const type = "tourist_attraction";
  const radius = "50000";
  const rankby = "prominence";
  const keyword = `things to do in ${name}`;

  const url = `${cors}/${api}/${endpoint}?key=${key}&location=${lat},${lng}&keyword=${keyword}&radius=${radius}&rankby=${rankby}&type=${type}`;

  try {
    const response = await axios.get(url);
    return response.data.results;
  } catch (error) {
    console.log("GOOGLE 'get POI' ERROR:", error.message);
  }
};

const getReviews = async (place_id) => {
  const endpoint = "place/details/json";

  const url = `${cors}/${api}/${endpoint}?key=${key}&place_id=${place_id}&fields=reviews`;

  try {
    const response = await axios.get(url);
    return response.data.result.reviews;
  } catch (error) {
    console.log("GOOGLE 'get POI' ERROR:", error.message);
  }
};

module.exports = { geocode, getPOI, getReviews };
