const _ = require('lodash')
const { expect } = require('chai')

const io = require('socket.io-client')
const PORT = process.env.PORT || 5000
const SOCKET_URL = `http://localhost:${PORT}`

const GameManager = require('../managers/game')
const gameEvents = require('../constants/events')
const DEFAULT_CONFIG = require('../config/gameworld')

let options = {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false
}

describe('Player', () => {  
    describe('Safe area events', () => {
        it('should decrease player hp when out of safe area', (done) => {
            let client, playerID, gameWorld, room
            client = io.connect(SOCKET_URL, options)
            client.on('connect', (data) => {
                room = GameManager.getRoom('0')
                gameWorld = room.gameWorld
                gameWorld.setDamageInterval(0)
                gameWorld.setMaxPlayers(10)
                client.emit(gameEvents.playerJoinGame, { username: '1234' })
            })

            client.on(gameEvents.playerJoinGame, (data) => {
                playerID = data.d[0]
                client.emit(gameEvents.playerJoinRoom, { d: `[@${playerID}@,0]` })
            })

            client.on(gameEvents.playerJoinRoom, (data) => {
                client.emit(gameEvents.playerOutSafeArea)
                GameManager.getPlayer(playerID).onPlayerBackSafeArea()
            })

            client.on(gameEvents.updatePlayersStatus, (data) => {
                let playerHealth = parseInt(data.d[2])
                expect(playerHealth).to.equal(95)
                gameWorld.setDefaultConfig()
                client.disconnect()
                done()
            })
        })
    })
})

