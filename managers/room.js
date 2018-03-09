const _ = require('lodash')
const gameEvents = require('../constants/events')

module.exports = class {
    constructor(socket, rooms) {
        this.socket = socket
        this.rooms = rooms
        this.players = []
        this.socketHandler(socket)
    }

    socketHandler(socket) {
        socket.on(gameEvents.playerJoinGame, this.newPlayer.bind(this))
        socket.on(gameEvents.playerJoinRoom, this.playerJoinRoom.bind(this))
    }

    newPlayer(data) {
        let username = data.username
        console.log('created - new player', username)
        this.playerID = this.socket.playerID
        this.username = username || "anonymous"
        this.players.push(this)
        this.socket.emit(gameEvents.playerJoinGame, { d: [this.playerID] })
    }

    playerJoinRoom(data) {
        data['d'] = data['d'].replace(/@/g, "\"")
        console.log(data['d']);
        let jsonData = JSON.parse(data["d"])
        let playerID = jsonData[0]
        let roomIndex = parseInt(jsonData[1])
        this.joinRoom(playerID, roomIndex)
        this.socket.emit(gameEvents.playerJoinRoom, { d: [playerID] })
    }

    addRoom(newRoom) {
        this.rooms.push(newRoom)
    }

    joinRoom(playerID, roomIndex) {
        this.rooms[roomIndex].addPlayer(playerID)
    }

    deletePlayer() {
        _.remove(this.players, player => player.playerID === this.socket.playerID)
    }
}