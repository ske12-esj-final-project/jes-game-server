const _ = require('lodash')
const gameEvents = require('../constants/events')
module.exports = class {
    constructor(socket, gameWorld) {
        this.socket = socket
        this.gameWorld = gameWorld
        this.playerID = null

        socket.on(gameEvents.playerNewPlayer, this.newPlayer.bind(this))
        socket.on(gameEvents.playerMovement, this.movement.bind(this))
    }

    newPlayer(username) {
        console.log('created - new player')
        this.playerID = this.socket.playerID
        this.x = this.randomInt(100, 400)
        this.y = 200
        this.username = username || "anonymous"
        this.gameWorld.players.push(this)

        let currentPlayerData = [
            this.playerID,
            this.x,
            this.y,
            this.username
        ]

        // Create the player in the game
        /**
         * index 0 : player
         * index 1 : enemies
         */
        let getAllEnemiesData = this.getAllPlayerSendData(this.getAllEnemies())
        console.log('getAllEnemiesData', getAllEnemiesData)
        this.socket.emit(gameEvents.playerCreated, [
            currentPlayerData, getAllEnemiesData
        ])
        // Send the info of the new player to other gamers!
        this.socket.broadcast.emit(gameEvents.playerEnemyCreated, currentPlayerData)
    }

    deletePlayer() {
        _.remove(this.gameWorld.players, player => player.playerID === this.socket.playerID)
    }

    randomInt(low, high) {
        return Math.floor(Math.random() * (high - low) + low);
    }

    movement(directions = [0, 0]) {
        if (!this.playerID) return
        const playerSpeed = 16
        // console.log('playerMovement', directions, this.socket.playerID)
        let point1 = {
            x: 0,
            y: 0
        }
        let point2 = {
            x: directions[0],
            y: directions[1]
        }
        let angleRadians = this.getAngleRadians(point1, point2)

        this.x += parseInt((playerSpeed * Math.cos(angleRadians) * Math.abs(directions[0])))
        this.y += parseInt((playerSpeed * Math.sin(angleRadians) * Math.abs(directions[1])))


    }

    updatePostionToClient() {
        let currentMove = {
            x: this.x,
            y: this.y
        }
        if (_.isEqual(this.lastMove, currentMove)) return
        this.lastMove = {
            x: this.x,
            y: this.y
        }
        let sendToPlayer = [this.x, this.y]
        let sendToOther = [
            this.playerID,
            this.x,
            this.y
        ]
        this.socket.emit(gameEvents.playerUpdatePosition, sendToPlayer)
        this.socket.broadcast.emit(gameEvents.playerEnemyUpdatePosition, sendToOther)

    }

    getAllPlayerSendData(players) {
        return _.map(players, (player) => this.getPlayerSendData(player))
    }

    getPlayerSendData(player) {
        return [
            player.playerID,
            player.x,
            player.y,
            player.username
        ]
    }

    getAngleRadians(p1, p2) {
        return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    }

    getAllEnemies() {
        return _.filter(this.gameWorld.players, player => player.playerID !== this.socket.playerID)
    }
}