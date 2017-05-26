import { observable, action, intercept, reaction } from 'mobx'
import { TOP_FLOOR, BOTTOM_FLOOR, FLOOR_CHANGE_TIME, DirectionTypes } from '../Constants'
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
    intercept(this, 'currFloor', change => {
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
  @observable currFloor = 1
  @observable goDirection
  intervalId
  getKeyModel = (floor) => {
    return this.keypadState[floor - BOTTOM_FLOOR]
  }

  @action goNextFloor = () => {
    switch (this.goDirection) {
      case DirectionTypes.UP:
        return this.currFloor++
      case DirectionTypes.DOWN:
        return this.currFloor--
      default: {
        this.stopAutoRun()
      }
    }
  }
  @action startAutoRun () {
    reaction(() => this.goDirection, direction => {
      if (direction && !this.intervalId) {
        this.intervalId = setInterval(() => {
          this.goNextFloor()
        }, FLOOR_CHANGE_TIME)
      }
    })
  }
  @action stopAutoRun () {
    clearInterval(this.intervalId)
    this.intervalId = null
  }
  @action direct (direction) {
    if (direction !== DirectionTypes.UP && direction !== DirectionTypes.DOWN) {
      throw new Error('Not a Valid Direction')
    }
    this.goDirection = direction
  }
  @action clearDirection () {
    this.goDirection = null
  }
}

export default LiftStore
