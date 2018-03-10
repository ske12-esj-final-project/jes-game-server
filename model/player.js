
module.exports = class {
    constructor(playerID, x, y, z, username) {
        this.playerID = playerID
        this.x = x
        this.y = y
        this.z = z
        this.rotate = {
            x: null,
            y: null
        }
        this.username = username
        this.hp = 100
        this.currentRoom = null
        this.currentEquitment = 0
    }
}