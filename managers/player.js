const _ = require('lodash')
const gameEvents = require('../constants/events')
const GameManager = require('./game')
const WEAPON = require('../data/equipments')

module.exports = class {
    constructor(socket, playerID, username) {
        this.socket = socket
        this.playerID = playerID
        this.username = username
        this.position = {
            x: null,
            y: null,
            z: null
        }
        this.rotate = {
            x: null,
            y: null
        }
        this.hp = 100
        this.currentRoom = null
        this.currentEquipment = 0
        this.socketHandler(socket)
    }

    socketHandler(socket) {
        socket.on(gameEvents.playerSetupPlayer, this.setupPlayer.bind(this))
        socket.on(gameEvents.startGame, this.startGame.bind(this))
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
        this.position = {
            x: 0,
            y: 0,
            z: 0
        }
        let currentPlayerData = this.getPlayerInitData(this)
        let getAllEnemiesData = this.getAllPlayerSendData(this.getAllEnemies())
        console.log('check---',{ d: [currentPlayerData, getAllEnemiesData] })
        this.socket.emit(gameEvents.playerCreated, { d: [currentPlayerData, getAllEnemiesData] })
        this.socket.broadcast.emit(gameEvents.playerEnemyCreated, { d: currentPlayerData })
    }

    startGame(data) {
        data['d'] = data['d'].replace(/@/g, "\"")
        let jsonData = JSON.parse(data["d"])
        this.position = {
            x: this.randomInt(-250, 250),
            y: 500,
            z: this.randomInt(-250, 200)
        }
        let currentPlayerData = this.getPlayerInitData(this)
        let getAllEnemiesData = this.getAllPlayerSendData(this.getAllEnemies())
        this.socket.emit(gameEvents.playerCreated, { d: [currentPlayerData, getAllEnemiesData] })
        this.socket.broadcast.emit(gameEvents.playerEnemyCreated, { d: currentPlayerData })
        let weaponsInMap = this.currentRoom.gameWorld.getUpdateWeaponInMap()
        console.log('send-weapon-data', weaponsInMap)
        this.socket.emit(gameEvents.setupEquipment, { d: weaponsInMap })
    }

    removeEquipmentInClient(data) {

    }

    getEquipment(data) {
        data['d'] = data['d'].replace(/@/g, "\"")
        console.log('get-equiment', data)
        let jsonData = JSON.parse(data["d"])
        if (jsonData.length >= 1) {
            let weaponID = jsonData[0]
            let room = this.currentRoom
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
        if (!this.playerID) return
        let jsonData = JSON.parse(data["d"])
        this.rotate = {
            x: jsonData[0],
            y: jsonData[1]
        }
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

        let targetEnemy = GameManager.getInstance().getPlayer(targetId)

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
            this.currentRoom.gameWorld.io.emit(gameEvents.updatePlayersStatus, sendToOther)

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
        this.currentEquipment = weaponIndex
        console.log('updateCurrentEquipment-send to other', { d: this.getCurrentEquipment(this) })
        let sendToOther = this.socket.broadcast.emit(
            gameEvents.updateCurrentEquipment,
            { d: this.getCurrentEquipment(this) })
    }

    movement(data) {
        if (!this.playerID) return
        let jsonData = JSON.parse(data["d"])
        this.position = {
            x: parseFloat(jsonData[0]),
            y: parseFloat(jsonData[1]),
            z: parseFloat(jsonData[2])
        }
    }

    updatePostionToClient() {
        if (!this.playerID) return;
        let currentMove = this.position
        if (_.isEqual(this.lastMove, currentMove)) return
        this.lastMove = this.position
        let sendToPlayer = [this.position.x, this.position.y, this.position.z]
        let sendToOther = [
            this.playerID,
            this.position.x,
            this.position.y,
            this.position.z
        ]
        this.socket.emit(gameEvents.playerUpdatePosition, { d: sendToPlayer })

        this.socket.broadcast.emit(gameEvents.playerEnemyUpdatePosition, { d: sendToOther })

    }

    updateRotationToClient() {
        if (!this.playerID) return;
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
            player.position.x,
            player.position.y,
            player.position.z,
            player.username,
            player.currentEquipment
        ]
    }

    getAngleRadians(p1, p2) {
        return Math.atan2(p2.position.y - p1.position.y, p2.position.x - p1.position.x);
    }

    getAllEnemies() {
        return _.pickBy(GameManager.getInstance().getPlayers(), (value, key) => {
            return key != this.playerID
        })
    }
}