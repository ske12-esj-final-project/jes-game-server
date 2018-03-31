const _ = require("lodash")
const getRandomInt = (max) => {
    return Math.floor(Math.random() * Math.floor(max));
}
const sumList = (list) => {
    return _.map(list).reduce((a, b) => a + b, 0);
  }
module.exports = {
    getRandomInt,
    sumList
}