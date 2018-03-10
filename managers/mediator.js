const _ = require('lodash')

let instance = null

module.exports = {
    getInstance() {
        if (!instance) {
            instance = this
            instance.rooms = {}
            instance.players = {}
        }

        return instance
    },

    getRooms() {
        return instance.rooms
    },

    getPlayers() {
        return instance.players
    }
}