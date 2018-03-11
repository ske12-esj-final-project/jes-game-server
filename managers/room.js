const _ = require('lodash')
const gameEvents = require('../constants/events')
const Room = require('../model/room')
const shortid = require('shortid')
const Player = require('./player')
const GameManager = require('./game')

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
        let player = new Player(this.socket, playerID, username)
        GameManager.getInstance().addPlayer(playerID, player)
        this.socket.emit(gameEvents.playerJoinGame, { d: [playerID] })
    }

    onPlayerJoinRoom(data) {
        data['d'] = data['d'].replace(/@/g, "\"")
        let jsonData = JSON.parse(data["d"])
        let player = GameManager.getInstance().getPlayer(jsonData[0])
        let roomID = jsonData[1]
        let room = GameManager.getInstance().getRoom(roomID)
        player.currentRoom = room
        room.addPlayer(player)
        this.socket.join(roomID)
        this.socket.emit(gameEvents.playerJoinRoom, { d: [player.playerID] })
        console.log(room.getPlayers())
        if (_.size(room.getPlayers()) === 1) {
            room.onCountdown()
        }
    }

    addRoom(room) {
        // let roomID = shortid.generate()
        GameManager.getInstance().addRoom(room)
    }

    onPlayerDisconnect() {
        _.remove(GameManager.getInstance().getPlayers(), player => player.playerID === this.socket.playerID)
    }
}