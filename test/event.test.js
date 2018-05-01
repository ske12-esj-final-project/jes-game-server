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

describe('Events', () => {

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

        axiosMock.onPost(API.KILL, {
            matchID: "some_match_id",
            playerID: "user_id_1",
            victimID: "user_id_2",
            victimPos: { x: null, y: null, z: null },
            weaponUsed: "Shotgun"
        }).replyOnce(200, "Killfeed created")

        axiosMock.onPost(API.KILL, {
            playerID: "user_id_1",
            victimID: "user_id_1",
            victimPos: { x: null, y: null, z: null },
            weaponUsed: "Safe Area"
        }).replyOnce(200, "Killfeed created")

        axiosMock.onPut(API.USER + '/u/user_id_1/score', {
            score: 90
        }).replyOnce(200, 'Score updated')

        axiosMock.onPut(API.MATCH + '/matches/some_match_id', {
            duration: 0.01,
            winner: 'user_id_1'
        }).replyOnce(200, 'Match updated')

        axiosMock.onPut(API.MATCH + '/matches/some_match_id', {
            duration: 0.02,
            winner: 'user_id_1'
        }).replyOnce(200, 'Match updated')
    })

    afterEach(() => {
        axiosMock.reset()
        GameManager.instance = null
    })

    describe('Player join game', () => {
        let client
        beforeEach(() => {
            client = io.connect(SOCKET_URL, options)
            client.on('connect', (data) => {
                client.emit(gameEvents.playerJoinGame, { d: '[@1234@,@abcd@]' })
            })
        })

        it('should add player to the list', (done) => {
            client.on(gameEvents.playerJoinGame, (data) => {
                let player = GameManager.getPlayer(data.d[0])
                expect(player).to.not.be.undefined
                client.disconnect()
                done()
            })
        })

        it('should add player with client username', (done) => {
            client.on(gameEvents.playerJoinGame, (data) => {
                let player = GameManager.getPlayer(data.d[0])
                expect(player.username).to.equal('1234')
                client.disconnect()
                done()
            })
        })
    })

    describe('Player join room', () => {
        let client, playerID, gameWorld, room

        beforeEach(() => {
            client = io.connect(SOCKET_URL, options)
            client.on('connect', (data) => {
                room = GameManager.getRoom('0')
                gameWorld = room.gameWorld
                client.emit(gameEvents.playerJoinGame, { d: '[@1234@,@abcd@]' })
            })
        })

        it('should add player to room', (done) => {
            client.on(gameEvents.playerJoinGame, (data) => {
                playerID = data.d[0]
                gameWorld.setMaxPlayers(1)
                client.emit(gameEvents.playerJoinRoom, { d: `[@${playerID}@,0]` })
            })

            client.on(gameEvents.playerJoinRoom, (data) => {
                let player = room.getPlayer(playerID)
                expect(playerID).to.not.be.undefined
                gameWorld.reset()
                gameWorld.setDefaultConfig()
                client.disconnect()
                done()
            })
        })

        it('should not add player if room is full', (done) => {
            client.on(gameEvents.playerJoinGame, (data) => {
                playerID = data.d[0]
                gameWorld.setMaxPlayers(0)
                client.emit(gameEvents.playerJoinRoom, { d: `[@${playerID}@,0]` })
            })

            client.on(gameEvents.playerCannotJoinRoom, (data) => {
                let playersInRoom = room.getPlayers()
                expect(_.size(playersInRoom)).to.equal(0)
                gameWorld.reset()
                gameWorld.setDefaultConfig()
                client.disconnect()
                done()
            })
        })
    })

    describe('Players setup', () => {
        let client, player, friend, playerID, friendID, gameWorld, room, expectedIndex

        beforeEach(() => {
            client = io.connect(SOCKET_URL, options)
            client.on('connect', (data) => {
                room = GameManager.getRoom('0')
                gameWorld = room.gameWorld
                gameWorld.setMaxPlayers(10)
                client.emit(gameEvents.playerJoinGame, { d: '[@1234@,@abcd@]' })
            })

            client.on(gameEvents.playerJoinGame, (data) => {
                playerID = data.d[0]
                client.emit(gameEvents.playerJoinRoom, { d: `[@${playerID}@,0]` })
            })

            client.on(gameEvents.playerJoinRoom, (data) => {
                player = room.getPlayer(playerID)
                friend = io.connect(SOCKET_URL, options)
                friend.on('connect', (data) => {
                    friend.emit(gameEvents.playerJoinGame, { d: '[@5678@,@defg@]' })
                })

                friend.on(gameEvents.playerJoinGame, (data) => {
                    friendID = data.d[0]
                    friend.emit(gameEvents.playerJoinRoom, { d: `[@${friendID}@,0]` })
                })

                friend.on(gameEvents.playerJoinRoom, (data) => {
                    friend.emit(gameEvents.playerSetupPlayer, { d: '[10]' })
                })
            })
        })

        it('should send friend data to client correctly', (done) => {
            client.on(gameEvents.playerEnemyCreated, (data) => {
                expect(data.d[0]).to.equal(friendID)
                gameWorld.reset()
                gameWorld.setDefaultConfig()
                client.disconnect()
                friend.disconnect()
                done()
            })
        })
    })

    describe('Player enters safe area', () => {
        let client, playerID, gameWorld, room

        beforeEach(() => {
            client = io.connect(SOCKET_URL, options)
            client.on('connect', (data) => {
                room = GameManager.getRoom('0')
                gameWorld = room.gameWorld
                gameWorld.setDamageInterval(0)
                gameWorld.setMaxPlayers(2)
                client.emit(gameEvents.playerJoinGame, { d: '[@1234@,@abcd@]' })
            })

            client.on(gameEvents.playerJoinGame, (data) => {
                playerID = data.d[0]
                client.emit(gameEvents.playerJoinRoom, { d: `[@${playerID}@,0]` })
            })
        })

        it('should decrease player hp when out of safe area', (done) => {
            client.on(gameEvents.playerJoinRoom, (data) => {
                client.emit(gameEvents.playerOutSafeArea)
            })

            client.on(gameEvents.updatePlayersStatus, (data) => {
                let playerHealth = parseInt(data.d[2])
                expect(playerHealth).to.equal(95)
                GameManager.getPlayer(playerID).onPlayerBackSafeArea()
                gameWorld.reset()
                gameWorld.setDefaultConfig()
                client.disconnect()
                done()
            })
        })

        it('should send data when player cannot escape safe area correctly', (done) => {
            client.on(gameEvents.playerJoinRoom, (data) => {
                GameManager.getPlayer(playerID).hp = 5
                client.emit(gameEvents.playerOutSafeArea)
            })

            client.on(gameEvents.getVictimData, (data) => {
                GameManager.getPlayer(playerID).onPlayerBackSafeArea()
                expect(data.d[0]).to.equal('1234')
                expect(data.d[1]).to.equal(1)
                expect(data.d[2]).to.equal(0)
                gameWorld.reset()
                gameWorld.setDefaultConfig()
                client.disconnect()
                done()
            })
        })
    })

    describe('Players kill each other', () => {
        let client, player, victim, playerID, victimID, gameWorld, room, expectedIndex

        beforeEach(() => {
            client = io.connect(SOCKET_URL, options)
            client.on('connect', (data) => {
                room = GameManager.getRoom('0')
                gameWorld = room.gameWorld
                gameWorld.setMaxPlayers(10)
                client.emit(gameEvents.playerJoinGame, { d: '[@1234@,@abcd@]' })
            })

            client.on(gameEvents.playerJoinGame, (data) => {
                playerID = data.d[0]
                client.emit(gameEvents.playerJoinRoom, { d: `[@${playerID}@,0]` })
            })

            client.on(gameEvents.playerJoinRoom, (data) => {
                player = room.getPlayer(playerID)
                victim = io.connect(SOCKET_URL, options)
                victim.on('connect', (data) => {
                    victim.emit(gameEvents.playerJoinGame, { d: '[@5678@,@defg@]' })
                })

                victim.on(gameEvents.playerJoinGame, (data) => {
                    victimID = data.d[0]
                    victim.emit(gameEvents.playerJoinRoom, { d: `[@${victimID}@,0]` })
                })

                victim.on(gameEvents.playerJoinRoom, (data) => {
                    expectedIndex = 4
                    player.currentEquipment = expectedIndex
                    let damage = 100
                    gameWorld.setState(GAME_STATE.INGAME)
                    gameWorld.matchID = "some_match_id"
                    client.emit(gameEvents.checkShootHit, { d: `[@${victimID}@,${damage}]` })
                })
            })
        })

        it('should not call hitPlayer when victim dies', (done) => {
            client.on(gameEvents.updateNumberOfAlivePlayer, (data) => {
                player.hitPlayer = sinon.spy()
                client.emit(gameEvents.checkShootHit, { d: `[@${victimID}@,100]` })
                expect(player.hitPlayer).to.not.have.been.called
                gameWorld.reset()
                gameWorld.setDefaultConfig()
                client.disconnect()
                victim.disconnect()
                done()
            })
        })
    })

    describe('Player picks the weapon', () => {
        let client, player, playerID, gameWorld, room, weapon

        beforeEach(() => {
            client = io.connect(SOCKET_URL, options)
            client.on('connect', (data) => {
                room = GameManager.getRoom('0')
                gameWorld = room.gameWorld
                gameWorld.setDamageInterval(0)
                client.emit(gameEvents.playerJoinGame, { d: '[@1234@,@abcd@]' })
            })

            client.on(gameEvents.playerJoinGame, (data) => {
                playerID = data.d[0]
                client.emit(gameEvents.playerJoinRoom, { d: `[@${playerID}@,0]` })
            })

            client.on(gameEvents.playerJoinRoom, (data) => {
                player = room.getPlayer(playerID)
                weapon = gameWorld.equipments[0]
                client.emit(gameEvents.getEquipment, { d: `[@${weapon.uid}@]` })
            })
        })

        it('should add weapon to gottenEquipmentList', (done) => {
            client.on(gameEvents.getEquipment, (data) => {
                let pickedWeapon = _.find(gameWorld.gottenEquipmentList, { 'uid': weapon.uid })
                expect(pickedWeapon).to.not.be.undefined
                gameWorld.reset()
                gameWorld.setDefaultConfig()
                client.disconnect()
                done()
            })
        })

        it('should remove weapon from equipment', (done) => {
            client.on(gameEvents.getEquipment, (data) => {
                let pickedWeapon = _.find(gameWorld.equipments, { 'uid': weapon.uid })
                expect(pickedWeapon).to.be.undefined
                gameWorld.reset()
                gameWorld.setDefaultConfig()
                client.disconnect()
                done()
            })
        })

        describe('Player then discards the weapon', () => {
            beforeEach(() => {
                client.on(gameEvents.getEquipment, (data) => {
                    client.emit(gameEvents.discardEquipment, { d: `[@${weapon.uid}@,9,0,0,0]` })
                })
            })

            it('should remove weapon from gottenEquipmentList', (done) => {
                client.on(gameEvents.setupEquipment, (data) => {
                    let discardedWeapon = _.find(gameWorld.gottenEquipmentList, { 'uid': weapon.uid })
                    expect(discardedWeapon).to.be.undefined
                    gameWorld.reset()
                    gameWorld.setDefaultConfig()
                    client.disconnect()
                    done()
                })
            })

            it('should add discarded weapon to equipment list', (done) => {
                client.on(gameEvents.setupEquipment, (data) => {
                    let discardedWeapon = _.find(gameWorld.equipments, { 'uid': weapon.uid })
                    expect(discardedWeapon).to.not.be.undefined
                    gameWorld.reset()
                    gameWorld.setDefaultConfig()
                    client.disconnect()
                    done()
                })
            })

            it('should set current ammo of discarded weapon correctly', (done) => {
                client.on(gameEvents.setupEquipment, (data) => {
                    let discardedWeapon = _.find(gameWorld.equipments, { 'uid': weapon.uid })
                    expect(discardedWeapon.capacity).to.equal(9)
                    gameWorld.reset()
                    gameWorld.setDefaultConfig()
                    client.disconnect()
                    done()
                })
            })
        })
    })

    describe('Player picks the ammo box', () => {
        let client, player, playerID, gameWorld, room, ammoBox

        beforeEach(() => {
            client = io.connect(SOCKET_URL, options)
            client.on('connect', (data) => {
                room = GameManager.getRoom('0')
                gameWorld = room.gameWorld
                gameWorld.setDamageInterval(0)
                client.emit(gameEvents.playerJoinGame, { d: '[@1234@,@abcd@]' })
            })

            client.on(gameEvents.playerJoinGame, (data) => {
                playerID = data.d[0]
                client.emit(gameEvents.playerJoinRoom, { d: `[@${playerID}@,0]` })
            })

            client.on(gameEvents.playerJoinRoom, (data) => {
                player = room.getPlayer(playerID)
                ammoBox = gameWorld.bulletList[0]
                client.emit(gameEvents.getBullet, { d: `[@${ammoBox.uid}@]` })
            })
        })

        it('should remove ammo box from the list', (done) => {
            client.on(gameEvents.getBullet, (data) => {
                let pickedAmmo = _.find(gameWorld.bulletList, { 'uid': ammoBox.uid })
                expect(pickedAmmo).to.be.undefined
                gameWorld.reset()
                gameWorld.setDefaultConfig()
                client.disconnect()
                done()
            })
        })
    })

    describe('Player picks the medical kit', () => {
        let client, player, playerID, gameWorld, room

        beforeEach(() => {
            client = io.connect(SOCKET_URL, options)
            client.on('connect', (data) => {
                room = GameManager.getRoom('0')
                gameWorld = room.gameWorld
                gameWorld.setDamageInterval(0)
                client.emit(gameEvents.playerJoinGame, { d: '[@1234@,@abcd@]' })
            })

            client.on(gameEvents.playerJoinGame, (data) => {
                playerID = data.d[0]
                client.emit(gameEvents.playerJoinRoom, { d: `[@${playerID}@,0]` })
            })

            client.on(gameEvents.playerJoinRoom, (data) => {
                player = room.getPlayer(playerID)
                player.hp = 10
                let medkit = _.find(gameWorld.equipments, { 'weaponIndex': 11 })
                client.emit(gameEvents.getEquipment, { d: `[@${medkit.uid}@]` })
            })
        })

        it('should heal player hp by 30', (done) => {
            client.on(gameEvents.getEquipment, (data) => {
                expect(player.hp).to.equal(40)
                gameWorld.reset()
                gameWorld.setDefaultConfig()
                client.disconnect()
                done()
            })
        })

        it('should not heal player if hp is already full', (done) => {
            client.on(gameEvents.playerJoinRoom, (data) => {
                player = room.getPlayer(playerID)
                player.hp = 100
                let medkit = _.find(gameWorld.equipments, 'weaponIndex', 11)
                client.emit(gameEvents.getEquipment, { d: `[@${medkit.uid}@]` })
            })

            client.on(gameEvents.getEquipment, (data) => {
                expect(player.hp).to.equal(100)
                gameWorld.reset()
                gameWorld.setDefaultConfig()
                client.disconnect()
                done()
            })
        })
    })

    describe('Player leaves the room', () => {
        it('should reset gameWorld when last player leaves', (done) => {
            let client, playerID, gameWorld, room
            client = io.connect(SOCKET_URL, options)
            client.on('connect', (data) => {
                room = GameManager.getRoom('0')
                gameWorld = room.gameWorld
                gameWorld.setMaxPlayers(1)
                client.emit(gameEvents.playerJoinGame, { d: '[@1234@,@abcd@]' })
            })

            client.on(gameEvents.playerJoinGame, (data) => {
                playerID = data.d[0]
                client.emit(gameEvents.playerJoinRoom, { d: `[@${playerID}@,0]` })
            })

            client.on(gameEvents.playerJoinRoom, (data) => {
                gameWorld.reset = sinon.spy()
                GameManager.getPlayer(playerID).leaveCurrentRoom()
                expect(gameWorld.reset).to.have.been.calledOnce
                gameWorld.setDefaultConfig()
                client.disconnect()
                done()
            })
        })
    })
})

