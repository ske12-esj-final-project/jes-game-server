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

let roomA = new Room(io, 'Room A', '0')
let roomB = new Room(io, 'Room B', '1')
let roomManager

const cors = require('cors')

app.options('*', cors())
app.use(bodyParser.json())

io.on('connection', (socket) => {
    roomManager = new RoomManager(socket)
    roomManager.addRoom(roomA)
    roomManager.addRoom(roomB)
    socket.playerID = shortid.generate()

    socket.on('disconnect', () => {
        let player = GameManager.getPlayer(socket.playerID)
        if (player) player.leaveCurrentRoom()
        roomManager.onPlayerDisconnect()
        io.emit(gameEvents.playerDisconnect, { d: socket.playerID })
    })
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
    console.log(`Listen on http://localhost:${PORT}`)
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
                return new Error("userID is exited")
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
                return res.status(500).send({ message: err.message })
            }

            return res.send({ auth: true, token: token })
        })
    }).catch(err => {
        console.log('error', err)
        res.status(500).send(err)
    })
})


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/index.html'))
})


module.exports = server