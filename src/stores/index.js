import { observable, action, computed, reaction, runInAction } from 'mobx'
import FloorsStore from './FloorsStore'
import LiftStore from './LiftStore'
import { DirectionTypes, DoorStates } from '../Constants'
import { getOpposite, clearAndReject } from '../Utils'

class SystemStore {
  @action liftArrive () {
    const floor = this.liftState.currFloor
    const direction = this.liftState.currDirection
    const curr = this.currFloorState
    const floorsToStop = this.floorsToStop
    const inCarOnDirectionLen = this.liftState.keypadState.filter(key => key.isOn).map(key => key.floor).filter(_floor => {
      switch (direction) {
        case DirectionTypes.UP:
          return _floor >= this.liftState.currFloor
        case DirectionTypes.DOWN:
          return _floor <= this.liftState.currFloor
        default: {
          return true
        }
      }
    }).length
    this.floorsState.getFloorModel(floor).resolve(direction)
    this.liftState.resolve()
    this.liftState.openDoor()
    if (!(curr.floor || curr[direction]) && !inCarOnDirectionLen) {
      this.liftState.clearDirection()
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
      // react to the same direction
      () => ({
        curr: this.currFloorState,
        direction: this.liftState.currDirection
      }),
      ({ curr, direction }) => {
        if (curr.floor && curr[direction]) {
          this.liftArrive()
        }
        // if (floor && direction) {
        //   await this.liftArrive(floor, direction, curr)
        // } else if (!direction && floor && floor === curr.floor) {
        //   // case this floor button
        //   await this.liftArrive(floor, direction, true)
        // }
      },
      { name: 'Lift Arrived on Floor Call' }
    )
    // reaction(
    //   () => ({
    //     nextFloorsLen: this.floorsToStop.length,
    //     keypadLen: this.liftState.keypadState.filter(key => key.isOn).map(key => key.floor).length,
    //     upLen: this.floorsState.callQueue[DirectionTypes.UP].length,
    //     downLen: this.floorsState.callQueue[DirectionTypes.DOWN].length,
    //   }),
    //   lens => {
    //     const { nextFloorsLen, keypadLen, upLen, downLen } = lens
    //     if (!nextFloorsLen) {
    //       if (keypadLen || upLen || downLen) {
    //         this.liftState.direct(getOpposite(this.liftState.currDirection))
    //       } else {
    //         this.liftState.clearDirection()
    //       }
    //     } else {
    //       const difference = this.liftState.currFloor - this.floorsToStop[0]
    //       if (difference === 0) {
    //         return
    //       }
    //       this.liftState.direct(difference > 0 ? DirectionTypes.DOWN : DirectionTypes.UP)
    //     }
    //   },
    //   { name: 'Lift Directing' }
    // )
    reaction(
      // react to the opposite direction
      () => ({
        nextFloorsLen: this.floorsToStop.length,
        callQueue: this.floorsState.callQueue,
        doorState: this.liftState.doorState,
        inCarLen: this.liftState.keypadState.filter(key => key.isOn).map(key => key.floor).length,
      }),
      params => {
        const { nextFloorsLen, callQueue, doorState, inCarLen } = params
        if (doorState === DoorStates.CLOSED) {
          if (!nextFloorsLen) {
            if (this.liftState.currDirection) {
              if (inCarLen || callQueue[getOpposite(this.liftState.currDirection)].length) {
                if (!callQueue[this.liftState.currDirection].length) {
                  this.liftState.direct(getOpposite(this.liftState.currDirection))
                }
              } else if (!callQueue[this.liftState.currDirection].length) {
                this.liftState.clearDirection()
              } else {
                const currQueue = callQueue[this.liftState.currDirection]
                if (currQueue[currQueue.length - 1] !== this.liftState.currFloor) {
                  this.liftState.direct(getOpposite(this.liftState.currDirection))
                }
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
          let flag = false
          while (this.liftState.currDirection && this.floorsToStop.length && this.liftState.doorState === DoorStates.CLOSED) {
            this.isRunning = true
            //eslint-disable-next-line no-await-in-loop
            await this.liftState.goNextFloor(false)
            flag = true
          }
          if (flag) {
            if (this.liftState.goTimer.length) {
              clearAndReject(this.liftState.goTimer)
            }
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
    const inCarQueue = this.liftState.keypadState.filter(key => key.isOn).map(key => key.floor).filter(floor => onDirection(floor)).sort((a, b) => {
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
    const drctCalls = this.floorsState.callQueue[direction || DirectionTypes.DOWN].sort()
    const opstCalls = this.floorsState.callQueue[direction ? getOpposite(direction) : DirectionTypes.UP].sort()
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
      .sort((a, b) => {
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
