const axios = require("axios");

const baseURL = "https://www.flickr.com/services/rest";
const api_key = process.env.FLICKR_API_KEY;
const format = "format=json&nojsoncallback=1";

const getPhotos = async (name, { lat, lng }) => {
  const method = "flickr.photos.search";

  const text = encodeURI(name);
  const sort = "relevance";
  const per_page = "10";

  try {
    const response = await axios.get(
      `${baseURL}?method=${method}&api_key=${api_key}&text=${text}&lat=${lat}&lon=${lng}&sort=${sort}&per_page=${per_page}&${format}`
    );

    return response.data.photos.photo.map((photo) => {
      const src = `https://farm${photo.farm}.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`;
      return src;
    });
  } catch (error) {
    console.log("FLICKR 'get photos' ERROR:", error.message);
    return null;
  }
};

const getInfo = async (photo_id) => {
  const method = "flickr.photos.getInfo";

  try {
    const response = await axios.get(
      `${baseURL}?method=${method}&api_key=${api_key}&photo_id=${photo_id}&${format}`
    );
    return response.data.photo;
  } catch (error) {
    console.log("FLICKR 'get info' ERROR:", error.message);
  }
};

module.exports = { getPhotos, getInfo };
