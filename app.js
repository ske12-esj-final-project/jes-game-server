const express = require('express')
const app = express()
const server = require('http').Server(app)
const _ = require('lodash')
const shortid = require('shortid')
const path = require('path')
const io = require('socket.io')(server)

const GameManager = require('./managers/game')
const RoomManager = require('./managers/room')
const PlayerManager = require('./managers/player')

const gameEvents = require('./constants/events')

const APP_CONFIG = require('./config.json')

let gameInterval = null
// let gameManager = new GameManager(io, gameWorld)

console.log('GAME-SERVER VERSION :: ', APP_CONFIG.GAME_VERSION)

io.on('connection', (socket) => {
    let roomManager = new RoomManager(socket)
    let playerManager = new PlayerManager(socket)
    roomManager.addRoom('Room A', 0)
    roomManager.addRoom('Room B', 1)
    socket.playerID = shortid.generate()
    console.log('Player', socket.playerID, socket.id, 'connected')
    // let weaponsInMap = gameWorld.getUpdateWeaponInMap()
    // console.log('send-weapon-data',weaponsInMap)
    // socket.emit(gameEvents.setupEquipment,{d:weaponsInMap})

    socket.on('disconnect', () => {
        let pid = socket.playerID
        let data = { "d": pid }
        io.emit(gameEvents.playerDisconnect, data)
        console.log('remove player', socket.playerID)
        roomManager.onPlayerDisconnect()
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