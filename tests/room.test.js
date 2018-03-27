const _ = require('lodash')
const axios = require('axios')
const MockAdapter = require('axios-mock-adapter')
const chai = require('chai')
const sinon = require('sinon')
const expect = chai.expect

const io = require('socket.io-client')
const Player = require('../managers/player')
const Room = require('../model/room')
const API = require('../constants/api')
const GAME_STATE = require('../constants/gamestate')

describe('Room model', () => {
    io.emit = () => { return }
    io.to = () => { return io }
    io.to('test').emit = () => { return }

    describe('onCountdown', () => {
        beforeEach(() => {
            this.clock = sinon.useFakeTimers()
        })

        afterEach(() => {
            this.clock.restore()
        })

        it('should create match via API when finish', () => {
            let player = new Player(null, 'player', 'Player')
            player.userID = 'user'
            let axiosMock = new MockAdapter(axios)
            axiosMock.onPost(API.MATCH, { players: [player.userID] }).reply(200, {
                matchID: 'some_match_id'
            })

            let room = new Room(io, 'Test Room', 'test')
            room.addPlayer(player)
            room.gameWorld.setState(GAME_STATE.COUNTDOWN)
            room.onCountdown()
            this.clock.tick(10000)
            
            setTimeout(() => {
                expect(room.gameWorld.matchID).to.equal('some_match_id')
             }, 0)
        })
    })
})