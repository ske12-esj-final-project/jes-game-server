const _ = require('lodash')

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
    }

    getSendData() {
        return _.concat(Object.values(this.position),
            Object.values(this.scale))
    }
}