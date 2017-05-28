import { observable, action, computed, reaction } from 'mobx'
import FloorsStore from './FloorsStore'
import LiftStore from './LiftStore'
import { DirectionTypes, DoorStates } from '../Constants'
import { getOpposite } from '../Utils'

class SystemStore {
  @action liftArrive () {
    const floor = this.liftState.currFloor
    const direction = this.liftState.currDirection
    const curr = this.currFloorState
    const floorsToStop = this.floorsToStop
    const inCarOnDirectionLen = this.liftState.keypadState.filter(key => key.isOn).map(key => key.floor).filter(_floor => {
      switch (direction) {
        case DirectionTypes.UP:
          return _floor > this.liftState.currFloor
        case DirectionTypes.DOWN:
          return _floor < this.liftState.currFloor
        default: {
          return true
        }
      }
    }).length
    this.floorsState.getFloorModel(floor).resolve(direction)
    this.liftState.resolve()
    this.liftState.openDoor()
    if (!(curr.floor || curr[direction]) && !inCarOnDirectionLen) {
      const currQueue = this.floorsState.callQueue[this.liftState.currDirection]
      const onDirection = (_floor) => {
        switch (this.liftState.currDirection) {
          case DirectionTypes.UP:
            return _floor >= this.liftState.currFloor
          case DirectionTypes.DOWN:
            return _floor <= this.liftState.currFloor
          default: {
            return true
          }
        }
      }
      const opstQueue = this.floorsState.callQueue[getOpposite(this.liftState.currDirection)]
      const currQueueOnDirection = currQueue.filter(onDirection)
      const opstQueueOnDirection = opstQueue.filter(onDirection)
      if (!currQueueOnDirection.length && !opstQueueOnDirection.length) {
        this.liftState.clearDirection()
      }
    } else if (floor && curr[direction]) {
      //
    } else if (floorsToStop[floorsToStop.length - 1] === floor && curr[getOpposite(direction)]) {
      this.liftState.currDirection = getOpposite(direction)
    }
  }
  constructor (liftId) {
    this.LIFT_ID = liftId
    reaction(
      () => this.stopping,
      floor => {
        if (floor) {
          this.liftArrive()
        }
      },
      { name: 'Lift Arrived on In Carr Call' }
    )

    reaction(
      // react to the same direction when not runing
      () => ({
        curr: this.currFloorState,
        direction: this.liftState.currDirection
      }),
      ({ curr, direction }) => {
        if (curr.floor && curr[direction] && this.liftState.nextFloor === curr.floor) {
          this.liftArrive()
        }
      },
      { name: 'Lift Arrived on Floor Call' }
    )
    reaction(
      // react to the opposite direction
      () => ({
        nextFloors: this.floorsToStop,
        callQueue: this.floorsState.callQueue,
        doorState: this.liftState.doorState,
        inCarLen: this.liftState.keypadState.filter(key => key.isOn).map(key => key.floor).length,
      }),
      params => {
        const { nextFloors, callQueue, doorState, inCarLen } = params
        const nextFloorsLen = nextFloors.length
        const onDirection = (floor) => {
          switch (this.liftState.currDirection) {
            case DirectionTypes.UP:
              return floor >= this.liftState.currFloor
            case DirectionTypes.DOWN:
              return floor <= this.liftState.currFloor
            default: {
              return true
            }
          }
        }

        if (doorState === DoorStates.CLOSED) {
          if (!nextFloorsLen) {
            if (this.liftState.currDirection) {
              const currQueue = callQueue[this.liftState.currDirection]
              const opstQueue = callQueue[getOpposite(this.liftState.currDirection)]
              const currQueueOnDirection = currQueue.filter(onDirection)
              if (inCarLen || opstQueue.length) {
                if (!currQueue.length) {
                  this.liftState.direct(getOpposite(this.liftState.currDirection))
                } else if (!currQueueOnDirection.length) {
                  this.liftState.direct(getOpposite(this.liftState.currDirection))
                } else if (currQueueOnDirection.length !== 1) {
                  this.liftState.clearDirection()
                }
              } else if (!currQueue.length) {
                this.liftState.clearDirection()
              } else if (currQueue[currQueue.length - 1] !== this.liftState.currFloor) {
                this.liftState.direct(getOpposite(this.liftState.currDirection))
              }
            } else {
              for (const direction in callQueue) {
                if (callQueue[direction].indexOf(this.liftState.currFloor) > -1) {
                  this.liftState.direct(direction)
                }
              }
            }
          } else if (this.liftState.currFloor - this.floorsToStop[0]) {
            const difference = this.liftState.currFloor - this.floorsToStop[0]
            this.liftState.direct(difference > 0 ? DirectionTypes.DOWN : DirectionTypes.UP)
          }
        }
      },
      { name: 'Lift Directing' }
    )
  }
  liftState = new LiftStore(this.LIFT_ID)
  floorsState = new FloorsStore(this.LIFT_ID)
  @observable displayFloor = 1

