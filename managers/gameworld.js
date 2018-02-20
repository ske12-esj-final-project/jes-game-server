const _ = require('lodash')

const gameEvents = require('../constants/events')
const WEAPON = require('../data/equitments')

module.exports = class {
    constructor(io, config) {
        this.config(config)
        this.io = io
    }

    config(config) {
        _.forOwn(config, (value, key) => {
            this[key] = value
        })
    }


}