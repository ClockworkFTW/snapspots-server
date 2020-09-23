const axios = require("axios");

const { setCors } = require("../util");

// remove in prod
axios.defaults.headers.common["Origin"] = "X-Requested-With";

const api = "https://en.wikipedia.org/api/rest_v1";

const getExtract = async (name) => {
  const endpoint = "page/summary";
  const title = encodeURI(name);

  const url = `${setCors(api)}/${endpoint}/${title}`;

  try {
    const result = await axios.get(url);

    return result.data.type === "standard" ? result.data.extract : null;
  } catch (error) {
    // console.log("WIKIPEDIA 'get extract' ERROR:", error.message);
    return null;
  }
};

module.exports = { getExtract };
