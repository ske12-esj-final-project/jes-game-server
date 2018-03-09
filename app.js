
const express = require('express')
const app = express()
const server = require('http').Server(app)
const _ = require('lodash')
const shortid = require('shortid')
const path = require('path')

const io = require('socket.io')(server)

const PlayerManager = require('./managers/player')
const GameManager = require('./managers/game')
const gameEvents = require('./constants/events')
const GameWorld = require('./managers/gameworld')
const RoomManager = require('./managers/room')

const gameWorldConfig = require('./config/gameworld')

const APP_CONFIG = require('./config.json')

const Room = require('./model/room')

let gameInterval = null
let gameWorldRoomA = new GameWorld(io, gameWorldConfig)
let gameWorldRoomB = new GameWorld(io, gameWorldConfig)

// let gameManager = new GameManager(io, gameWorld)

console.log('GAME-SERVER VERSION :: ', APP_CONFIG.GAME_VERSION)

let roomA = new Room('Room A', gameWorldRoomA);
let roomB = new Room('Room B', gameWorldRoomB);
let rooms = [roomA, roomB];


io.on('connection', (socket) => {
    let roomManager = new RoomManager(socket, rooms);
    socket.playerID = shortid.generate()
    console.log('Player', socket.playerID, socket.id, 'connected')
    // let weaponsInMap = gameWorld.getUpdateWeaponInMap()
    // console.log('send-weapon-data',weaponsInMap)
    // socket.emit(gameEvents.setupEquitment,{d:weaponsInMap})

    socket.on('disconnect', () => {
        let pid = socket.playerID
        let data = { "d": pid }
        io.emit(gameEvents.playerDisconnect, data)
        console.log('remove player', socket.playerID)
        roomManager.deletePlayer()
    })
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
    console.log(`Listen on http://localhost:${PORT}`)
    // gameInterval = gameManager.createGameInterval()
})

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/index.html'))
})