const _ = require('lodash')
const SAFE_AREA_STATE = require('../constants/safestate')

module.exports = class {
    constructor() {
        this.position = {
            x: 300,
            y: 3,
            z: 60
        }

        this.scale = {
            x: 300,
            y: 40,
            z: 300
        }

        this.setState(SAFE_AREA_STATE.WAITING)
    }

    getSendData() {
        return _.concat(Object.values(this.position),
            Object.values(this.scale))
    }

    setState(newState) {
        this.currentState = newState
    }

    getState() {
        return this.currentState
    }
}