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

    // Return error if no results are found
    if (response.data.status !== "OK") {
      return console.log("GOOGLE 'geocode' ERROR: place not found");
    }

    // Extract search address for getPOI function
    const { address_components, ...place } = response.data.results[0];
    const types = ["country", "administrative_area_level_1", "locality"];
    let formatted_address = [];

    address_components.forEach((comp) => {
      types.forEach((type) => {
        if (comp.types.includes(type)) {
          formatted_address.push(comp.short_name);
        }
      });
    });

    formatted_address = formatted_address.join(", ");

    return { ...place, formatted_address };
  } catch (error) {
    console.log("GOOGLE 'geocode' ERROR:", error.message);
  }
};

const reverseGeocode = async (latlng) => {
  const endpoint = "geocode/json";

  const url = `${cors}/${api}/${endpoint}?key=${key}&latlng=${latlng}`;
  try {
    const response = await axios.get(url);
    return response.data.results[0];
  } catch (error) {
    console.log("GOOGLE 'geocode' ERROR:", error.message);
  }
};

const getPOI = async (search_address, { lat, lng }) => {
  const endpoint = "place/nearbysearch/json";

  const type = "tourist_attraction";
  const radius = "50000";
  const keyword = `things to do in ${encodeURI(search_address)}`;

  const url = `${cors}/${api}/${endpoint}?key=${key}&location=${lat},${lng}&keyword=${keyword}&radius=${radius}&type=${type}`;

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

module.exports = { geocode, reverseGeocode, getPOI, getReviews };
