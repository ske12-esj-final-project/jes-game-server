const _ = require('lodash')
const { expect } = require('chai')

const io = require('socket.io-client')
const PORT = process.env.PORT || 5000
const SOCKET_URL = `http://localhost:${PORT}`

const app = require('../app')
const GameManager = require('../managers/game')
const gameEvents = require('../constants/events')

let options = {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false
};

describe('Room Manager', () => {
    afterEach(() => {
        GameManager.instance = null
    })

    describe('Player join game', () => {
        let client
        beforeEach(() => {
            client = io.connect(SOCKET_URL, options)
            client.on('connect', (data) => {
                client.emit(gameEvents.playerJoinGame, { username: '1234' })
            })
        })
        
        it('should add player to the list', () => {
            client.on(gameEvents.playerJoinGame, (data) => {
                let player = GameManager.getPlayer(data.d[0])
                expect(player).to.not.be.null
                client.disconnect()
                done()
            })
        })

        it('should add player with client username', () => {
            client.on(gameEvents.playerJoinGame, (data) => {
                let player = GameManager.getPlayer(data.d[0])
                expect(player.username).to.equal('1234')
                client.disconnect()
                done()
            })
        })
    })

    describe('Player join room', () => {
        let client, playerID
        beforeEach(() => {
            client = io.connect(SOCKET_URL, options)
            client.on('connect', (data) => {
                client.emit(gameEvents.playerJoinGame, { username: '1234' })
            })
            
            client.on(gameEvents.playerJoinGame, (data) => {
                playerID = data.d[0]
                client.emit(gameEvents.playerJoinRoom, { d: [`@${playerID}@`, '0'] })
            })
        })

        it('should add player to room', () => {
            client.on(gameEvents.playerJoinRoom, (data) => {
                expect(GameManager.getRoom('0').getPlayer(playerID)).to.not.be.null
                client.disconnect()
                done()
            })
        })

        it('should not add player if room is full', () => {
            client.on(gameEvents.playerJoinRoom, (data) => {
                client.disconnect()
                done()
            })
        })
    })
})

