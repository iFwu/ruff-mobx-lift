import { observable, action, computed, reaction, runInAction } from 'mobx'
import FloorsStore from './FloorsStore'
import LiftStore from './LiftStore'
import { DirectionTypes, DoorStates, DOOR_TOGGLE_TIME, DOOR_TIMEOUT } from '../Constants'
import { getOpposite, timeout } from '../Utils'

class SystemStore {
  constructor (liftId) {
    this.LIFT_ID = liftId
    reaction(
      () => this.stopping,
      floor => floor && this.liftArrive(floor, this.liftState.goDirection),
      { name: 'Lift Arrived on Demand' }
    )
    reaction(
      () => ({
        nextFloorsLen: this.floorsToStop.length,
        keypadLen: this.liftState.keypadState.filter(key => key.isOn).map(key => key.floor).length,
        upLen: this.floorsState.callQueue[DirectionTypes.UP].length,
        downLen: this.floorsState.callQueue[DirectionTypes.DOWN].length
      }),
      lens => {
        const { nextFloorsLen, keypadLen, upLen, downLen } = lens
        if (!nextFloorsLen) {
          if (keypadLen || upLen || downLen) {
            this.liftState.direct(getOpposite(this.liftState.goDirection))
            if (!nextFloorsLen) {
              this.liftState.clearDirection()
            }
          } else {
            this.liftState.clearDirection()
          }
        } else {
          const difference = this.liftState.currFloor - this.floorsToStop[0]
          this.liftState.direct(difference > 0 ? DirectionTypes.DOWN : DirectionTypes.UP)
        }
      },
      { name: 'Lift Direction Changed' }
    )
  }
  liftState = new LiftStore(this.LIFT_ID)
  floorsState = new FloorsStore(this.LIFT_ID)
  @observable displayFloor = 1
  @observable doorState = DoorStates.CLOSED

  doorTimer
  @action openDoor = async () => {
    if (this.doorState === DoorStates.CLOSED) {
      this.doorState = DoorStates.OPENING
      await timeout(DOOR_TOGGLE_TIME)
      runInAction('Door Opened', () => {
        this.doorState = DoorStates.OPEN
      })
    }
    await timeout(DOOR_TIMEOUT, timer => {
      if (this.doorTimer) {
        clearTimeout(this.doorTimer)
      }
      this.doorTimer = timer
    })
    this.doorTimer = null
    this.closeDoor(true)
  }
  @action closeDoor = (isAuto = false) => {
    if (this.doorState === DoorStates.OPEN) {
      this.doorState = DoorStates.CLOSING
      if (this.doorTimer) {
        clearTimeout(this.doorTimer)
      }
      timeout(DOOR_TOGGLE_TIME).then(() => {
        runInAction(isAuto ? 'Door Auto Closed' : 'Door Closed', () => {
          this.doorState = DoorStates.CLOSED
        })
      })
    }
  }
  @action changeFloorView = (newFloor) => {
    this.displayFloor = newFloor
  }
  @action liftArrive (floor, direction) {
    this.floorsState.getFloorModel(floor).resolve(direction, this.floorsToStop.length === 1)
    this.liftState.getKeyModel(floor).resolve()
    this.openDoor()
  }

  @computed get diplayedFloorState () {
    return this.floorsState.floors[this.displayFloor - 1]
  }

  // next floor in current direction
  // use struct to prevent unnecessary render
  @computed.struct get floorsToStop () {
    const direction = this.liftState.goDirection
    const filterByDirection = (floor) => {
      switch (direction) {
        case DirectionTypes.UP:
          return floor >= this.liftState.currFloor
        case DirectionTypes.DOWN:
          return floor <= this.liftState.currFloor
        default:
          return floor
      }
    }
    const inCarQueue = this.liftState.keypadState.filter(key => key.isOn).map(key => key.floor).filter(floor => filterByDirection(floor)).sort((a, b) => {
      switch (direction) {
        case DirectionTypes.UP:
          return a > b
        case DirectionTypes.DOWN:
          return a < b
        default:
      }
    })

    let floorsQueue
    // in case direction is undefined
    // get both directions
    const drctCalls = this.floorsState.callQueue[getOpposite(getOpposite(direction))]
    const opstCalls = this.floorsState.callQueue[getOpposite(direction)]
    if (drctCalls && drctCalls.filter(filterByDirection).length) {
      floorsQueue = drctCalls && drctCalls.filter(floor => filterByDirection(floor))
    } else if (opstCalls && opstCalls.filter(filterByDirection).length) {
      if (inCarQueue.length && direction) {
        floorsQueue = opstCalls.filter(opstCall => {
          switch (direction) {
            case DirectionTypes.UP: {
              return opstCall > inCarQueue[inCarQueue.length - 1]
            }
            case DirectionTypes.DOWN:
              return opstCall < inCarQueue[inCarQueue.length - 1]
            default:
          }
        }).slice(-1)
      } else {
        floorsQueue = opstCalls.filter(floor => filterByDirection(floor)).slice(-1)
      }
    } else {
      floorsQueue = []
    }

    const next = inCarQueue.concat(floorsQueue).sort((a, b) => {
      switch (direction) {
        case DirectionTypes.UP:
          return a > b
        case DirectionTypes.DOWN:
          return a < b
        default:
      }
    })
    return [...(new Set(next))]
  }
  @computed get stopping () {
    if (this.floorsToStop[0] === this.liftState.currFloor) {
      return this.liftState.currFloor
    } else {
      return false
    }
  }
}

export default new SystemStore(0)
