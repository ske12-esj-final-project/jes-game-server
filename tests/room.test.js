const _ = require('lodash')
const { expect } = require('chai')
const assert = require('assert')

const io = require('socket.io-client')
const PORT = process.env.PORT || 5000
const SOCKET_URL = `http://localhost:${PORT}`

const app = require('../app')
const gameEvents = require('../constants/events')

let options = {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false
};

describe('test socket.io mock', () => {

    it('should be working', () => {
        let client = io.connect(SOCKET_URL, options)
        client.on('connect', (data) => {
            client.emit(gameEvents.playerJoinGame, { username: '1234' })
        })

        client.on(gameEvents.playerJoinGame, (data) => {
            client.playerID = data.d[0]
        })
    })
})

