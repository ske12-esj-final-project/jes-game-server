const _ = require('lodash')
const gameEvents = require('../constants/events')
const WEAPON = require('../data/equitments')
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
        socket.on(gameEvents.playerSetupPlayer, this.setupPlayer.bind(this))
        socket.on(gameEvents.playerMovement, this.movement.bind(this))
        socket.on(gameEvents.playerUpdateRotation, this.rotation.bind(this))
        socket.on(gameEvents.playerAttack, this.playerShoot.bind(this))
        socket.on(gameEvents.checkShootHit, this.checkShootHit.bind(this))
        socket.on(gameEvents.updateCurrentEquitment, this.updateCurrentEquitment.bind(this))
        socket.on(gameEvents.getEquitment, this.getEquitment.bind(this))
    }

    init() {
        this.currentEquitment = WEAPON.ARM.Index
        this.rotate = {
            x: null,
            y: null
        }
        this.hp = 100
    }

    setupPlayer(data) {
        console.log('setupPlayer')
        // data['d'] = data['d'].replace(/@/g, "\"")
        // let jsonData = JSON.parse(data["d"])
        // this.playerID = jsonData[0]
        // let player = _.find(this.gameWorld.players, 'playerID', this.playerID)
        // let currentPlayerData = this.getPlayerInitData(player)

        // // Create the player in the game
        // /**
        //  * index 0 : player
        //  * index 1 : enemies
        //  */
        // let getAllEnemiesData = this.getAllPlayerSendData(this.getAllEnemies())
        // console.log('getAllEnemiesData', getAllEnemiesData)
        // console.log('currentPlayerData', currentPlayerData)
        // this.socket.emit(gameEvents.playerCreated, { d: [currentPlayerData, getAllEnemiesData] })
        // // Send the info of the new player to other gamers!
        // this.socket.broadcast.emit(gameEvents.playerEnemyCreated, { d: currentPlayerData })
        // console.log('send-complete')
    }

    removeEquitmentInClient(data) {

    }

    getEquitment(data) {
        data['d'] = data['d'].replace(/@/g, "\"")
        console.log('get-equiment', data)
        let jsonData = JSON.parse(data["d"])
        if (jsonData.length >= 1) {
            let weaponID = jsonData[0]
            // asign to player
            // remove from list
            _.remove(this.gameWorld.equitments, item => item.uid === weaponID)
            // update to all
            // this.gameWorld.updateWeaponInMap()
            this.gameWorld.sendRemoveWeapon(weaponID)
        } else {
            console.error('[error]-checkShootHit wrong data pattern', data)
        }
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
            x: jsonData[0],
            y: jsonData[1]
        }
        // console.log('r',this.rotate)
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
        data['d'] = data['d'].replace(/@/g, "\"")
        let jsonData = JSON.parse(data["d"])
        console.log('check-hit-data', jsonData)
        let targetId, dmg
        if (jsonData.length >= 2) {
            targetId = jsonData[0]
            dmg = jsonData[1]
        } else {
            console.error('[error]-checkShootHit wrong data pattern', data)
        }

        let targetEnemy = _.find(this.gameWorld.players, { playerID: targetId })

        if (targetEnemy) {
            targetEnemy.hp -= dmg
            let sendToOther = {
                "d": [
                    targetId,
                    this.playerID,
                    targetEnemy.hp
                ]
            }
            console.log('checkShoothit-senddata', sendToOther)
            this.gameWorld.io.emit(gameEvents.updatePlayersStatus, sendToOther)

        } else {
            console.log('no enemy shooted in this game')
        }
    }

    updateCurrentEquitment(data) {
        data['d'] = data['d'].replace(/@/g, "\"")
        let jsonData = JSON.parse(data["d"])
        console.log('updateCurrentEquitment-get', jsonData)
        let playerID = jsonData[0]
        let weaponIndex = jsonData[1]
        this.currentEquitment = weaponIndex
        console.log('updateCurrentEquitment-send to other', { d: this.getCurrentEquitment(this) })
        let sendToOther =
            this.socket.broadcast.emit(gameEvents.updateCurrentEquitment, { d: this.getCurrentEquitment(this) })
    }

    movement(data) {
        if (!this.playerID) return
        let jsonData = JSON.parse(data["d"])
        this.x = parseFloat(jsonData[0])
        this.y = parseFloat(jsonData[1])
        this.z = parseFloat(jsonData[2])
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
            x: this.rotate.x,
            y: this.rotate.y
        }
        if (_.isEqual(this.lastrotate, currentrotate)) return
        this.lastrotate = {
            x: this.rotate.x,
            y: this.rotate.y
        }

        let sendToOther = [
            this.playerID,
            this.rotate.x,
            this.rotate.y
        ]
        this.socket.broadcast.emit(gameEvents.playerUpdateRotation, { d: sendToOther })

    }

    getAllPlayerSendData(players) {
        return _.map(players, (player) => this.getPlayerInitData(player))
    }

    getPlayerSendrotateData(player) {
        return [
            this.playerID,
            this.rotate.x,
            ths.rotate.y
        ]
    }

    getCurrentEquitment(player) {
        return [
            player.playerID,
            player.currentEquitment
        ]

    }

    getPlayerInitData(player) {
        return [
            player.playerID,
            player.x,
            player.y,
            player.z,
            player.username,
            player.currentEquitment
        ]
    }

    getAngleRadians(p1, p2) {
        return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    }

    getAllEnemies() {
        console.log(this.gameWorld.players);
        return _.filter(this.gameWorld.players, (player) => player.playerID !== this.socket.playerID)
    }
}