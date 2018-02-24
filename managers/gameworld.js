
'use strict'
const _ = require('lodash')

const gameEvents = require('../constants/events')
const WEAPON = require('../data/equitments')
const Utils = require('../utils')

module.exports = class {
    constructor(io, config) {
        this.config(config)
        this.io = io
    }

    assignRandomPositions(items, spawnPoints) {
        items = items.map(i=>_.clone(i))
        let t_points = spawnPoints.map(i=>_.clone(i))

        return items.map((item) => {
            let index = Utils.getRandomInt(t_points.length)
            item.position = _.clone(t_points[index])
            let o = t_points[index]
            t_points = _.filter(t_points, target => target !== o)
            return item
        })
    }

    config(config) {
        _.forOwn(config, (value, key) => {
            this[key] = value
        })
    }


}