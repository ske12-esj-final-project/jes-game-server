'use strict'
const _ = require('lodash')
const gameWorldConfig = require('../config/gameworld')
const gameEvents = require('../constants/events')
const GameWorld = require('../managers/gameworld')

module.exports = class {

    constructor(io, name, roomID) {
        this.io = io
        this.name = name
        this.roomID = roomID
        this.gameWorld = new GameWorld(this.io.to(this.roomID), gameWorldConfig)
    }

    addPlayer(player) {
        // this.randomInt(-250, 250), 500, this.randomInt(-250, 200)
        this.gameWorld.players.push(player)
        console.log('Player', player.playerID, 'has joined', this.name)
    }

    removePlayer() {
        _.remove(this.gameWorld.players, player => player.playerID === this.socket.playerID)
    }

    getPlayers() {
        return this.gameWorld.players
    }
}