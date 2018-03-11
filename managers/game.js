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
    },
    
    getRoom(roomID) {
        return instance.rooms[roomID]
    },

    getPlayer(playerID) {
        return instance.players[playerID]
    },

    addPlayer(playerID, player) {
        instance.players[playerID] = player
    },

    addRoom(roomID, room) {
        instance.rooms[roomID] = room
    },

    removePlayer(playerID) {
        delete instance.players[playerID]
    },

    removeRoom(roomID) {
        delete instance.rooms[roomID]
    }
}