const axios = require("axios");

const { setCors } = require("../util");

// remove in prod
axios.defaults.headers.common["Origin"] = "X-Requested-With";

const api = "api.openweathermap.org/data/2.5";
const key = process.env.WEATHER_API_KEY;

const getForecast = async (lat, lon) => {
  const endpoint = "onecall";

  // prettier-ignore
  const url = `${setCors(api)}/${endpoint}?lat=${lat}&lon=${lon}&units=imperial&appid=${key}`

  try {
    const result = await axios.get(url);

    return result.data.daily;
  } catch (error) {
    console.log("WEATHER 'get forecast' ERROR:", error.message);
  }
};

module.exports = { getForecast };
