'use strict'
const _ = require('lodash')
const DEFAULT_CONFIG = require('../config/gameworld')
const gameEvents = require('../constants/events')
const GameWorld = require('../managers/gameworld')
const GAME_STATE = require('../constants/gamestate')

module.exports = class {
    constructor(io, name, roomID) {
        this.io = io
        this.name = name
        this.roomID = roomID
        this.gameWorld = new GameWorld(this.io.to(this.roomID), DEFAULT_CONFIG)
    }

    addPlayer(player) {
        this.gameWorld.players[player.playerID] = player
    }

    removePlayer(playerID) {
        delete this.gameWorld.players[playerID]

        if (!this.isFull() && this.gameWorld.isCountdown()) {
            this.gameWorld.setState(GAME_STATE.OPEN)
        }

        if (this.isEmpty()) {
            this.gameWorld.reset()
        }
    }

    getPlayers() {
        return this.gameWorld.players
    }

    getPlayer(playerID) {
        return this.gameWorld.players[playerID]
    }

    isFull() {
        return _.size(this.getPlayers()) === this.gameWorld.getMaxPlayers()
    }

    isEmpty() {
        return _.size(this.getPlayers()) === 0
    }
}