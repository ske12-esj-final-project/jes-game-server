const express = require('express')
const app = express()
const server = require('http').Server(app)
const _ = require('lodash')
const shortid = require('shortid')

const msgPackParser = require('socket.io-msgpack-parser')
const io = require('socket.io')(server)

const PlayerManager = require('./managers/player')
const GameManager = require('./managers/game')
const gameEvents = require('./constants/events')

let gameInterval = null

let gameWorld = {
    players: [],
    timeout: 100
}

let gameManager = new GameManager(io, gameWorld)


io.on('connection', (socket) => {
    let playerManager = new PlayerManager(socket, gameWorld)
    socket.playerID = shortid.generate()
    console.log('player id', socket.playerID, socket.id)

    socket.on('disconnect', () => {
        let pid = socket.playerID
        let data = {"d":pid}
        io.emit(gameEvents.playerDisconnect, data)
        console.log('remove player', socket.playerID)
        playerManager.deletePlayer()
    })
})

const PORT = process.env.PORT || 2000
server.listen(PORT, () => {
    console.log(`Lisnten on http://localhost:${PORT}`)
    gameInterval = gameManager.createGameInterval()
})