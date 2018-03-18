'use strict'
const _ = require('lodash')
const shortid = require('shortid')
const gameEvents = require('../constants/events')
const SafeArea = require('../model/safearea')
const Utils = require('../utils')
const WEAPON = require('../data/equipments')
const SPAWNPOINTS = require('../spawnpoints/spawnpoint.json')

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
            }
        }, 1000)
    }

    onMoveSafeArea() {
        this.safeArea.position = {
            x: 150,
            y: 3,
            z: 150
        }

        this.safeArea.scale = {
            x: 200,
            y: 40,
            z: 200
        }

        this.io.emit(gameEvents.moveSafeArea, { d: this.safeArea.getSendData() })
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
}