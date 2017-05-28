import { extendObservable, observable, action, computed } from 'mobx'
import { TOP_FLOOR, BOTTOM_FLOOR, DirectionTypes } from '../Constants'
import { isTop, isBottom, getOpposite } from '../Utils'

const { UP, DOWN } = DirectionTypes
class FloorModel {
  floor
  constructor (floor) {
    const tmpObj = {}
    if (isTop(floor)) {
      tmpObj[DOWN] = false
    } else if (isBottom(floor)) {
      tmpObj[UP] = false
    } else {
      tmpObj[UP] = false
      tmpObj[DOWN] = false
    }
    extendObservable(this, {
      floorState: tmpObj
    })
    this.floor = floor
  }

  //use class properties
  @action('floor buttons reset')
  reset = () => {
    Object.keys(this.floorState).forEach(key => {
      this.floorState[key] = false
    })
  }
  @action('floor button pressed')
  press = (direction) => {
    this.floorState[direction] = true
  }
  @action('Floor Call Resolving')
  resolve = (direction) => {
    if (direction) {
      if (direction in this.floorState) {
        this.floorState[direction] = false
      } else {
        if (getOpposite(direction) in this.floorState) {
          this.floorState[getOpposite(direction)] = false
        }
        if (getOpposite(getOpposite(direction)) in this.floorState) {
          this.floorState[getOpposite(getOpposite(direction))] = false
        }
      }
    }
  }
}

class FloorsStore {
  liftId
  @observable floors = []
  getFloorModel = (floor) => {
    return this.floors[floor - BOTTOM_FLOOR]
  }
  constructor (liftId) {
    this.liftId = liftId
    for (let i = BOTTOM_FLOOR; i <= TOP_FLOOR; i++) {
      this.floors.push(new FloorModel(i))
    }
  }

  @computed.struct get callQueue () {
    return {
      [UP]: this.floors
        .filter(floorModel =>
          floorModel.floorState[UP] === true
        ).map(t => t.floor).reverse(),
      [DOWN]: this.floors
        .filter(floorModel =>
          floorModel.floorState[DOWN] === true
        ).map(t => t.floor),
    }
  }
}

export default FloorsStore
