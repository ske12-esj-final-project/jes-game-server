const _ = require('lodash')
const gameEvents = require('../constants/events')
const Player = require('../model/player')
const Room = require('../model/room')

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
        let playerID = this.socket.playerID
        let player = new Player(playerID, 0, 0, 0, "1234", -1)
        this.players.push(player)
        this.socket.emit(gameEvents.playerJoinGame, { d: [playerID] })
    }

    playerJoinRoom(data) {
        data['d'] = data['d'].replace(/@/g, "\"")
        let jsonData = JSON.parse(data["d"])
        let player = _.find(this.players, 'playerID', jsonData[0])
        let roomIndex = parseInt(jsonData[1])
        this.joinRoom(player, roomIndex)
        this.socket.emit(gameEvents.playerJoinRoom, { d: [player.playerID] })
    }

    createNewRoom() {
        let roomA = new Room('Room A', this.socket)
        let roomB = new Room('Room B', this.socket)
        this.rooms = [roomA, roomB]
    }

    addRoom(newRoom) {
        this.rooms.push(newRoom)
    }

    joinRoom(player, roomIndex) {
        this.rooms[roomIndex].addPlayer(player)
    }

    deletePlayer() {
        _.remove(this.players, player => player.playerID === this.socket.playerID)
    }
}