const router = require("express").Router();

const google = require("../services/google");
const flickr = require("../services/flickr");

router.get("/:place_id", async (req, res) => {
  try {
    const { place_id } = req.params;

    const location = await google.geocode(place_id);

    const POI = await google.getPOI(location);

    const geoJSON = await Promise.all(
      POI.map(async (place) => {
        let photos = await flickr.getPhotos(
          place.name,
          place.geometry.location
        );

        photos = await Promise.all(
          photos.map(async (photo) => {
            const info = await flickr.getInfo(photo.id);

            return { ...photo, ...info };
          })
        );

        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [
              place.geometry.location.lng,
              place.geometry.location.lat,
            ],
          },
          properties: {
            id: place.id,
            name: place.name,
            photos,
          },
        };
      })
    );

    res.status(200).json({ coords: [location.lng, location.lat], geoJSON });
  } catch (error) {
    res.status(400).json({ error });
  }
});

module.exports = router;
