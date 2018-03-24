const _ = require('lodash')
const chai = require('chai')
const sinon = require('sinon')
chai.use(require('sinon-chai'))
const expect = chai.expect

const io = require('socket.io-client')
const PORT = process.env.PORT || 5000
const SOCKET_URL = `http://localhost:${PORT}`

const server = require('../app')
const GameManager = require('../managers/game')
const gameEvents = require('../constants/events')
const DEFAULT_CONFIG = require('../config/gameworld')

const GAME_STATE = require('../constants/gamestate')

let options = {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false
}

describe('Events', () => {

    afterEach(() => {
        GameManager.instance = null
    })

    describe('Player join game', () => {

        it('should add player to the list', (done) => {
            let client = io.connect(SOCKET_URL, options)
            client.on('connect', (data) => {
                client.emit(gameEvents.playerJoinGame, { d: '[@1234@,@abcd@]' })
            })

            client.on(gameEvents.playerJoinGame, (data) => {
                let player = GameManager.getPlayer(data.d[0])
                expect(player).to.not.be.undefined
                client.disconnect()
                done()
            })
        })

        it('should add player with client username', (done) => {
            let client = io.connect(SOCKET_URL, options)
            client.on('connect', (data) => {
                client.emit(gameEvents.playerJoinGame, { d: '[@1234@,@abcd@]' })
            })

            client.on(gameEvents.playerJoinGame, (data) => {
                let player = GameManager.getPlayer(data.d[0])
                expect(player.username).to.equal('1234')
                client.disconnect()
                done()
            })
        })
    })

    describe('Player join room', () => {

        it('should add player to room', (done) => {
            let client, playerID, gameWorld, room
            client = io.connect(SOCKET_URL, options)
            client.on('connect', (data) => {
                room = GameManager.getRoom('0')
                gameWorld = room.gameWorld
                client.emit(gameEvents.playerJoinGame, { d: '[@1234@,@abcd@]' })
            })

            client.on(gameEvents.playerJoinGame, (data) => {
                playerID = data.d[0]
                gameWorld.setMaxPlayers(1)
                client.emit(gameEvents.playerJoinRoom, { d: `[@${playerID}@,0]` })
            })

            client.on(gameEvents.playerJoinRoom, (data) => {
                let player = room.getPlayer(playerID)
                expect(playerID).to.not.be.undefined
                client.disconnect()
                gameWorld.setDefaultConfig()
                done()
            })
        })

        it('should not add player if room is full', (done) => {
            let client, room, gameWorld
            client = io.connect(SOCKET_URL, options)
            client.on('connect', (data) => {
                room = GameManager.getRoom('0')
                gameWorld = room.gameWorld
                client.emit(gameEvents.playerJoinGame, { d: '[@1234@,@abcd@]' })
            })

            client.on(gameEvents.playerJoinGame, (data) => {
                let playerID = data.d[0]
                gameWorld.setMaxPlayers(0)
                client.emit(gameEvents.playerJoinRoom, { d: `[@${playerID}@,0]` })
            })

            client.on(gameEvents.playerJoinFullRoom, (data) => {
                let playersInRoom = room.getPlayers()
                expect(_.size(playersInRoom)).to.equal(0)
                gameWorld.setDefaultConfig()
                done()
            })
        })
    })

    describe('Player enters safe area', () => {
        it('should decrease player hp when out of safe area', (done) => {
            let client, playerID, gameWorld, room
            client = io.connect(SOCKET_URL, options)
            client.on('connect', (data) => {
                room = GameManager.getRoom('0')
                gameWorld = room.gameWorld
                gameWorld.setDamageInterval(0)
                gameWorld.setMaxPlayers(10)
                client.emit(gameEvents.playerJoinGame, { d: '[@1234@,@abcd@]' })
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

    
    describe('Player leaves the room', () => {
        it('should reset gameWorld when last player leaves', (done) => {
            let client, playerID, gameWorld, room
            client = io.connect(SOCKET_URL, options)
            client.on('connect', (data) => {
                room = GameManager.getRoom('0')
                gameWorld = room.gameWorld
                gameWorld.setMaxPlayers(1)
                client.emit(gameEvents.playerJoinGame, { d: '[@1234@,@abcd@]' })
            })

            client.on(gameEvents.playerJoinGame, (data) => {
                playerID = data.d[0]
                client.emit(gameEvents.playerJoinRoom, { d: `[@${playerID}@,0]` })
            })

            client.on(gameEvents.playerJoinRoom, (data) => {
                gameWorld.reset = sinon.spy()
                GameManager.getPlayer(playerID).leaveCurrentRoom()
                expect(gameWorld.reset).to.have.been.calledOnce
                gameWorld.setDefaultConfig()
                client.disconnect()
                done()
            })
        })
    })
})

