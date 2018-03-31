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

describe('Broadcasting', () => {

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

    describe('Player view rooms', () => {
        let player, victim, playerID, gameWorld, room
        beforeEach(() => {
            player = io.connect(SOCKET_URL, options)
            player.on('connect', (data) => {
                room = GameManager.getRoom('0')
                gameWorld = room.gameWorld
                gameWorld.setMaxPlayers(10)
                player.emit(gameEvents.playerJoinGame, { d: '[@1234@,@abcd@]' })
            })

            victim = io.connect(SOCKET_URL, options)
            victim.on('connect', (data) => {
                victim.emit(gameEvents.playerJoinGame, { d: '[@5678@,@defg@]' })
            })

            player.on(gameEvents.playerJoinGame, (data) => {
                playerID = data.d[0]
                player.emit(gameEvents.playerJoinRoom, { d: `[@${playerID}@,0]` })
            })
        })

        it('should update room info when other player joins any room', (done) => {
            victim.on(gameEvents.updateRoom, (data) => {
                let numPlayers = data.d[0][2]
                expect(numPlayers).to.equal(1)
                gameWorld.setDefaultConfig()
                player.disconnect()
                victim.disconnect()
                done()
            })
        })
    })
})