const env = require('dotenv');
env.config();

const getConfig = (schema) => {
  return schema.parse(process.env);
}

module.exports = {
  getConfig
};