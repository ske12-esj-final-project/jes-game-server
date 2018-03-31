const _ = require('lodash')
const axios = require('axios')
const MockAdapter = require('axios-mock-adapter')
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
const API = require('../constants/api')
const GAME_STATE = require('../constants/gamestate')

let options = {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false
}

let axiosMock

describe('Events', () => {

    beforeEach(() => {
        axiosMock = new MockAdapter(axios)
        axiosMock.onGet(API.USER + '/me', {
            "headers": { "access-token": 'abcd' }
        }).replyOnce(200, {
            id: 'user_id_1',
            username: '1234'
        })

        axiosMock.onGet(API.USER + '/me', {
            "headers": { "access-token": 'defg' }
        }).replyOnce(200, {
            id: 'user_id_2',
            username: '5678'
        })
    })

    afterEach(() => {
        axiosMock.reset()
        GameManager.instance = null
    })

    describe('Player join game', () => {
        let client
        beforeEach(() => {
            client = io.connect(SOCKET_URL, options)
            client.on('connect', (data) => {
                client.emit(gameEvents.playerJoinGame, { d: '[@1234@,@abcd@]' })
            })
        })

        it('should add player to the list', (done) => {
            client.on(gameEvents.playerJoinGame, (data) => {
                let player = GameManager.getPlayer(data.d[0])
                expect(player).to.not.be.undefined
                client.disconnect()
                done()
            })
        })

        it('should add player with client username', (done) => {
            client.on(gameEvents.playerJoinGame, (data) => {
                let player = GameManager.getPlayer(data.d[0])
                expect(player.username).to.equal('1234')
                client.disconnect()
                done()
            })
        })
    })

    describe('Player join room', () => {
        let client, playerID, gameWorld, room

        beforeEach(() => {
            client = io.connect(SOCKET_URL, options)
            client.on('connect', (data) => {
                room = GameManager.getRoom('0')
                gameWorld = room.gameWorld
                client.emit(gameEvents.playerJoinGame, { d: '[@1234@,@abcd@]' })
            })
        })

        it('should add player to room', (done) => {
            client.on(gameEvents.playerJoinGame, (data) => {
                playerID = data.d[0]
                gameWorld.setMaxPlayers(1)
                client.emit(gameEvents.playerJoinRoom, { d: `[@${playerID}@,0]` })
            })

            client.on(gameEvents.playerJoinRoom, (data) => {
                let player = room.getPlayer(playerID)
                expect(playerID).to.not.be.undefined
                gameWorld.setDefaultConfig()
                client.disconnect()
                done()
            })
        })

        it('should not add player if room is full', (done) => {
            client.on(gameEvents.playerJoinGame, (data) => {
                playerID = data.d[0]
                gameWorld.setMaxPlayers(0)
                client.emit(gameEvents.playerJoinRoom, { d: `[@${playerID}@,0]` })
            })

            client.on(gameEvents.playerJoinFullRoom, (data) => {
                let playersInRoom = room.getPlayers()
                expect(_.size(playersInRoom)).to.equal(0)
                gameWorld.setDefaultConfig()
                client.disconnect()
                done()
            })
        })
    })

    describe('Player enters safe area', () => {
        let client, playerID, gameWorld, room

        beforeEach(() => {
            client = io.connect(SOCKET_URL, options)
            client.on('connect', (data) => {
                room = GameManager.getRoom('0')
                gameWorld = room.gameWorld
                gameWorld.setDamageInterval(0)
                gameWorld.setMaxPlayers(2)
                client.emit(gameEvents.playerJoinGame, { d: '[@1234@,@abcd@]' })
            })

            client.on(gameEvents.playerJoinGame, (data) => {
                playerID = data.d[0]
                client.emit(gameEvents.playerJoinRoom, { d: `[@${playerID}@,0]` })
            })
        })

        it('should decrease player hp when out of safe area', (done) => {
            client.on(gameEvents.playerJoinRoom, (data) => {
                client.emit(gameEvents.playerOutSafeArea)
            })

            client.on(gameEvents.updatePlayersStatus, (data) => {
                let playerHealth = parseInt(data.d[2])
                expect(playerHealth).to.equal(95)
                GameManager.getPlayer(playerID).onPlayerBackSafeArea()
                gameWorld.setDefaultConfig()
                client.disconnect()
                done()
            })
        })

        it('should send data when player cannot escape safe area correctly', (done) => {
            client.on(gameEvents.playerJoinRoom, (data) => {
                GameManager.getPlayer(playerID).hp = 5
                client.emit(gameEvents.playerOutSafeArea)
            })

            client.on(gameEvents.getVictimData, (data) => {
                GameManager.getPlayer(playerID).onPlayerBackSafeArea()
                expect(data.d[0]).to.equal('1234')
                expect(data.d[1]).to.equal(0)
                expect(data.d[2]).to.equal(0)
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

    describe('Players kill each other', () => {
        let player, victim, playerID, victimID, gameWorld, room, expectedIndex

        beforeEach(() => {
            room = GameManager.getRoom('0')
            gameWorld = room.gameWorld
            gameWorld.setMaxPlayers(10)

            player = io.connect(SOCKET_URL, options)
            player.on('connect', (data) => {
                player.emit(gameEvents.playerJoinGame, { d: '[@1234@,@abcd@]' })
            })

            player.on(gameEvents.playerJoinGame, (data) => {
                playerID = data.d[0]
                player.emit(gameEvents.playerJoinRoom, { d: `[@${playerID}@,0]` })
            })

            victim = io.connect(SOCKET_URL, options)
            victim.on('connect', (data) => {
                victim.emit(gameEvents.playerJoinGame, { d: '[@5678@,@defg@]' })
            })

            victim.on(gameEvents.playerJoinGame, (data) => {
                victimID = data.d[0]
                victim.emit(gameEvents.playerJoinRoom, { d: `[@${victimID}@,0]` })
            })

            victim.on(gameEvents.playerJoinRoom, (data) => {
                expectedIndex = 4
                room.getPlayer(playerID).currentEquipment = expectedIndex
                let damage = 100
                player.emit(gameEvents.checkShootHit, { d: `[@${victimID}@,${damage}]` })
            })
        })

        it('should send back kill information correctly', (done) => {
            player.on(gameEvents.playerDie, (data) => {
                expect(data.d[0]).to.equal(victimID)
                expect(data.d[1]).to.equal('1234')
                expect(data.d[2]).to.equal('5678')
                expect(data.d[3]).to.equal(expectedIndex)
                gameWorld.setDefaultConfig()
                player.disconnect()
                victim.disconnect()
                done()
            })
        })

        it('should increase number player kill by 1', (done) => {
            player.on(gameEvents.playerDie, (data) => {
                expect(room.getPlayer(playerID).numberOfKill).to.equal(1)
                player.disconnect()
                victim.disconnect()
                done()
            })
        })

        it('should reduce number of players alive by 1', (done) => {
            player.on(gameEvents.updateNumberOfAlivePlayer, (data) => {
                expect(data.d[0]).to.equal(1)
                gameWorld.setDefaultConfig()
                player.disconnect()
                victim.disconnect()
                done()
            })
        })

        it('should everyone in the room knows this player dies', (done) => {
            player.on(gameEvents.updatePlayersStatus, (data) => {
                expect(data.d[2]).to.equal(0)
            })

            victim.on(gameEvents.updatePlayersStatus, (data) => {
                expect(data.d[2]).to.equal(0)
                player.disconnect()
                victim.disconnect()
                done()
            })
        })
    })
})

