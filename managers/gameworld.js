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

const equitmentData = require('../data/equipments')
const { createWeaponItemList, assignRandomPositions, createBulletList } = require('../utils/createEquitmentItemList')

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

    createGameInterval() {
        return setInterval(() => {
            this.update()
        }, 1000 / this.config.tickRate)
    }

    update() {
        this.updateAllPlayersMovement()
        if (this.isInGame()) {
            this.duration += 1000 / this.config.tickRate
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
        if (this.duration >= this.config.warningTime && this.safeArea.isWaiting()) {
            this.safeArea.setState(SAFE_AREA_STATE.WARNING)
            this.onWarningSafeArea()
        }

        if (this.duration >= this.config.triggerTime && this.safeArea.isWarning()) {
            this.safeArea.setState(SAFE_AREA_STATE.TRIGGERING)
            this.onMoveSafeArea()
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
    }

    onMoveSafeArea() {
        this.io.to(this.roomID).emit(gameEvents.moveSafeArea, { d: this.safeArea.getSendData() })

        setTimeout(() => {
            this.safeArea.setState(SAFE_AREA_STATE.WAITING)
            this.duration = 0
        }, this.config.restrictTime)
    }

    updateNumberOfAlivePlayer() {
        let alivePlayers = this.getAlivePlayers()
        let aliveNumber = _.size(alivePlayers)
        console.log(aliveNumber)
        this.io.to(this.roomID).emit(gameEvents.updateNumberOfAlivePlayer, { "d": [aliveNumber] })
        if (aliveNumber == 1 && this.isInGame()) {
            this.setState(GAME_STATE.END)
            let winner = Object.values(alivePlayers)[0]
            let score = Utils.calculateScore(winner)
            winner.socket.emit(gameEvents.playerWin, { d: [winner.username, winner.numberOfKill, score] })
            this.reset()
        }
    }

    getAlivePlayers() {
        return _.pickBy(this.players, (value, playerId) => {
            return value['hp'] > 0
        })
    }

    onPlayerKill(player, victim) {
        player.numberOfKill++
        // axios.post(API.KILL, {
        //     matchID: this.matchID,
        //     playerID: player.userID,
        //     victimID: victim.userID,
        //     victimPos: victim.position,
        //     weaponUsed: WEAPON[player.currentEquipment.toString()]["Game name"]
        // })
        //     .then((res) => {
        //         console.log(res.data)
        //     })
        //     .catch((err) => {
        //         console.error(err)
        //     })
    }

    getUpdateBulletInMap() {
        let sendData = []
        _.map(this.bulletList, bullet => {
            let data = [bullet.uid, bullet.x, bullet.y, bullet.z]
        })
    }
    getUpdateWeaponInMap() {
        let sendData = []
        _.map(this.equipments, item => {
            let data = [item.uid, item.weaponIndex, item.position.x, item.position.y, item.position.z]
            sendData.push(data)
        })
        return sendData
    }

    reset() {
        this.players = {}
        this.playerReadyCounter = 0
        let itemSize = this.config.NumberOfItems
        this.itemList = createWeaponItemList(itemSize, equitmentData)

        this.equipments = assignRandomPositions(this.itemList, SPAWNPOINTS)

        this.bulletList = createBulletList(this.equipments)
        /* */
        // weaponIndex 10 is sniper
        let easterItem = {
            uid: shortid.generate(), weaponIndex: 10, position:
                { "x": -81.63, "y": 41.25, "z": -165.34 }
        }
        /* */
        this.equipments.push(easterItem)
        this.safeArea = new SafeArea()

        this.duration = 0
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

    isEnd() {
        return this.currentState === GAME_STATE.END
    }
}