import { observable, action, intercept, runInAction } from 'mobx'
import {
  TOP_FLOOR,
  BOTTOM_FLOOR,
  FLOOR_CHANGE_TIME,
  DirectionTypes,
  DoorStates,
  DOOR_TOGGLE_TIME,
  DOOR_TIMEOUT
} from '../Constants'
import { timeout } from '../Utils'

class KeyModel {
  constructor (floor) {
    this.floor = floor
  }
  @observable isOn = false

  @action('In Car Floor Called') press = () => {
    this.isOn = true
  }
  @action('In Car Floor Call Canceling') cancel = () => {
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
      if (change.newValue > TOP_FLOOR || change.newValue < BOTTOM_FLOOR) {
        throw new Error("Floor Exception: " + change.newValue)
      } else {
        return change
      }
    })
  }
  @observable keypadState = []
  @observable currFloor = 1
  @observable currDirection

  getKeyModel = (floor) => {
    return this.keypadState[floor - BOTTOM_FLOOR]
  }

  @action goNextFloor = async (isForce = false) => {
    if (this.doorState === DoorStates.CLOSED) {
      switch (this.currDirection) {
        case DirectionTypes.UP: {
          if (!isForce) {
            debugger
            await timeout(FLOOR_CHANGE_TIME)
          }
          runInAction('Lift Up a Floor', () => this.currFloor++)
          break
        }
        case DirectionTypes.DOWN: {
          if (!isForce) {
            await timeout(FLOOR_CHANGE_TIME)
          }
          runInAction('Lift Down a Floor', () => this.currFloor--)
          break
        }
        default: {
          throw new Error('No Direction. Can Cause Infinite loop')
        }
      }
    } else {
      return new Promise((_, reject) => reject('Door Not Closed, Unable to Go To Next'))
    }
  }
  @action direct = (direction) => {
    if (direction !== DirectionTypes.UP && direction !== DirectionTypes.DOWN) {
      //eslint-disable-next-line no-console
      throw new Error('Not a Valid Direction')
    } else if (this.doorState !== DoorStates.CLOSED) {
      //eslint-disable-next-line no-console
      throw new Error('Wait Door Close to Direct')
    } else {
      this.currDirection = direction
    }
  }
  @action clearDirection () {
    this.currDirection = null
  }

  @observable doorState = DoorStates.CLOSED

  openingTimer
  closingTimer
  @action openDoor = async () => {
    if (this.doorState === DoorStates.CLOSED || this.closingTimer) {
      if (this.closingTimer) {
        clearTimeout(this.closingTimer)
        this.closingTimer = null
      }
      this.doorState = DoorStates.OPENING
      await timeout(DOOR_TOGGLE_TIME)
      runInAction('Door Opened', () => {
        this.doorState = DoorStates.OPEN
      })
    }
    await timeout(DOOR_TIMEOUT, timer => {
      if (this.openingTimer) {
        clearTimeout(this.openingTimer)
      }
      this.openingTimer = timer
    })
    this.openingTimer = null
    this.closeDoor(true)
  }
  @action closeDoor = (isAuto = false) => {
    if (this.doorState === DoorStates.OPEN) {
      this.doorState = DoorStates.CLOSING
      if (this.openingTimer) {
        clearTimeout(this.openingTimer)
      }
      timeout(DOOR_TOGGLE_TIME, timer => {
        if (!this.closingTimer) {
          this.closingTimer = timer
        }
      }).then(() => {
        runInAction(isAuto ? 'Door Auto Closed' : 'Door Closed', () => {
          this.closingTimer = null
          this.doorState = DoorStates.CLOSED
        })
      })
    }
  }
  @action('In Car Floor Call Resolving') resolve = async () => {
    this.getKeyModel(this.currFloor).isOn = false
    await this.openDoor()
  }
}

export default LiftStore
