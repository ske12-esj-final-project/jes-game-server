const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const server = require('http').Server(app)
const _ = require('lodash')
const shortid = require('shortid')
const path = require('path')
const io = require('socket.io')(server)
const axios = require('axios')

const Room = require('./model/room')
const GameManager = require('./managers/game')
const RoomManager = require('./managers/room')

const gameEvents = require('./constants/events')


const APP_CONFIG = require('./config.json')

const API = require('./constants/api')

console.log('GAME-SERVER VERSION :: ', APP_CONFIG.GAME_VERSION)

const gameWorldConfig1v1 = require('./config/gameworld1v1')

let roomA = new Room(io, 'Room สอนหน่อยๆ', '0')
let roomB = new Room(io, 'Room หยุดที', '1')
let room1v1 = new Room(io,'Room 1-1','2',gameWorldConfig1v1)
let roomhod = new Room(io,'Room โหดจังครับ','3',gameWorldConfig1v1)
let roomManager

const cors = require('cors')

app.options('*', cors())
app.use(bodyParser.json())

io.on('connection', (socket) => {
    roomManager = new RoomManager(socket)

    roomManager.addRoom(roomA)
    roomManager.addRoom(roomB)
    roomManager.addRoom(room1v1)
    roomManager.addRoom(roomhod)

    socket.playerID = shortid.generate()

    socket.on('disconnect', () => {
        let player = GameManager.getPlayer(socket.playerID)
        if (player) player.leaveCurrentRoom()
        roomManager.onPlayerDisconnect(socket.playerID)
        console.log('disconect-pid',socket.playerID)
        io.emit(gameEvents.playerDisconnect, { d: socket.playerID })
        console.log('remain # players', _.size(GameManager.getPlayers()))
    })
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
    console.log(`Listen on http://localhost:${PORT}`,new Date())
})


const checkUserID = (userID) => {
    console.log('checkuserID', userID)
    console.log("#p", _.size(GameManager.getPlayers()))
    if (!userID) {
        return new Error("no userID")
    }
    else {
        // check token is exist
        let players = GameManager.getPlayers()
        for (let key in players) {
            let p = players[key]
            if (userID === p.userID) {
                return new Error("userID is existed")
            }
        }

    }
    return null
}
app.post('/login', (req, res) => {
    let token = ""

    let payload = {
        username: req.body.username,
        password: req.body.password,
    }
    axios.post(API.USER + "/login", payload).then(login_response => {
        token = login_response.data.token
        return token
    }).then(token => {
        axios.get(API.USER + '/me', {
            "headers": { "access-token": token }
        }).then((me_response) => {
            let userID = me_response.data.id

            let err = checkUserID(userID)
            if (err) {
                res.status(500).send({ message: err.message })
                return
            }
            res.send({ auth: true, token: token })
        })
    }).catch(err => {
        console.log('error', err)
        res.status(500).send(err)
    })
})


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/index.html'))
})


app.get('/p', (req, res) => {
    let ps = _.map(GameManager.getPlayers(), p => {
        return {
            "userID": p.userID,
            "username": p.username,
            "playerID":p.playerID
        }
    })
    res.json(ps)
})

app.get('/r', (req, res) => {
    GameManager.resetPlayer()
    res.send("ok")
})

module.exports = server