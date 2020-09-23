const setCors = (api) => {
  if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
    return `http://localhost:8080/${api}`;
  } else {
    return api;
  }
};

module.exports = { setCors };
