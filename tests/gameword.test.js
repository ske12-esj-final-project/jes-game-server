const _ = require('lodash')
const chai = require('chai')
const sinon = require('sinon')
chai.use(require('sinon-chai'))
const expect = chai.expect

const io = require('socket.io-client')
const GameManager = require('../managers/game')
const GameWorld = require(`../managers/gameworld`)
const Room = require('../model/room')
const Player = require('../managers/player')
const DEFAULT_CONFIG = require('../config/gameworld')
const GAME_STATE = require('../constants/gamestate')
const SAFE_AREA_STATE = require('../constants/safestate')

let options = {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false
}

describe('Gameworld', () => {
    let gameWorld

    beforeEach(() => {
        gameWorld = new GameWorld(io, DEFAULT_CONFIG)
    })

    describe('assignRandomPositions', () => {
        it('should be same size of set of result and size of result means each item is distinct', () => {
            let item = {
                index: 0,
                position: {
                    x: 0,
                    y: 0,
                    z: 0
                }
            }

            let items = []
            let spawnPoints = []
            for (let i = 0; i < 10; i++) {
                let t = _.clone(item)
                let p = _.clone({ x: 0, y: 0, z: 0 })
                p.x = i
                t.index = i
                spawnPoints.push(p)
                items.push(t)
            }

            let resultList = gameWorld.assignRandomPositions(items, spawnPoints)
            let setResult = {}
            _.map(resultList, (item) => {
                _.set(setResult, JSON.stringify(item.position), {})
            })
            let expectSize = _.size(setResult)
            let size = _.size(resultList)
            expect(size).to.be.equals(expectSize)
        })
    })

    describe('calculateSafeArea', () => {
        it('should not change safe area when no players', () => {
            gameWorld.calculateSafeArea()
            expect(gameWorld.safeArea.position).to.deep.equal({ x: 300, y: 3, z: 60 })
        })

        it('should calculate safe area correctly', () => {
            let player1 = new Player(null, 'p1', 'Player_1')
            let player2 = new Player(null, 'p2', 'Player_2')
            let player3 = new Player(null, 'p3', 'Player_3')

            player1.position = { x: -100, y: 25, z: 20 }
            player2.position = { x: 30, y: 0, z: -180 }
            player3.position = { x: 160, y: 15, z: 40 }

            gameWorld.players[player1.playerID] = player1
            gameWorld.players[player2.playerID] = player2
            gameWorld.players[player3.playerID] = player3

            gameWorld.calculateSafeArea()

            expect(gameWorld.safeArea.position).to.deep.equal({ x: 330, y: 3, z: -40 })
        })
    })

    describe('update', () => {
        beforeEach(() => {
            this.clock = sinon.useFakeTimers()
        })

        afterEach(() => {
            this.clock.restore()
        })

        it(`should warn safe area all players when duration ${DEFAULT_CONFIG.warningTime} ms`, () => {
            gameWorld.onWarningSafeArea = sinon.spy()
            gameWorld.setState(GAME_STATE.INGAME)
            let gameInterval = gameWorld.createGameInterval()
            this.clock.tick(DEFAULT_CONFIG.warningTime)
            expect(gameWorld.safeArea.isWarning()).to.be.true
            expect(gameWorld.onWarningSafeArea).to.have.been.calledOnce
        })

        it(`should trigger safe area all players when duration ${DEFAULT_CONFIG.triggerTime} ms`, () => {
            gameWorld.onMoveSafeArea = sinon.spy()
            gameWorld.setState(GAME_STATE.INGAME)
            let gameInterval = gameWorld.createGameInterval()
            gameWorld.safeArea.setState(SAFE_AREA_STATE.WARNING)
            this.clock.tick(DEFAULT_CONFIG.triggerTime)
            expect(gameWorld.safeArea.isTriggering()).to.be.true
            expect(gameWorld.onMoveSafeArea).to.have.been.calledOnce
        })
    })

    describe('reset', () => {
        it('should empty all players', () => {
            gameWorld.reset()
            expect(gameWorld.players).to.deep.equal({})
        })

        it('should set equipments back to default', () => {
            let expectedItemList = gameWorld.itemList
            gameWorld.reset()
            expect(gameWorld.itemList).to.deep.equal(expectedItemList)
        })

        // it('should not be called if game state is not END', () => {
        //     gameWorld.reset()
        // })

        it('should reset duration back', () => {
            gameWorld.reset()
            expect(gameWorld.duration).to.equal(0)
        })

        it('should set GAME_STATE back to OPEN', () => {
            gameWorld.reset()
            expect(gameWorld.getState()).to.equal(GAME_STATE.OPEN)
        })

        it('should reset safeArea to be same size', () => {
            gameWorld.reset()
            expect(gameWorld.safeArea.position).to.deep.equal(gameWorld.safeArea.getDefaultPosition())
        })

        it('should reset safeArea to be same scale', () => {
            gameWorld.reset()
            expect(gameWorld.safeArea.scale).to.deep.equal(gameWorld.safeArea.getDefaultScale())
        })

        it('should stop updateSafeArea in the game', () => {
            this.clock = sinon.useFakeTimers()
            gameWorld.updateSafeArea = sinon.spy()
            gameWorld.reset()
            this.clock.tick(1000 / gameWorld.config.tickRate)
            expect(gameWorld.updateSafeArea).to.not.have.been.calledOnce
            this.clock.restore()
        })
    })
})