'use strict'
const _ = require('lodash')
const shortid = require('shortid')
const axios = require('axios')
const gameEvents = require('../constants/events')
const GameManager = require('../managers/game')
const SafeArea = require('../model/safearea')
const Utils = require('../utils')
const WEAPON = require('../data/equipments')
const SPAWNPOINTS = require('../spawnpoints/spawnpoint.json')
const API = require('../constants/api')
const GAME_STATE = require('../constants/gamestate')
const SAFE_AREA_STATE = require('../constants/safestate')
const DEFAULT_CONFIG = require('../config/gameworld')

const equipmentData = require('../data/equipments')
const { createWeaponItemList, assignRandomPositions, createBulletList } = require('../utils/createEquipmentItemList')

module.exports = class {
    constructor(io, config, roomID) {
        this.io = io
        this.config = config
        this.roomID = roomID
        this.reset()
        if (this.io) {
            this.createGameInterval()
        }
    }

    sendRemoveWeapon(weaponID) {
        this.io.to(this.roomID).emit(gameEvents.getEquipment, { d: [weaponID] })
    }

    sendRemoveBullet(bulletID) {
        this.io.to(this.roomID).emit(gameEvents.getBullet, { d: [bulletID] })
    }

    createGameInterval() {
        return setInterval(() => {
            this.update()
        }, 1000 / this.config.tickRate)
    }

    update() {
        this.updateAllPlayersMovement()
        if (this.isInGame()) {
            this.safeAreaDuration += 1000 / this.config.tickRate
            this.updateSafeArea()
        }
    }

    updateAllPlayersMovement() {
        for (let playerID in this.players) {
            this.players[playerID].updatePostionToClient()
            this.players[playerID].updateRotationToClient()
        }
    }

    updateSafeArea() {
        if (this.safeArea.isWaiting()) {
            this.safeArea.setState(SAFE_AREA_STATE.WARNING)
            this.onWarningSafeArea()
        }
    }

    calculateSafeArea() {
        let sumX = 0, sumZ = 0, count = 0
        for (let playerID in this.players) {
            sumX += this.players[playerID].position.x
            sumZ += this.players[playerID].position.z
            count++
        }

        if (count === 0 || this.safeArea.isAtSmallest()) return

        this.safeArea.position = {
            x: (sumX / count) + this.safeArea.scale.x,
            y: 3,
            z: (sumZ / count)
        }

        this.safeArea.scale = {
            x: this.safeArea.scale.x - 50,
            y: 40,
            z: this.safeArea.scale.z - 50
        }
    }

    onWarningSafeArea() {
        this.calculateSafeArea()
        this.io.to(this.roomID).emit(gameEvents.warnSafeArea, { d: this.safeArea.getSendData() })
        this.warnSafeAreaInterval = this.createWarnSafeAreaInterval()
    }

    onMoveSafeArea() {
        this.io.to(this.roomID).emit(gameEvents.moveSafeArea, { d: this.safeArea.getSendData() })

        setTimeout(() => {
            this.safeArea.setState(SAFE_AREA_STATE.WAITING)
            this.safeAreaDuration = 0
        }, this.config.restrictTime)
    }

    createWarnSafeAreaInterval() {
        let t = this.config.triggerTime
        return setInterval(() => {
            if (t <= 0) {
                this.safeArea.setState(SAFE_AREA_STATE.TRIGGERING)
                this.onMoveSafeArea()
                clearInterval(this.warnSafeAreaInterval)
            }

            else {
                t -= 1000
                this.io.to(this.roomID).emit(gameEvents.warnSafeAreaTime, { d: [t / 1000] })
            }

        }, 1000)
    }

    updateNumberOfAlivePlayer() {
        let alivePlayers = this.getAlivePlayers()
        let aliveNumber = _.size(alivePlayers)
        console.log('aliveNumber', aliveNumber)
        this.io.to(this.roomID).emit(gameEvents.updateNumberOfAlivePlayer, { "d": [aliveNumber] })
        if (aliveNumber === 1 && this.isInGame()) {
            this.onPlayerWin(alivePlayers)
        }
    }

    onPlayerWin(alivePlayers) {
        let winner = Object.values(alivePlayers)[0]
        let score = Utils.calculateScore(winner)
        winner.socket.emit(gameEvents.playerWin, { d: [winner.username, winner.numberOfKill, score] })
        this.updateMatchScore(winner, score)
        this.reset()
    }

    updateMatchScore(winner, score) {
        const fixed2Dec = (n) => Math.round(n * 100) / 100
        let matchID = this.matchID
        let duration = fixed2Dec((Date.now() - this.duration) / 1000) || 0

        axios.put(API.USER + `/u/${winner.userID}/score`, { 'score': score })
            .then(user_response => {
                console.log("saveScore-response", user_response.data)
            }).catch(err => {
                console.error("error", err)
            })

        axios.put(API.MATCH + `/${matchID}`, {
            "duration": duration,
            "winner": winner.userID
        })
            .then((res) => {
                console.log('update match done.')
            })
            .catch((err) => {
                console.error(err)
            })
    }

    getAlivePlayers() {
        return _.pickBy(this.players, (value, playerId) => {
            return value['hp'] > 0
        })
    }

    onPlayerKill(player, victim) {
        axios.post(API.KILL, {
            matchID: this.matchID,
            playerID: player.userID,
            victimID: victim.userID,
            victimPos: victim.position,
            weaponUsed: WEAPON[player.currentEquipment.toString()]["Game name"]
        })
            .then((res) => {
                console.log(res.data)
            })
            .catch((err) => {
                console.error(err)
            })
    }

    onPlayerDieSafeArea(player) {
        axios.post(API.KILL, {
            matchID: this.matchID,
            playerID: player.userID,
            victimID: player.userID,
            victimPos: player.position,
            weaponUsed: "Safe Area"
        })
            .then((res) => {
                console.log(res.data)
            })
            .catch((err) => {
                console.error(err)
            })
    }

    getUpdateBulletInMap() {
        let sendData = []
        _.map(this.bulletList, bullet => {
            let data = [bullet.uid, bullet.x, bullet.y, bullet.z]
            sendData.push(data)
        })
        return sendData
    }

    getUpdateWeaponInMap() {
        let sendData = []
        _.map(this.equipments, item => {
            let data = [item.uid, item.weaponIndex, item.position.x, item.position.y, item.position.z, item.capacity]
            sendData.push(data)
        })
        return sendData
    }

    reset() {
        for (let playerID in this.players) {
            this.players[playerID].leaveCurrentRoom()
        }

        this.players = {}
        this.playerReadyCounter = 0
        let itemSize = this.config.NumberOfItems
        this.itemList = createWeaponItemList(itemSize, equipmentData)
        this.equipments = assignRandomPositions(this.itemList, SPAWNPOINTS)
        this.gottenEquipmentList = []
        clearInterval(this.warnSafeAreaInterval)
        this.bulletList = createBulletList(this.equipments)

        this.safeArea = new SafeArea()
        this.safeAreaDuration = 0
        this.duration = Date.now()
        this.setState(GAME_STATE.OPEN)
    }

    setMaxPlayers(newMaxPlayers) {
        this.config.maxPlayers = newMaxPlayers
    }

    getMaxPlayers() {
        return this.config.maxPlayers
    }

    setDamageInterval(newDamageInterval) {
        this.config.damageInterval = newDamageInterval
    }

    setCountdownInterval(newCountdownInterval) {
        this.config.countdownInterval = newCountdownInterval
    }

    setState(newState) {
        this.currentState = newState
    }

    setDefaultConfig() {
        this.config = DEFAULT_CONFIG
    }

    getState() {
        return this.currentState
    }

    isOpen() {
        return this.currentState === GAME_STATE.OPEN
    }

    isCountdown() {
        return this.currentState === GAME_STATE.COUNTDOWN
    }

    isInGame() {
        return this.currentState === GAME_STATE.INGAME
    }
}