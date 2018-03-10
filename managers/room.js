const _ = require('lodash')
const gameEvents = require('../constants/events')
const Player = require('../model/player')
const Room = require('../model/room')
const shortid = require('shortid')
const Mediator = require('./mediator')

module.exports = class {
    constructor(socket) {
        this.socket = socket
        this.socketHandler(socket)
    }

    socketHandler(socket) {
        socket.on(gameEvents.playerJoinGame, this.onPlayerConnect.bind(this))
        socket.on(gameEvents.playerJoinRoom, this.onPlayerJoinRoom.bind(this))
    }

    onPlayerConnect(data) {
        let username = data.username
        console.log('Created new player', username)
        let playerID = this.socket.playerID
        let player = new Player(playerID, 0, 0, 0, username)
        Mediator.getInstance().players[playerID] = player
        this.socket.emit(gameEvents.playerJoinGame, { d: [playerID] })
    }

    onPlayerJoinRoom(data) {
        data['d'] = data['d'].replace(/@/g, "\"")
        let jsonData = JSON.parse(data["d"])
        let player = Mediator.getInstance().players[jsonData[0]]
        let roomID = parseInt(jsonData[1])
        player.currentRoom = Mediator.getInstance().rooms[roomID]
        Mediator.getInstance().rooms[roomID].addPlayer(player)
        this.socket.emit(gameEvents.playerJoinRoom, { d: [player.playerID] })
    }

    addRoom(roomName, roomID) {
        // let roomID = shortid.generate()
        let room = new Room(roomName, this.socket)
        Mediator.getInstance().rooms[roomID] = room
    }

    onPlayerDisconnect() {
        _.remove(Mediator.getInstance().players, player => player.playerID === this.socket.playerID)
    }
}