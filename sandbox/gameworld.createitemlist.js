/**
 * my sandbox
 */
const _ = require("lodash")

const equipmentData = require("../data/equipments")
const { createWeaponItemList,assignRandomPositions ,createBulletList} = require('../utils/createEquipmentItemList')
const SPAWNPOINTS = require('../spawnpoints/spawnpoint.json')

// let itemSize = 91
// let mockWeightPercentList = createWeaponItemList(itemSize, equipmentData)

// console.log(mockWeightPercentList)
// console.log(_.size(mockWeightPercentList), itemSize)

let itemSize = 100
this.itemList = createWeaponItemList(itemSize, equipmentData)
console.log(this.itemList)
this.equipments = assignRandomPositions(this.itemList, SPAWNPOINTS)

this.bulletList = createBulletList(this.equipments)
// console.log(this.bulletList)