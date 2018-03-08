'use strict'
const Room = require('./room') 

module.exports = class {
    constructor() {
        this.rooms = [];
    }

    addRoom(newRoom) {
        this.rooms.push(newRoom);
    }

    joinRoom(playerID, roomIndex) {
        this.rooms[roomIndex].addPlayer(playerID);
    }
}