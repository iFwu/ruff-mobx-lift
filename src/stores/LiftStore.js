import { observable, action, intercept } from 'mobx'
import { TOP_FLOOR, BOTTOM_FLOOR, FLOOR_CHANGE_TIME, DirectionTypes, DoorStates } from '../Constants'
import { isTop, isBottom } from '../Utils'

class KeyModel {
  constructor (floor) {
    this.floor = floor
  }
  @observable isOn = false

  @action('In Car Floor Called') press = () => {
    this.isOn = true
  }
  @action('In Car Floor Call Canceled') cancel = () => {
    this.isOn = false
  }
  @action('In Car Floor Call Resolved') resolve = () => {
    this.isOn = false
  }
}

class LiftStore {
  constructor (id) {
    this.liftId = id
    for (let i = BOTTOM_FLOOR; i <= TOP_FLOOR; i++) {
      this.keypadState.push(new KeyModel(i))
    }
    intercept(this, 'nextFloor', change => {
      if (
        (isTop(change.newValue - 1) && this.goDirection === DirectionTypes.UP)
        || (isBottom(change.newValue + 1) && this.goDirection === DirectionTypes.DOWN)
      ) {
        throw new Error("floor exception: " + change.newValue)
      } else {
        return change
      }
    })
  }
  @observable keypadState = []
  @observable nextFloor = 1
  @observable goDirection
  @observable liftDoor = DoorStates.CLOSE
  intervalId
  getKeyModel = (floor) => {
    return this.keypadState[floor - BOTTOM_FLOOR]
  }

  @action goNextFloor = () => {
    switch (this.goDirection) {
      case DirectionTypes.UP:
        return this.nextFloor++
      case DirectionTypes.DOWN:
        return this.nextFloor--
      default:
    }
  }
  @action runDirecting () {
    this.intervalId = setInterval(() => {
      this.goNextFloor()
    }, FLOOR_CHANGE_TIME)
  }
  @action stopDirecting () {
    this.clearDirection()
    clearInterval(this.intervalId)
  }
  @action direct (direction) {
    this.goDirection = direction
  }
  @action clearDirection () {
    this.goDirection = null
  }
}

export default LiftStore
