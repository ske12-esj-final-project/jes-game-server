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

})

