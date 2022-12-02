const logAndDie = (message) => {
  console.log(message);
  process.exit(0);
}

module.exports = {
  logAndDie
};