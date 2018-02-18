const _ = require('lodash')

module.exports = class {
    constructor(io, gameWorld) {
        this.io = io
        this.gameWorld = gameWorld
    }
    // plane axis x,z

    createGameInterval() {
        return setInterval(() => {
            _.forEach(this.gameWorld.players, player => {
                player.updatePostionToClient()
                player.updateRotationToClient()
            })
        }, this.gameWorld.timeout || 1000 / 60)
    }
}