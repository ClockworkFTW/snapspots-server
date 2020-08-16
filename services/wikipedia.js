const axios = require("axios");

// remove in prod
axios.defaults.headers.common["Origin"] = "X-Requested-With";

const cors = "http://localhost:8080";
// const cors = "https://cors-anywhere.herokuapp.com";
const api = "https://en.wikipedia.org/api/rest_v1";

const getExtract = async (name) => {
  const endpoint = "page/summary";
  const title = encodeURI(
    name
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("_")
  );

  try {
    const result = await axios.get(`${cors}/${api}/${endpoint}/${title}`);

    return result.data.type === "standard" ? result.data.extract : null;
  } catch (error) {
    console.log("WIKIPEDIA 'get extract' ERROR:", error.message);
    return null;
  }
};

module.exports = { getExtract };
