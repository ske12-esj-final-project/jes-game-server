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

    resetPlayer() {
        this.getInstance().players = {}
    },

    getRooms() {
        return this.getInstance().rooms
    },

    getPlayers() {
        return this.getInstance().players
    },

    getRoom(roomID) {
        return this.getInstance().rooms[roomID]
    },

    getPlayer(playerID) {
        return this.getInstance().players[playerID]
    },

    addPlayer(playerID, player) {
        this.getInstance().players[playerID] = player
    },

    addRoom(room) {
        this.getInstance().rooms[room.id] = room
    },

    removePlayer(playerID) {
        delete this.getInstance().players[playerID]
    },

    removeRoom(roomID) {
        delete this.getInstance().rooms[roomID]
    }
}