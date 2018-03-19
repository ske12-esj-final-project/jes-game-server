const _ = require('lodash')
const { expect } = require('chai')
const assert = require('assert')
const io = require('socket.io-client')
const GameWorld = require(`../managers/gameworld`)
const defaultConfig = require('../config/gameworld')

describe('gameworld-manager', () => {
    describe('assignRandomPositions()', () => {
        let gameworld = new GameWorld(io, defaultConfig)

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
})