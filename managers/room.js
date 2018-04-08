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

    checkAccessToken(token) {
        console.log('checkToken',token)
        console.log("#p",GameManager.getPlayers().length)
        if (!token) {
            return new Error("no token")
        }
        else{
            // check token is exist
            let players = GameManager.getPlayers()
            _.map(players, p => {
                if (p.socket.token === token) {
                    console.log('check-token',p.socket.token)
                    return new Error("token is existed")
                }
            })

        }
        return
    }

    onPlayerConnect(data) {
        data['d'] = data['d'].replace(/@/g, "\"")
        let jsonData = JSON.parse(data["d"])
        const acessToken = jsonData[1]
        let err = this.checkAccessToken(acessToken)
        console.log('onPlayerConnect-',acessToken,new Date())

        if (err) {
            console.log('err',err.message)
            this.socket.emit("loginError",{message:err.message})
            return
        }

        this.socket.token = acessToken
        axios.get(API.USER + '/me', {
            "headers": { "access-token": acessToken }
        }).then((res) => {
            const username = jsonData[0]
            let playerID = this.socket.playerID
            let player = new Player(this.socket, playerID, username)
            GameManager.addPlayer(playerID, player)
            this.socket.emit(gameEvents.playerJoinGame, { d: [playerID] })

            player.userID = res.data.id
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

        this.addPlayerToRoom(player, room, roomID)
    }

    addPlayerToRoom(player, room, roomID) {
        if (!player) return
        player.currentRoom = room
        room.addPlayer(player)
        this.socket.join(roomID)
        this.socket.emit(gameEvents.playerJoinRoom, { d: [player.playerID] })

        if (room.isFull()) {
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

    onPlayerDisconnect() {
        _.remove(GameManager.getPlayers(), player => player.playerID === this.socket.playerID)
    }
}