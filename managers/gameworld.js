'use strict'
const _ = require('lodash')
const shortid = require('shortid')
const gameEvents = require('../constants/events')
const GameManager = require('../managers/game')
const SafeArea = require('../model/safearea')
const Utils = require('../utils')
const WEAPON = require('../data/equipments')
const SPAWNPOINTS = require('../spawnpoints/spawnpoint.json')
const GAME_STATE = require('../constants/gamestate')
const SAFE_AREA_STATE = require('../constants/safestate')

module.exports = class {
    constructor(io, config) {
        this.io = io
        this.config = config
        let item = {
            uid: "",
            weaponIndex: 1,
            position: {}
        }
        this.players = {}
        this.itemList = [_.clone(item), _.clone(item)]
        this.equipments = this.assignRandomPositions(this.itemList, SPAWNPOINTS)
        this.safeArea = new SafeArea()

        this.duration = 0
        this.setState(GAME_STATE.OPEN)
        this.createGameInterval()
    }

    assignRandomPositions(items, spawnPoints) {
        items = items.map(i => _.clone(i))
        let t_points = spawnPoints.map(i => _.clone(i))

        return items.map((item) => {
            let index = Utils.getRandomInt(t_points.length)
            item.position = _.clone(t_points[index])
            item.uid = shortid.generate()
            let o = t_points[index]
            t_points = _.filter(t_points, target => target !== o)
            return item
        })
    }

    sendRemoveWeapon(weaponID) {
        console.log('remove-weapon', weaponID)
    }

    onCountdown() {
        console.log('Countdown started')
        let timeLeft = 10
        let countDownInterval = setInterval(() => {
            timeLeft -= 1
            console.log('Match will start in', timeLeft)
            this.io.emit(gameEvents.countdown, { d: [timeLeft] })
            if (timeLeft <= 0) {
                clearInterval(countDownInterval)
                this.io.emit(gameEvents.finishCountdown)
                this.setState(GAME_STATE.INGAME)
            }
        }, 1000)
    }

    createGameInterval() {
        return setInterval(() => {
            this.update()
        }, this.timeout || 1000 / 60)
    }

    update() {
        this.updateAllPlayersMovement()
        if (this.getState() === GAME_STATE.INGAME) {
            this.duration += 1000 / 60
            this.updateSafeArea()
        }
    }

    updateAllPlayersMovement() {
        let players = GameManager.getPlayers()
        for (let playerID in players) {
            players[playerID].updatePostionToClient()
            players[playerID].updateRotationToClient()
        }
    }

    updateSafeArea() {
        if (this.duration >= this.config.warningTime && this.safeArea.getState() === SAFE_AREA_STATE.WAITING) {
            this.safeArea.setState(SAFE_AREA_STATE.WARNING)
            this.onWarningSafeArea()
        }

        if (this.duration >= this.config.triggerTime && this.safeArea.getState() === SAFE_AREA_STATE.WARNING) {
            this.safeArea.setState(SAFE_AREA_STATE.TRIGGERING)
            this.onMoveSafeArea()
        }
    }

    onWarningSafeArea() {
        let players = GameManager.getPlayers()
        let sumX = 0, sumZ = 0, count = 0
        for (let playerID in players) {
            sumX += players[playerID].position.x
            sumZ += players[playerID].position.z
            count++
        }

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

        this.io.emit(gameEvents.warnSafeArea, { d: this.safeArea.position })
    }

    onMoveSafeArea() {
        this.io.emit(gameEvents.moveSafeArea, { d: this.safeArea.getSendData() })

        setTimeout(() => {
            this.safeArea.setState(SAFE_AREA_STATE.WAITING)
            this.duration = 0
        }, this.config.restrictTime)
    }

    getUpdateWeaponInMap() {
        let sendData = []
        _.map(this.equipments, item => {
            let data = [item.uid, item.weaponIndex, item.position.x, item.position.y, item.position.z]
            sendData.push(data)
        })
        return sendData
    }

    setMaxPlayers(newMaxPlayers) {
        this.config.maxPlayers = newMaxPlayers
    }

    getMaxPlayers() {
        return this.config.maxPlayers
    }

    setState(newState) {
        this.currentState = newState
    }

    getState() {
        return this.currentState
    }
}