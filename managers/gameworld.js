
'use strict'
const _ = require('lodash')

const gameEvents = require('../constants/events')
const WEAPON = require('../data/equitments')
const Utils = require('../utils')
const shortid = require('shortid')
const SPAWNPOINTS = require('../spawnpoints/spawnpoint.json')

module.exports = class {
    constructor(io, config) {
        this.config(config)
        this.io = io
        let item = {
            uid: "",
            weaponIndex: 1,
            position: {}
        }
        this.itemList = [_.clone(item), _.clone(item)]
        // [id,weaponindex,posx,posy,posz]
        this.equitments = this.assignRandomPositions(this.itemList, SPAWNPOINTS)
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
    sendRemoveWeapon(weaponID){
        console.log('remove-weapon',weaponID)
        // remove weapon in client
        this.io.emit(gameEvents.getEquitment,{d:[weaponID]})
    }

    getUpdateWeaponInMap() {
        let sendData = []
        _.map(this.equitments, item => {
            let data = [item.uid, item.weaponIndex, item.position.x,item.position.y, item.position.z]
            sendData.push(data)
        })
        return sendData
    }

    config(config) {
        _.forOwn(config, (value, key) => {
            this[key] = value
        })
    }


}