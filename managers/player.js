const _ = require('lodash')
const gameEvents = require('../constants/events')
const WEAPON = require('../constants/weapon')
module.exports = class {
    constructor(socket, gameWorld) {
        this.socket = socket
        this.gameWorld = gameWorld
        this.playerID = null
        console.log('player-class')

        this.init()

        this.socketHandler(socket)
    }

    socketHandler(socket) {
        socket.on(gameEvents.playerNewPlayer, this.newPlayer.bind(this))
        socket.on(gameEvents.playerMovement, this.movement.bind(this))
        socket.on(gameEvents.playerUpdateRotation, this.rotation.bind(this))
        socket.on(gameEvents.playerAttack, this.playerShoot.bind(this))
        socket.on(gameEvents.checkShootHit, this.checkShootHit.bind(this))
    }

    init() {
        this.weapon = WEAPON.BASIC_GUN
        this.rotate = {
            x: null,
            y: null
        }
        this.hp = 100
    }

    newPlayer(user_name) {
        let username = user_name.username
        console.log('created - new player', username)
        this.playerID = this.socket.playerID
        this.x = this.randomInt(-32, 32)
        this.y = 1
        this.z = this.randomInt(-32, 32)
        this.username = username || "anonymous"
        this.gameWorld.players.push(this)


        let currentPlayerData = this.getPlayerSendData(this)

        // Create the player in the game
        /**
         * index 0 : player
         * index 1 : enemies
         */
        let getAllEnemiesData = this.getAllPlayerSendData(this.getAllEnemies())
        console.log('getAllEnemiesData', getAllEnemiesData)
        console.log('currentPlayerData', currentPlayerData)
        // if(getAllEnemiesData.length==0) return
        this.socket.emit(gameEvents.playerCreated, { d: [currentPlayerData, getAllEnemiesData] })
        // Send the info of the new player to other gamers!
        this.socket.broadcast.emit(gameEvents.playerEnemyCreated, { d: currentPlayerData })
        console.log('send-complete')
    }

    deletePlayer() {
        _.remove(this.gameWorld.players, player => player.playerID === this.socket.playerID)
    }

    randomInt(low, high) {
        return Math.floor(Math.random() * (high - low) + low);
    }

    rotation(data) {
        if (!this.playerID) return
        let jsonData = JSON.parse(data["d"])
        this.rotate = {
            w: jsonData[0],
            x: jsonData[1],
            y: jsonData[2],
            z: jsonData[3]
        }
        // console.log('r',jsonData)
    }

    playerShoot(data) {
        console.log('shoot', data)
        let sendToOther = {
            "d": [
                this.playerID
            ]
        }
        this.socket.broadcast.emit(gameEvents.enemyShoot, sendToOther)
    }

    checkShootHit(data) {
        console.log('check-hit-data', data)

        let sendToSelf = {
            "d": [
                this.hp
            ]
        }

        let sendToOther = {
            "d": [
                this.playerID,
                this.hp
            ]
        }
        this.socket.emit(gameEvents.playerUpdateStatus, sendToSelf)
        this.socket.broadcast.emit(gameEvents.enemyUpdateStatus, sendToOther)

    }

    movement(data) {
        if (!this.playerID) return
        let jsonData = JSON.parse(data["d"])
        this.x = parseFloat(jsonData[0])
        this.y = parseFloat(jsonData[1])
        this.z = parseFloat(jsonData[2])
        // console.log('m',jsonData)
        // const playerSpeed = 16
        // // console.log('playerMovement', directions, this.socket.playerID)
        // let point1 = {
        //     x: 0,
        //     y: 0
        // }
        // let point2 = {
        //     x: directions[0],
        //     y: directions[1]
        // }
        // let angleRadians = this.getAngleRadians(point1, point2)

        // this.x += parseInt((playerSpeed * Math.cos(angleRadians) * Math.abs(directions[0])))
        // this.y += parseInt((playerSpeed * Math.sin(angleRadians) * Math.abs(directions[1])))


    }

    updatePostionToClient() {
        let currentMove = {
            x: this.x,
            y: this.y,
            z: this.z
        }
        if (_.isEqual(this.lastMove, currentMove)) return
        this.lastMove = {
            x: this.x,
            y: this.y,
            z: this.z
        }
        let sendToPlayer = [this.x, this.y, this.z]
        let sendToOther = [
            this.playerID,
            this.x,
            this.y,
            this.z
        ]
        this.socket.emit(gameEvents.playerUpdatePosition, { d: sendToPlayer })

        this.socket.broadcast.emit(gameEvents.playerEnemyUpdatePosition, { d: sendToOther })

    }

    updateRotationToClient() {
        if (this.rotate.x == null || this.rotate.y == null) return
        let currentrotate = {
            w: this.rotate.w,
            x: this.rotate.x,
            y: this.rotate.y,
            z: this.rotate.z
        }
        if (_.isEqual(this.lastrotate, currentrotate)) return
        this.lastrotate = {
            w: this.rotate.w,
            x: this.rotate.x,
            y: this.rotate.y,
            z: this.rotate.z
        }

        let sendToOther = [
            this.playerID,
            this.rotate.w,
            this.rotate.x,
            this.rotate.y,
            this.rotate.z
        ]

        this.socket.broadcast.emit(gameEvents.playerUpdateRotation, { d: sendToOther })

    }

    getAllPlayerSendData(players) {
        return _.map(players, (player) => this.getPlayerSendData(player))
    }

    getPlayerSendrotateData(player) {
        return [
            this.playerID,
            this.rotate.x,
            ths.rotate.y
        ]
    }

    getPlayerSendData(player) {
        return [
            player.playerID,
            player.x,
            player.y,
            player.z,
            player.username,
            player.weapon
        ]
    }

    getAngleRadians(p1, p2) {
        return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    }

    getAllEnemies() {
        return _.filter(this.gameWorld.players, player => player.playerID !== this.socket.playerID)
    }
}