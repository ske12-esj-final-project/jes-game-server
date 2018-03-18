const express = require('express')
const app = express()
const server = require('http').Server(app)
const _ = require('lodash')
const shortid = require('shortid')
const path = require('path')
const io = require('socket.io')(server)

const Room = require('./model/room')
const GameManager = require('./managers/game')
const RoomManager = require('./managers/room')

const gameEvents = require('./constants/events')

const APP_CONFIG = require('./config.json')

let gameInterval = null

console.log('GAME-SERVER VERSION :: ', APP_CONFIG.GAME_VERSION)

let roomA = new Room(io, 'Room A', '0')
let roomB = new Room(io, 'Room B', '1')
let roomManager

io.on('connection', (socket) => {
    roomManager = new RoomManager(socket)
    roomManager.addRoom(roomA)
    roomManager.addRoom(roomB)
    socket.playerID = shortid.generate()
    console.log('Player', socket.playerID, socket.id, 'connected')

    socket.on('disconnecting', (reason) => {
        let currentRoom = GameManager.getPlayer(socket.playerID).currentRoom
        if (currentRoom) {
            currentRoom.removePlayer(socket.playerID)
        }
    });

    socket.on('disconnect', () => {
        roomManager.onPlayerDisconnect()
        io.emit(gameEvents.playerDisconnect, { d: socket.playerID })
        console.log('remove player', socket.playerID)
    })
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
    console.log(`Listen on http://localhost:${PORT}`)
    gameInterval = GameManager.createGameInterval()
})

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/index.html'))
})