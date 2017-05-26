import { extendObservable, observable, action, computed } from 'mobx'
import { TOP_FLOOR, BOTTOM_FLOOR, DirectionTypes, DoorStates } from '../Constants'
import { isTop, isBottom, getOpposite } from '../Utils'

const { UP, DOWN } = DirectionTypes
class FloorModel {
  floor
  @observable floorDoor = DoorStates.CLOSE
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
  @action resolve = (direction, isLastToStop) => {
    this.floorState[direction] = false
    if (isLastToStop) {
      this.floorState[getOpposite(direction)] = false
    }
  }
}

// const { UP, DOWN } = Direction
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
        ).map(t => t.floor),
      [DOWN]: this.floors
        .filter(floorModel =>
          floorModel.floorState[DOWN] === true
        ).map(t => t.floor),
    }
  }
}

export default FloorsStore
