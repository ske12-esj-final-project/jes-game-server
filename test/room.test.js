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

let axiosMock

describe('Room model', () => {
    io.emit = () => { return }
    io.to = () => { return io }
    io.to('test').emit = () => { return }

    beforeEach(() => {
        let userID = "user"
        axiosMock = new MockAdapter(axios)
        axiosMock.onPost(API.MATCH, { players: [userID] }).replyOnce(200, {
            matchID: "some_match_id"
        })
    })

    afterEach(() => {
        axiosMock.reset()
    })

    describe('onCountdown', () => {
        let room
        beforeEach(() => {
            this.clock = sinon.useFakeTimers()

            let player = new Player(null, 'player', 'Player')
            player.userID = 'user'

            room = new Room(io, 'Test Room', 'test')
            room.addPlayer(player)
            room.gameWorld.setState(GAME_STATE.COUNTDOWN)
            room.onCountdown()
            this.clock.tick(10000)
        })

        afterEach(() => {
            this.clock.restore()
        })

        it('should create match via API when finish countdown', () => {
            setTimeout(() => {
                expect(room.gameWorld.matchID).to.equal('some_match_id')
            }, 0)
        })

        it('should change game state to INGAME', () => {
            expect(room.gameWorld.getState()).to.equal(GAME_STATE.INGAME)
        })
    })

    describe('onUpdateRoomInfo', () => {
        it('should call when someone leaves room', () => {
            let socket = {}
            socket.on = () => { return }
            socket.leave = () => { return }
            let player = new Player(socket, 'player', 'Player')

            room = new Room(io, 'Test Room', 'test')
            player.currentRoom = room
            room.addPlayer(player)

            room.onUpdateRoomInfo = sinon.spy()

            player.leaveCurrentRoom()
            expect(room.onUpdateRoomInfo).to.have.been.calledOnce
        })

        it('should not call when player doesnt join any rooms', () => {
            let player = new Player(null, 'player', 'Player')

            room = new Room(io, 'Test Room', 'test')

            room.onUpdateRoomInfo = sinon.spy()

            player.leaveCurrentRoom()
            expect(room.onUpdateRoomInfo).to.not.have.been.called
        })
    })

    describe('canStartMatch', () => {
        let room, player
        beforeEach(() => {
            room = new Room(io, 'Test Room', 'test')
            player = new Player(null, 'player', 'Player')
        })

        it('should start match if room is full', () => {
            room.gameWorld.setMaxPlayers(1)
            room.gameWorld.players = [player]
            expect(room.canStartMatch()).to.be.true
        })

        it('should not start match if numPlayers less than majority of maxPlayers', () => {
            room.gameWorld.setMaxPlayers(6)
            room.gameWorld.players = [player, player, player]
            expect(room.canStartMatch()).to.be.false
        })

        it('should not start match if numPlayers less than 2', () => {
            room.gameWorld.setMaxPlayers(2)
            room.gameWorld.players = [player]
            expect(room.canStartMatch()).to.be.false
        })

        it('should not start match if gameState is not OPEN', () => {
            room.gameWorld.setMaxPlayers(2)
            room.gameWorld.setState(GAME_STATE.INGAME)
            room.gameWorld.players = [player, player]
            expect(room.canStartMatch()).to.be.false
        })
    })
})