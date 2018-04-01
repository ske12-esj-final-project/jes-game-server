const _ = require("lodash")
const shortid = require('shortid')

const { sumList, getRandomInt } = require("./")

const createItemList = (numberOfItem, itemData) => {
    const weightList = _.map(itemData, m => m.weight)
    let targetList = _.map(itemData, w => {
        let total = sumList(weightList)
        return Object.assign(w, {
            percentWeight: w.weight / total * numberOfItem
        })
    }).reduce((a, b) => {
        let item = _.clone(b)
        newArray = new Array(Math.ceil(b.percentWeight))
        newArray = _.map(newArray, i => _.clone(item))
        return _.concat(a, newArray)
    }, [])
    let diff = _.size(targetList) - numberOfItem
    if (diff == 0)
        return targetList
    // delete item  if the list is exceed numberOfitem 
    for (let i = 0; i < diff; i++) {
        let randIndex = getRandomInt(numberOfItem)
        targetList.splice(randIndex, 1)
    }
    return targetList
}

const createWeaponItemList = (numberOfItem, itemData) => {
    let equitmentDataExceptHand = _.filter(itemData, e => e.Index !== 0)
    let itemWeightPercentList = createItemList(numberOfItem, equitmentDataExceptHand)
    return _.map(itemWeightPercentList, m =>
        ({ uid: shortid.generate(), weaponIndex: m.Index, position: {} }))
}

module.exports = {
    createWeaponItemList
}
