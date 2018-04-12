/**
 * my sandbox
 */
const _ = require("lodash")

const equitmentData = require("../data/equipments")
const { createWeaponItemList,assignRandomPositions ,createBulletList} = require('../utils/createEquitmentItemList')
const SPAWNPOINTS = require('../spawnpoints/spawnpoint.json')

// let itemSize = 91
// let mockWeightPercentList = createWeaponItemList(itemSize, equitmentData)

// console.log(mockWeightPercentList)
// console.log(_.size(mockWeightPercentList), itemSize)

let itemSize = 100
this.itemList = createWeaponItemList(itemSize, equitmentData)
console.log(this.itemList)
this.equipments = assignRandomPositions(this.itemList, SPAWNPOINTS)

this.bulletList = createBulletList(this.equipments)
// console.log(this.bulletList)