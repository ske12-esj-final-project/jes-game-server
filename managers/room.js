const _ = require('lodash')
const axios = require('axios')
const gameEvents = require('../constants/events')
const API = require('../constants/api')
const Room = require('../model/room')
const Player = require('./player')
const GameManager = require('./game')
const GAME_STATE = require('../constants/gamestate')

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
        data['d'] = data['d'].replace(/@/g, "\"")
        let jsonData = JSON.parse(data["d"])
        let username = jsonData[0]
        this.socket.token = jsonData[1]
        let playerID = this.socket.playerID
        let player = new Player(this.socket, playerID, username)
        GameManager.addPlayer(playerID, player)
        this.socket.emit(gameEvents.playerJoinGame, { d: [playerID] })
        axios.get(API.USER + '/me', {
            "headers": { "access-token": this.socket.token }
        }).then((res) => {
            this.socket.id = res.data.id
            player.username = res.data.username
        })
    }

    onPlayerJoinRoom(data) {
        data['d'] = data['d'].replace(/@/g, "\"")
        let jsonData = JSON.parse(data["d"])
        let player = GameManager.getPlayer(jsonData[0])
        let roomID = jsonData[1]
        let room = GameManager.getRoom(roomID)

        if (room.isFull()) {
            return this.socket.emit(gameEvents.playerJoinFullRoom, { d: ['Room is full'] })
        }

        player.currentRoom = room
        room.addPlayer(player)
        this.socket.join(roomID)
        this.socket.emit(gameEvents.playerJoinRoom, { d: [player.playerID] })

        if (room.isFull()) {
            room.gameWorld.setState(GAME_STATE.COUNTDOWN)
            room.gameWorld.onCountdown()
        }
    }

    addRoom(room) {
        GameManager.addRoom(room)
    }

    onPlayerDisconnect() {
        _.remove(GameManager.getPlayers(), player => player.playerID === this.socket.playerID)
    }
}