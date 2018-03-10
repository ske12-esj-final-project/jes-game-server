const _ = require('lodash')
const gameEvents = require('../constants/events')
const Mediator = require('./mediator')
const WEAPON = require('../data/equipments')

module.exports = class {
    constructor(socket) {
        this.socket = socket
        this.socketHandler(socket)

        setInterval(() => {
            this.updatePostionToClient()
            this.updateRotationToClient()
        }, this.timeout || 1000 / 60)
    }

    socketHandler(socket) {
        socket.on(gameEvents.playerSetupPlayer, this.setupPlayer.bind(this))
        socket.on(gameEvents.playerMovement, this.movement.bind(this))
        socket.on(gameEvents.playerUpdateRotation, this.rotation.bind(this))
        socket.on(gameEvents.playerAttack, this.playerShoot.bind(this))
        socket.on(gameEvents.checkShootHit, this.checkShootHit.bind(this))
        socket.on(gameEvents.updateCurrentEquipment, this.updateCurrentEquipment.bind(this))
        socket.on(gameEvents.getEquipment, this.getEquipment.bind(this))
    }

    setupPlayer(data) {
        data['d'] = data['d'].replace(/@/g, "\"")
        let jsonData = JSON.parse(data["d"])
        this.player = Mediator.getInstance().players[jsonData[0]]
        this.player.x = 0
        this.player.y = 0
        this.player.z = 0
        let currentPlayerData = this.getPlayerInitData(this.player)

        // Create the player in the game
        /**
         * index 0 : player
         * index 1 : enemies
         */
        let getAllEnemiesData = this.getAllPlayerSendData(this.getAllEnemies())
        console.log('getAllEnemiesData', getAllEnemiesData)
        console.log('currentPlayerData', currentPlayerData)
        this.socket.emit(gameEvents.playerCreated, { d: [currentPlayerData, getAllEnemiesData] })
        // Send the info of the new player to other gamers!
        this.socket.broadcast.emit(gameEvents.playerEnemyCreated, { d: currentPlayerData })
        console.log('send-complete')
    }

    removeEquipmentInClient(data) {

    }

    getEquipment(data) {
        data['d'] = data['d'].replace(/@/g, "\"")
        console.log('get-equiment', data)
        let jsonData = JSON.parse(data["d"])
        if (jsonData.length >= 1) {
            let weaponID = jsonData[0]
            let room = this.player.currentRoom
            _.remove(room.gameWorld.equipments, item => item.uid === weaponID)
            // update to all
            room.gameWorld.sendRemoveWeapon(weaponID)
            this.socket.emit(gameEvents.getEquipment, { d: [weaponID] })
        }
        else {
            console.error('[error]-checkShootHit wrong data pattern', data)
        }
    }

    randomInt(low, high) {
        return Math.floor(Math.random() * (high - low) + low);
    }

    rotation(data) {
        if (!this.player.playerID) return
        let jsonData = JSON.parse(data["d"])
        this.player.rotate = {
            x: jsonData[0],
            y: jsonData[1]
        }
    }

    playerShoot(data) {
        console.log('shoot', data)
        let sendToOther = {
            "d": [
                this.player.playerID
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
                    this.player.playerID,
                    targetEnemy.hp
                ]
            }
            console.log('checkShoothit-senddata', sendToOther)
            this.gameWorld.io.emit(gameEvents.updatePlayersStatus, sendToOther)

        } else {
            console.log('no enemy shooted in this game')
        }
    }

    updateCurrentEquipment(data) {
        data['d'] = data['d'].replace(/@/g, "\"")
        let jsonData = JSON.parse(data["d"])
        console.log('updateCurrentEquipment-get', jsonData)
        let playerID = jsonData[0]
        let weaponIndex = jsonData[1]
        this.player.currentEquipment = weaponIndex
        console.log('updateCurrentEquipment-send to other', { d: this.getCurrentEquipment(this.player) })
        let sendToOther =
            this.socket.broadcast.emit(gameEvents.updateCurrentEquipment, { d: this.getCurrentEquipment(this.player) })
    }

    movement(data) {
        if (!this.player.playerID) return
        let jsonData = JSON.parse(data["d"])
        this.player.x = parseFloat(jsonData[0])
        this.player.y = parseFloat(jsonData[1])
        this.player.z = parseFloat(jsonData[2])
    }

    updatePostionToClient() {
        if (!this.player) return;
        let currentMove = {
            x: this.player.x,
            y: this.player.y,
            z: this.player.z
        }
        if (_.isEqual(this.lastMove, currentMove)) return
        this.lastMove = {
            x: this.player.x,
            y: this.player.y,
            z: this.player.z
        }
        let sendToPlayer = [this.player.x, this.player.y, this.player.z]
        let sendToOther = [
            this.player.playerID,
            this.player.x,
            this.player.y,
            this.player.z
        ]
        this.socket.emit(gameEvents.playerUpdatePosition, { d: sendToPlayer })

        this.socket.broadcast.emit(gameEvents.playerEnemyUpdatePosition, { d: sendToOther })

    }

    updateRotationToClient() {
        if (!this.player) return;
        if (this.player.rotate.x == null || this.player.rotate.y == null) return
        let currentrotate = {
            x: this.player.rotate.x,
            y: this.player.rotate.y
        }
        if (_.isEqual(this.lastrotate, currentrotate)) return
        this.lastrotate = {
            x: this.player.rotate.x,
            y: this.player.rotate.y
        }

        let sendToOther = [
            this.player.playerID,
            this.player.rotate.x,
            this.player.rotate.y
        ]
        this.socket.broadcast.emit(gameEvents.playerUpdateRotation, { d: sendToOther })

    }

    getAllPlayerSendData(players) {
        return _.map(players, (player) => this.getPlayerInitData(player))
    }

    getPlayerSendRotateData(player) {
        return [
            player.playerID,
            player.rotate.x,
            player.rotate.y
        ]
    }

    getCurrentEquipment(player) {
        return [
            player.playerID,
            player.currentEquipment
        ]

    }

    getPlayerInitData(player) {
        return [
            player.playerID,
            player.x,
            player.y,
            player.z,
            player.username,
            player.currentEquipment
        ]
    }

    getAngleRadians(p1, p2) {
        return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    }

    getAllEnemies() {
        return _.pickBy(Mediator.getInstance().players, (value, key) => {
            return key != this.player.playerID
        })
    }
}