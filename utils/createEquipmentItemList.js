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
    let equipmentDataExceptHand = _.filter(itemData, e => e.Index !== 0)
    let itemWeightPercentList = createItemList(numberOfItem, equipmentDataExceptHand)
    return _.map(itemWeightPercentList, m =>
        ({ uid: shortid.generate(), weaponIndex: m.Index, position: {},capacity:m.Capacity }))
}

const assignRandomPositions = (items, spawnPoints) =>{
    items = items.map(i => _.clone(i))
    let t_points = spawnPoints.map(i => _.clone(i))

    return items.map((item) => {
        let index = getRandomInt(t_points.length)
        item.position = _.clone(t_points[index])
        item.uid = shortid.generate()
        let o = t_points[index]
        t_points = _.filter(t_points, target => target !== o)
        return item
    })
}
const createBulletList = (equipments)=>{
    return _.map(equipments,e=>{
        let {x,y,z} = e.position
        const getRandomVal = (n)=>{
            const fixed2Dec = (n)=> Math.round(n * 100)/100;
            const range = getRandomInt(3)+1 *.1
            const rand_sign = getRandomInt(2)?1:-1
            return  fixed2Dec(n + (rand_sign*range))
        }
        x = getRandomVal(x)
        z = getRandomVal(z)
        
        return {
            uid:shortid.generate(),
            x:x,
            y:y,
            z:z
        }
    })
}

module.exports = {
    createWeaponItemList,
    assignRandomPositions,
    createBulletList
}