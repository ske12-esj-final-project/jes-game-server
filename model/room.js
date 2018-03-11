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
        this.gameWorld = new GameWorld(gameWorldConfig)
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

    onCountdown() {
        console.log('Countdown started')
        let timeLeft = 10
        let countDownInterval = setInterval(() => {
            timeLeft -= 1
            console.log('Match will start in', timeLeft)
            this.io.to(this.roomID).emit(gameEvents.countdown, { d: [timeLeft] })
            if (timeLeft <= 0) clearInterval(countDownInterval)
        }, 1000)
    }
}