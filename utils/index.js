const _ = require("lodash")

const getRandomInt = (max) => {
    return Math.floor(Math.random() * Math.floor(max));
}

const sumList = (list) => {
    return _.map(list).reduce((a, b) => a + b, 0);
}

const calculateScore = (player) => {
    let world = player.currentRoom.gameWorld
    return (50 * player.numberOfKill) + 10 * (world.getMaxPlayers() - _.size(world.getAlivePlayers()))
}

module.exports = {
    getRandomInt,
    sumList,
    calculateScore
}