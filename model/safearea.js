const _ = require('lodash')
const SAFE_AREA_STATE = require('../constants/safestate')

module.exports = class {
    constructor() {
        this.position = this.getDefaultPosition()
        this.scale = this.getDefaultScale()
        this.setState(SAFE_AREA_STATE.WAITING)
    }

    getSendData() {
        return [this.position.x, this.position.y, this.position.z, 
            this.scale.x, this.scale.y, this.scale.z]
    }

    setState(newState) {
        this.currentState = newState
    }

    getState() {
        return this.currentState
    }

    getDefaultPosition() {
        return { x: 0, y: 0, z: 0 }
    }

    getDefaultScale() {
        return { x: 2.5, y: 1, z: 2.5 }
    }

    isWaiting() {
        return this.currentState === SAFE_AREA_STATE.WAITING
    }

    isWarning() {
        return this.currentState === SAFE_AREA_STATE.WARNING
    }

    isTriggering() {
        return this.currentState === SAFE_AREA_STATE.TRIGGERING
    }

    isAtSmallest() {
        return this.scale.x === 0 || this.scale.z === 0
    }
}