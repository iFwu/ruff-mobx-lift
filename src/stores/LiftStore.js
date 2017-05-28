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
import { timeout, clearAndReject } from '../Utils'

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

  @observable goTimer = []
  @action goNextFloor = async (isForce = false) => {
    if (this.doorState === DoorStates.CLOSED) {
      switch (this.currDirection) {
        case DirectionTypes.UP: {
          if (!isForce) {
            await timeout(FLOOR_CHANGE_TIME, (...timer) => {
              if (!(this.goTimer.length)) {
                this.goTimer = timer
              }
            })
          }
          runInAction('Lift Up a Floor', () => this.currFloor++)
          break
        }
        case DirectionTypes.DOWN: {
          if (!isForce) {
            await timeout(FLOOR_CHANGE_TIME, (...timer) => {
              if (!(this.goTimer.length)) {
                this.goTimer = timer
              }
            })
          }
          runInAction('Lift Down a Floor', () => this.currFloor--)
          break
        }
        default: {
          throw new Error('No Direction. Can Cause Infinite loop')
        }
      }
    } else {
      throw new Error('Door Not Closed, Unable to Go To Next')
    }
    if (this.goTimer.length) {
      this.goTimer.clear()
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

  @observable doorWaitingTimer = []
  @observable closingTimer = []
  @action openDoor = async () => {
    if (this.doorState === DoorStates.CLOSED || this.closingTimer.length) {
      this.doorState = DoorStates.OPENING
      if (this.closingTimer.length) {
        clearAndReject(this.closingTimer)
      }
      await timeout(DOOR_TOGGLE_TIME)
      runInAction('Door Opened', () => {
        this.doorState = DoorStates.OPEN
      })
    }
    if (this.doorWaitingTimer.length) {
      clearAndReject(this.doorWaitingTimer)
    }
    timeout(DOOR_TIMEOUT, (...timer) => {
      this.doorWaitingTimer = timer
    }).then(() => {
      this.doorWaitingTimer.clear()
      this.closeDoor(true)
    }).catch(() => {})
    return Promise.resolve()
  }
  @action closeDoor = (isAuto = false) => {
    // not accept close when opening
    if (this.doorState === DoorStates.OPEN && !(this.closingTimer.length)) {
      //in case manually close
      if (this.doorWaitingTimer.length) {
        clearAndReject(this.doorWaitingTimer)
      }
      this.doorState = DoorStates.CLOSING
      timeout(DOOR_TOGGLE_TIME, (...timer) => {
        this.closingTimer = timer
      }).then(() => {
        runInAction(isAuto ? 'Door Auto Closed' : 'Door Closed', () => {
          this.closingTimer.clear()
          this.doorState = DoorStates.CLOSED
        })
      }).catch(() => {})
    }
  }
  @action('In Car Floor Call Resolving') resolve = async () => {
    this.getKeyModel(this.currFloor).isOn = false
  }
}

export default LiftStore
