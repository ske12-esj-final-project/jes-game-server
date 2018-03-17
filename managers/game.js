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

    createGameInterval() {
        return setInterval(() => {
            for (let playerID in this.getPlayers()) {
                instance.players[playerID].updatePostionToClient()
                instance.players[playerID].updateRotationToClient()
            }
        }, this.timeout || 1000 / 60)
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
        this.getInstance().rooms[room.roomID] = room
    },

    removePlayer(playerID) {
        delete this.getInstance().players[playerID]
    },

    removeRoom(roomID) {
        delete this.getInstance().rooms[roomID]
    }
}