  @action changeFloorView = (newFloor) => {
    this.displayFloor = newFloor
  }

  @computed get diplayedFloorState () {
    return this.floorsState.floors[this.displayFloor - 1]
  }

  isRunning
  @action startAutoRun = () => {
    reaction(
      () => ({
        direction: this.liftState.currDirection,
        floorsToStop: this.floorsToStop.length > 0,
        doorState: this.liftState.doorState === DoorStates.CLOSED
      }),
      async () => {
        if (!this.isRunning) {
          while (this.liftState.currDirection && this.floorsToStop.length && this.liftState.doorState === DoorStates.CLOSED) {
            this.isRunning = true
            if (this.floorsState.callQueue[this.liftState.currDirection].indexOf(this.liftState.currFloor) > -1) {
              break
            }
            //eslint-disable-next-line no-await-in-loop
            await this.liftState.goNextFloor(false)
          }
          this.isRunning = false
        }
      }
    )
  }

  // next floor in current direction
  // use struct to prevent unnecessary render
  @computed.struct get floorsToStop () {
    const direction = this.liftState.currDirection
    const onDirection = (floor) => {
      switch (direction) {
        case DirectionTypes.UP:
          return floor >= this.liftState.currFloor
        case DirectionTypes.DOWN:
          return floor <= this.liftState.currFloor
        default: {
          return true
        }
      }
    }
    const notCurrent = (floor) => {
      return floor !== this.liftState.currFloor
    }
    const sortOnDirection = (a, b) => {
      switch (direction) {
        case DirectionTypes.UP:
          return a > b
        case DirectionTypes.DOWN:
          return a < b
        default:
      }
    }
    const inCarQueue = this.liftState.keypadState.filter(key => key.isOn).map(key => key.floor).filter(floor => onDirection(floor)).sort(sortOnDirection)


    let floorsQueue
    // in case direction is undefined
    // get both directions
    const drctCalls = this.floorsState.callQueue[direction || DirectionTypes.DOWN].sort(sortOnDirection)
    const opstCalls = this.floorsState.callQueue[direction ? getOpposite(direction) : DirectionTypes.UP].sort(sortOnDirection)
    if (drctCalls && drctCalls.filter(onDirection).length) {
      floorsQueue = drctCalls && drctCalls.filter(floor => onDirection(floor))
    } else if (opstCalls && opstCalls.filter(onDirection).length) {
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
        floorsQueue = opstCalls.filter(floor => onDirection(floor)).slice(-1)
      }
    } else {
      floorsQueue = []
    }

    const next = inCarQueue
      .concat(floorsQueue.filter(notCurrent))
      .sort(sortOnDirection)
    return [...(new Set(next))]
  }
  @computed get stopping () {
    if (this.floorsToStop[0] === this.liftState.currFloor) {
      return this.liftState.currFloor
    } else {
      return false
    }
  }
  @computed get currFloorState () {
    let flag = false
    let up = false
    let down = false
    const curr = this.floorsState.getFloorModel(this.liftState.currFloor).floorState
    Object.keys(curr).forEach(key => {
      if (curr[key]) {
        if (key === DirectionTypes.UP) {
          up = true
        }
        if (key === DirectionTypes.DOWN) {
          down = true
        }
        flag = true
      }
    })
    return {
      floor: flag && this.liftState.currFloor,
      [DirectionTypes.UP]: up,
      [DirectionTypes.DOWN]: down
    }
  }
}

export default new SystemStore(0)
