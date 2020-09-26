const axios = require("axios");

// remove in prod
axios.defaults.headers.common["Origin"] = "X-Requested-With";

const cors = "https://cors-anywhere-jnb.herokuapp.com";
const api = "api.openweathermap.org/data/2.5";
const key = process.env.WEATHER_API_KEY;

const getForecast = async (lat, lon) => {
  const endpoint = "onecall";

  try {
    const result = await axios.get(
      `${cors}/${api}/${endpoint}?lat=${lat}&lon=${lon}&units=imperial&appid=${key}`
    );

    return result.data.daily;
  } catch (error) {
    console.log("WEATHER 'get forecast' ERROR:", error.message);
  }
};

module.exports = { getForecast };
