const _ = require('lodash')

module.exports = class {
    constructor(io, gameWorld) {
        this.io = io
        this.gameWorld = gameWorld
    }

    createGameInterval() {
        return setInterval(() => {
            _.forEach(this.gameWorld.players, player => {
                player.updatePostionToClient()
            })
        }, this.gameWorld.timeout || 1000 / 60)
    }
}