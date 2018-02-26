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

const gameWorldConfig = require('./config/gameworld')

const APP_CONFIG = require('./config.json')


let gameInterval = null
let gameWorld = new GameWorld(io,gameWorldConfig)

let gameManager = new GameManager(io, gameWorld)

console.log('GAME-SERVER VERSION :: ',APP_CONFIG.GAME_VERSION)


io.on('connection', (socket) => {
    let playerManager = new PlayerManager(socket, gameWorld)
    socket.playerID = shortid.generate()
    console.log('player id', socket.playerID, socket.id)

    socket.on('disconnect', () => {
        let pid = socket.playerID
        let data = { "d": pid }
        io.emit(gameEvents.playerDisconnect, data)
        console.log('remove player', socket.playerID)
        playerManager.deletePlayer()
    })
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
    console.log(`Lisnten on http://localhost:${PORT}`)
    gameInterval = gameManager.createGameInterval()
})

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/index.html'))
})