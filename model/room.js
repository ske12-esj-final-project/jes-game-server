'use strict'
const _ = require('lodash')
const defaultConfig = require('../config/gameworld')
const gameEvents = require('../constants/events')
const GameWorld = require('../managers/gameworld')
const ROOM_STATE = require('../constants/roomstate')

module.exports = class {
    constructor(io, name, roomID) {
        this.io = io
        this.name = name
        this.roomID = roomID
        this.gameWorld = new GameWorld(this.io.to(this.roomID), defaultConfig)

        this.currentState = ROOM_STATE.OPEN
    }

    addPlayer(player) {
        this.gameWorld.players[player.playerID] = player
        console.log('Player', player.playerID, 'has joined', this.name)
    }

    removePlayer(playerID) {
        delete this.gameWorld.players[playerID]
        console.log('Gameworld', this.roomID)
    }

    getPlayers() {
        return this.gameWorld.players
    }

    getPlayer(playerID) {
        return this.gameWorld.players[playerID]
    }

    setState(newState) {
        this.currentState = newState
    }

    getState() {
        return this.currentState
    }
}