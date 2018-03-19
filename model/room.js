'use strict'
const _ = require('lodash')
const defaultConfig = require('../config/gameworld')
const gameEvents = require('../constants/events')
const GameWorld = require('../managers/gameworld')
const GAME_STATE = require('../constants/gamestate')

module.exports = class {
    constructor(io, name, roomID) {
        this.io = io
        this.name = name
        this.roomID = roomID
        this.gameWorld = new GameWorld(this.io.to(this.roomID), defaultConfig)
    }

    addPlayer(player) {
        this.gameWorld.players[player.playerID] = player
    }

    removePlayer(playerID) {
        delete this.gameWorld.players[playerID]
        if(!this.isRoomFull() && this.gameWorld.getState() === GAME_STATE.COUNTDOWN) {
            this.gameWorld.setState(GAME_STATE.OPEN)
        }
    }

    getPlayers() {
        return this.gameWorld.players
    }

    getPlayer(playerID) {
        return this.gameWorld.players[playerID]
    }

    isRoomFull() {
        return _.size(this.getPlayers()) === this.gameWorld.getMaxPlayers()
    }
}