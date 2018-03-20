const _ = require('lodash')
const { expect } = require('chai')

const io = require('socket.io-client')
const GameManager = require('../managers/game')
const GameWorld = require(`../managers/gameworld`)
const Player = require('../managers/player')
const defaultConfig = require('../config/gameworld')

let options = {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false
};

describe('Gameworld', () => {
    let gameworld

    beforeEach(() => {
        gameworld = new GameWorld(io, defaultConfig)
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

            let resultList = gameworld.assignRandomPositions(items, spawnPoints)
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
            gameworld.calculateSafeArea()
            expect(gameworld.safeArea.position).to.deep.equal({ x: 300, y: 3, z: 60 })
        })
        
        it('should calculate safe area correctly', () => {
            let player1 = new Player(null, 'p1', 'Player_1')
            let player2 = new Player(null, 'p2', 'Player_2')
            let player3 = new Player(null, 'p3', 'Player_3')

            player1.position = { x: -100, y: 25, z: 20 }
            player2.position = { x: 30, y: 0, z: -180 }
            player3.position = { x: 160, y: 15, z: 40 }

            GameManager.addPlayer(player1.playerID, player1)
            GameManager.addPlayer(player2.playerID, player2)
            GameManager.addPlayer(player3.playerID, player3)

            gameworld.calculateSafeArea()

            expect(gameworld.safeArea.position).to.deep.equal({ x: 330, y: 3, z: -40 })
        })
    })
})