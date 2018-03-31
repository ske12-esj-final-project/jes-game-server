/**
 * my sandbox
 */
const _ = require("lodash")

const equitmentData = require("../data/equipments")
const {createWeaponItemList} = require('../utils/createEquitmentItemList')

let itemSize = 91
let mockWeightPercentList = createWeaponItemList(itemSize, equitmentData)

console.log(mockWeightPercentList)
console.log(_.size(mockWeightPercentList), itemSize)
