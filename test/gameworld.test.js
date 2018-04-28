const _ = require('lodash')
const chai = require('chai')
const sinon = require('sinon')
const expect = chai.expect

const io = require('socket.io-client')
const GameWorld = require(`../managers/gameworld`)
const Player = require('../managers/player')
const DEFAULT_CONFIG = require('../config/gameworld')
const API = require('../constants/api')
const GAME_STATE = require('../constants/gamestate')
const SAFE_AREA_STATE = require('../constants/safestate')
const {assignRandomPositions} = require('../utils/createEquipmentItemList')
chai.use(require('sinon-chai'))

let options = {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false
}

describe('Gameworld', () => {
    let gameWorld
    io.emit = () => { return }

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

            let resultList = assignRandomPositions(items, spawnPoints)
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
            gameWorld.setState(GAME_STATE.INGAME)
            this.gameInterval = gameWorld.createGameInterval()
        })

        afterEach(() => {
            this.clock.restore()
        })

        it(`should warn safe area all players when safeAreaDuration ${DEFAULT_CONFIG.warningTime} ms`, () => {
            gameWorld.onWarningSafeArea = sinon.spy()
            this.clock.tick(DEFAULT_CONFIG.warningTime + 1000)
            expect(gameWorld.safeArea.isWarning()).to.be.true
            expect(gameWorld.onWarningSafeArea).to.have.been.calledOnce
        })

        it(`should trigger safe area all players when safeAreaDuration ${DEFAULT_CONFIG.triggerTime} ms`, () => {
            gameWorld.onMoveSafeArea = sinon.spy()
            this.clock.tick(DEFAULT_CONFIG.triggerTime + 2000)
            expect(gameWorld.safeArea.isTriggering()).to.be.true
            expect(gameWorld.onMoveSafeArea).to.have.been.calledOnce
        })

        it('should not send back safe area data when safe area is at smallest', () => {
            let player1 = new Player(null, 'p1', 'Player_1')
            player1.position = { x: -100, y: 25, z: 20 }
            gameWorld.players[player1.playerID] = player1
            this.clock.tick((gameWorld.config.triggerTime + gameWorld.config.restrictTime) * 7)
            expect(gameWorld.safeArea.scale).to.deep.equal({ x: 0, y: 40, z: 0 })
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
            expect(_.size(gameWorld.itemList)).to.equal(_.size(expectedItemList))
        })

        it('should reset safeAreaDuration back', () => {
            gameWorld.reset()
            expect(gameWorld.safeAreaDuration).to.equal(0)
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