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
            for (let playerID in instance.players) {
                instance.players[playerID].updatePostionToClient()
                instance.players[playerID].updateRotationToClient()
            }
        }, this.timeout || 1000 / 60)
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

    addRoom(room) {
        instance.rooms[room.roomID] = room
    },

    removePlayer(playerID) {
        delete instance.players[playerID]
    },

    removeRoom(roomID) {
        delete instance.rooms[roomID]
    }
}