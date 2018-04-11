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
        socket.on(gameEvents.updateRoom, this.onUpdateRoomInfo.bind(this))
    }

    onPlayerConnect(data) {
        data['d'] = data['d'].replace(/@/g, "\"")
        let jsonData = JSON.parse(data["d"])
        const acessToken = jsonData[1]
        const username = jsonData[0]
        const playerID = this.socket.playerID
        this.socket.token = acessToken
        let player = new Player(this.socket, playerID, username)
        GameManager.addPlayer(playerID, player)


        axios.get(API.USER + '/me', {
            "headers": { "access-token": acessToken }
        }).then((res) => {
            this.socket.emit(gameEvents.playerJoinGame, { d: [playerID] })
            let userID = res.data.id
            player.userID = userID
            player.username = res.data.username

            this.socket.userID = userID
            console.log('onPlayerConnect - ', userID, new Date())
        })
    }

    onPlayerJoinRoom(data) {
        data['d'] = data['d'].replace(/@/g, "\"")
        let jsonData = JSON.parse(data["d"])
        let player = GameManager.getPlayer(jsonData[0])
        let roomID = jsonData[1]
        let room = GameManager.getRoom(roomID)

        if (room.isFull()) {
            console.log('Room is full')
            return this.socket.emit(gameEvents.playerJoinFullRoom, { d: ['Room is full'] })
        }

        this.addPlayerToRoom(player, room, roomID)
    }

    addPlayerToRoom(player, room, roomID) {
        if (!player) return
        player.currentRoom = room
        room.addPlayer(player)
        this.socket.join(roomID)
        this.socket.emit(gameEvents.playerJoinRoom, { d: [player.playerID] })
        let maxPlayer = room.gameWorld.getMaxPlayers()
        let numberOfplayerInRoom = _.size(room.gameWorld.players)
        let p = Math.floor(numberOfplayerInRoom/maxPlayer)
        let morethan_80 = p>=.8
        if ((morethan_80 || room.isFull()) && room.gameWorld.getState()=== GAME_STATE.OPEN ) {
            room.gameWorld.setState(GAME_STATE.COUNTDOWN)
            room.onCountdown()
        }

        this.onUpdateRoomInfo()
    }

    onUpdateRoomInfo() {
        let sendData = []
        _.map(GameManager.getRooms(), room => {
            let data = [
                room.id,
                room.name,
                _.size(room.getPlayers()),
                room.gameWorld.getMaxPlayers(),
                room.gameWorld.getState()
            ]

            sendData.push(data)
        })

        this.socket.emit(gameEvents.updateRoom, { d: sendData })
        this.socket.broadcast.emit(gameEvents.updateRoom, { d: sendData })
    }

    addRoom(room) {
        GameManager.addRoom(room)
    }

    onPlayerDisconnect(playerID) {
        console.log('playerid discon',playerID)
        _.unset(GameManager.getPlayers(), playerID)
        console.log('onDisconect #player',_.size(GameManager.getPlayers()))
    }
}