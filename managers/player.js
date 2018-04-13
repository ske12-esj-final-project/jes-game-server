const _ = require('lodash')
const gameEvents = require('../constants/events')
const GameManager = require('./game')
const Utils = require('../utils')

module.exports = class {
    constructor(socket, playerID, username) {
        this.socket = socket
        this.playerID = playerID
        this.username = username
        this.userID = null
        this.currentRoom = null
        this.reset()
        this.socketHandler(socket)
    }



    socketHandler(socket) {
        if (!socket) return
        socket.on(gameEvents.playerSetupPlayer, this.setupPlayer.bind(this))
        socket.on(gameEvents.startGame, this.startGame.bind(this))
        socket.on(gameEvents.playerMovement, this.movement.bind(this))
        socket.on(gameEvents.playerUpdateRotation, this.rotate.bind(this))
        socket.on(gameEvents.playerAttack, this.playerShoot.bind(this))
        socket.on(gameEvents.checkShootHit, this.checkShootHit.bind(this))
        socket.on(gameEvents.updateCurrentEquipment, this.updateCurrentEquipment.bind(this))
        socket.on(gameEvents.getEquipment, this.getEquipment.bind(this))
        socket.on(gameEvents.playerOutSafeArea, this.onPlayerOutSafeArea.bind(this))
        socket.on(gameEvents.playerBackInSafeArea, this.onPlayerBackSafeArea.bind(this))
        socket.on(gameEvents.playerLeaveRoom, this.leaveCurrentRoom.bind(this))

        socket.on(gameEvents.discardEquitment, this.discardEquitment.bind(this))

        socket.on(gameEvents.getBullet, this.getBullet.bind(this))

    }

    reset() {
        this.position = { x: null, y: null, z: null }
        this.rotation = { x: null, y: null }
        this.hp = 100
        this.currentEquipment = 0
        this.numberOfKill = 0
    }
    setupPlayer(data) {
        data = JSON.parse(data)
        console.log('data setup-player',data)
        this.cloathIndex = data[0]
        this.reset()
        this.position = { x: 0, y: 20, z: 0 }
        this.sendPlayersDataCreateCharacter()
        console.log('setup-player', this.socket.playerID, this.socket.userID)
    }

    startGame(data) {
        this.position = {
            x: this.randomInt(-150, 150),
            y: 500,
            z: this.randomInt(-150, 150)
        }
        this.sendPlayersDataCreateCharacter()

        this.setupEquipment()
        
        let bulletInMap = this.currentRoom.gameWorld.getUpdateBulletInMap()
        this.socket.emit(gameEvents.setupBullet, { d: bulletInMap })
    }

    setupEquipment(){
        let weaponsInMap = this.currentRoom.gameWorld.getUpdateWeaponInMap()
        this.socket.emit(gameEvents.setupEquipment, { d: weaponsInMap })
    }

    sendPlayersDataCreateCharacter() {
        let currentPlayerData = this.getPlayerInitData(this)
        let getAllEnemiesData = this.getAllPlayerSendData(this.getAllEnemies())
        this.socket.emit(gameEvents.playerCreated, { d: [currentPlayerData, getAllEnemiesData] })
        this.broadcastRoom(gameEvents.playerEnemyCreated, { d: currentPlayerData })
        this.currentRoom.gameWorld.updateNumberOfAlivePlayer()
    }

    removeEquipmentInClient(data) {

    }

    discardEquitment(data){
        console.log('d-discardEquitment0',data)
        data['d'] = data['d'].replace(/@/g, "\"")
        console.log('d-discardEquitment1',data)
        let jsonData = JSON.parse(data["d"])
        let weaponID = jsonData[0]
        let room = this.currentRoom

        let discardItem = _.clone(_.find(room.gameWorld.gottenEquitmentList, item => item.uid === weaponID))
        if(!discardItem) return
        _.remove(room.gameWorld.gottenEquitmentList, item => item.uid === weaponID)

        let currentAmmo = parseInt(jsonData[1])
        let posX = jsonData[2] ||0
        let posY = jsonData[3] ||0
        let posZ = jsonData[4] ||0

        // update data of discardItem

        discardItem.position = {
            x:posX,
            y:posY,
            z:posZ
        }

        discardItem.capacity = currentAmmo
        room.gameWorld.equipments.push(discardItem)

        let weaponsInMap = this.currentRoom.gameWorld.getUpdateWeaponInMap()
        this.socket.emit(gameEvents.setupEquipment, { d: weaponsInMap })
        this.broadcastRoom(gameEvents.setupEquipment, { d: weaponsInMap })
        // console.log('weaponInMap',weaponsInMap)
        console.log('discard - item ',discardItem)

    }

    getEquipment(data) {
        data['d'] = data['d'].replace(/@/g, "\"")
        let jsonData = JSON.parse(data["d"])
        if (jsonData.length >= 1) {
            let weaponID = jsonData[0]
            let room = this.currentRoom

            let gottenItem = _.clone(_.find(room.gameWorld.equipments, item => item.uid === weaponID))
            room.gameWorld.gottenEquitmentList.push(gottenItem)

            _.remove(room.gameWorld.equipments, item => item.uid === weaponID)
            room.gameWorld.sendRemoveWeapon(weaponID)
        }
        else {
            console.error('[error]-checkShootHit wrong data pattern', data)
        }
    }

    getBullet(data) {
        data['d'] = data['d'].replace(/@/g, "\"")
        let jsonData = JSON.parse(data["d"])
        if (jsonData.length >= 1) {
            let bulletID = jsonData[0]
            let room = this.currentRoom
            _.remove(room.gameWorld.bulletList, item => item.uid === bulletID)
            room.gameWorld.sendRemoveBullet(bulletID)
        }
        else {
            console.error('[error]-check get bullet wrong data pattern', data)
        }

    }

    onPlayerOutSafeArea(data) {
        let damage = 5
        this.damageInterval = this.createDamageInterval(damage)
    }

    onPlayerBackSafeArea(data) {
        clearInterval(this.damageInterval)
    }

    createDamageInterval(damage) {
        let currentGameWorld = this.currentRoom.gameWorld
        return setInterval(() => {
            this.hp -= damage
            if (this.hp <= 0) {
                this.broadcastRoom(gameEvents.playerDie, { d: this.getKillData(this) })
                this.socket.emit(gameEvents.getVictimData, { d: this.getVictimData(this) })
                this.currentRoom.gameWorld.updateNumberOfAlivePlayer()
                clearInterval(this.damageInterval)
            }

            let sendToOther = { "d": [this.playerID, this.playerID, this.hp] }
            this.socket.emit(gameEvents.updatePlayersStatus, sendToOther)
        }, currentGameWorld.config.damageInterval)
    }

    randomInt(low, high) {
        return Math.floor(Math.random() * (high - low) + low);
    }

    rotate(data) {
        if (!this.playerID) return
        let jsonData = JSON.parse(data["d"])
        this.rotation = {
            x: jsonData[0],
            y: jsonData[1]
        }
    }

    playerShoot(data) {
        let sendToOther = {
            "d": [
                this.playerID
            ]
        }
        this.broadcastRoom(gameEvents.enemyShoot, sendToOther)
    }

    checkShootHit(data) {
        data['d'] = data['d'].replace(/@/g, "\"")
        let jsonData = JSON.parse(data["d"])
        let targetId = jsonData[0]
        let damage = jsonData[1]

        let victim = GameManager.getPlayer(targetId)

        if (victim) {
            this.hitPlayer(victim, damage)

        } else {
            console.log('no enemy shot in this game')
        }
    }

    hitPlayer(victim, damage) {
        victim.hp -= this.currentRoom.gameWorld.isInGame() ? damage : 0
        if (victim.hp <= 0) {
            this.currentRoom.gameWorld.onPlayerKill(this, victim)
            victim.broadcastRoom(gameEvents.playerDie, { d: this.getKillData(victim) })
            victim.socket.emit(gameEvents.getVictimData, { d: this.getVictimData(victim) })
            this.socket.emit(gameEvents.updatePlayerKill, { d: [this.numberOfKill] })
        }

        let sendToOther = { "d": [victim.playerID, this.playerID, victim.hp, this.position.x, this.position.y, this.position.z] }
        victim.socket.emit(gameEvents.updatePlayersStatus, sendToOther)
        this.currentRoom.gameWorld.updateNumberOfAlivePlayer()
    }

    getKillData(victim) {
        return [victim.playerID, this.username, victim.username, this.currentEquipment]
    }

    getVictimData(victim) {
        let aliveNumber = _.size(victim.currentRoom.gameWorld.getAlivePlayers()) + 1
        return [victim.username, aliveNumber, victim.numberOfKill, Utils.calculateScore(victim)]
    }

    updateCurrentEquipment(data) {
        data['d'] = data['d'].replace(/@/g, "\"")
        let jsonData = JSON.parse(data["d"])
        let playerID = jsonData[0]
        let weaponIndex = jsonData[1]
        this.currentEquipment = weaponIndex
        let sendToOther = this.broadcastRoom(
            gameEvents.updateCurrentEquipment,
            { d: this.getCurrentEquipment(this) })
    }

    movement(data) {
        let jsonData = JSON.parse(data["d"])
        this.position = {
            x: parseFloat(jsonData[0]),
            y: parseFloat(jsonData[1]),
            z: parseFloat(jsonData[2])
        }
    }

    updatePostionToClient() {
        if (!this.socket || this.position.x == null || this.position.y == null) return;
        let currentMove = this.position
        if (_.isEqual(this.lastMove, currentMove)) return
        this.lastMove = this.position
        this.sendPositionData()
    }

    sendPositionData() {
        let sendToPlayer = [this.position.x, this.position.y, this.position.z]
        let sendToOther = [
            this.playerID,
            this.position.x,
            this.position.y,
            this.position.z
        ]
        this.socket.emit(gameEvents.playerUpdatePosition, { d: sendToPlayer })

        this.broadcastRoom(gameEvents.playerEnemyUpdatePosition, { d: sendToOther })
    }

    updateRotationToClient() {
        if (!this.socket || this.rotation.x == null || this.rotation.y == null) return;
        let currentRotation = this.rotation
        if (_.isEqual(this.lastRotation, currentRotation)) return
        this.lastRotation = currentRotation
        this.sendRotationData()
    }

    sendRotationData() {
        let sendToOther = [
            this.playerID,
            this.rotation.x,
            this.rotation.y
        ]
        this.broadcastRoom(gameEvents.playerUpdateRotation, { d: sendToOther })
    }

    leaveCurrentRoom() {
        if (this.currentRoom) {

            const perform = () => {
                this.currentRoom.removePlayer(this.playerID)
                this.currentRoom.onUpdateRoomInfo()
                this.currentRoom.gameWorld.updateNumberOfAlivePlayer()
                this.socket.leave(this.currentRoom.id)
                this.currentRoom = null
            }

            if (this.socket.broadcast != undefined) {
                this.broadcastRoom(gameEvents.playerLeaveRoom, { d: [this.playerID] })
                perform()
            }
            else {
                perform()
            }
        }
    }

    broadcastRoom(event, data) {
        this.socket.broadcast.to(this.currentRoom.id).emit(event, data)
    }

    getAllPlayerSendData(players) {
        return _.map(players, (player) => this.getPlayerInitData(player))
    }

    getPlayerSendRotationData(player) {
        return [
            player.playerID,
            player.rotation.x,
            player.rotation.y
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
        return _.pickBy(this.currentRoom.getPlayers(), (value, key) => {
            return key != this.playerID
        })
    }
}