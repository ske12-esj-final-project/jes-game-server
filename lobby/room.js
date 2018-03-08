'use strict'
const _ = require('lodash')

module.exports = class {

    constructor(name, gameWorld) {
        this.name = name;
        this.gameWorld = gameWorld;
    }

    addPlayer(playerID) {
        let player = _.find(this.gameWorld.players, 'playerID', playerID)
        this.gameWorld.players.push(player);
        console.log('Player', playerID, 'has joined', this.name)
    }

    removePlayer() {
        _.remove(this.gameWorld.players, player => player.playerID === this.socket.playerID)
    }
}