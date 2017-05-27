import { observable, action, computed, reaction, autorun, runInAction } from 'mobx'
import FloorsStore from './FloorsStore'
import LiftStore from './LiftStore'
import { DirectionTypes, DoorStates, TOP_FLOOR, BOTTOM_FLOOR } from '../Constants'
import { getOpposite } from '../Utils'

class SystemStore {
  @action async liftArrive () {
    const floor = this.liftState.currFloor
    const direction = this.liftState.currDirection
    this.floorsState.getFloorModel(floor).resolve(direction)
    this.liftState.resolve()
    await this.liftState.openDoor()
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
        next: this.nextFloorState,
        direction: this.liftState.currDirection
      }),
      async ({ next, direction }) => {
        debugger
        if (next.floor && next[direction]) {
          // await this.liftArrive()
          debugger
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
        keypadLen: this.liftState.keypadState.filter(key => key.isOn).map(key => key.floor).length,
        upLen: this.floorsState.callQueue[DirectionTypes.UP].length,
        downLen: this.floorsState.callQueue[DirectionTypes.DOWN].length,
        doorState: this.liftState.doorState,
      }),
      params => {
        const { nextFloorsLen, keypadLen, upLen, downLen, doorState } = params
        if (doorState === DoorStates.CLOSED) {
          if (!nextFloorsLen) {

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

  @action startAutoRun = () => {
    autorun(async () => {
      while (
        this.liftState.currDirection
        && this.floorsToStop.length
        && this.liftState.doorState === DoorStates.CLOSED
        ) {
        //eslint-disable-next-line no-await-in-loop
        await this.liftState.goNextFloor(false)
      }
      this.liftState.clearDirection()
    })
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
    const drctCalls = this.floorsState.callQueue[direction || DirectionTypes.DOWN]
    const opstCalls = this.floorsState.callQueue[direction ? getOpposite(direction) : DirectionTypes.UP]
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
  @computed get nextFloorState () {
    let flag = false
    let up = false
    let down = false
    let next
    if (this.liftState.currDirection === DirectionTypes.UP) {
      next = this.liftState.currFloor + 1
    } else if (this.liftState.currDirection === DirectionTypes.DOWN) {
      next = this.liftState.currFloor - 1
    }
    if (next < BOTTOM_FLOOR || next > TOP_FLOOR || !next) {
      return {}
    }

    const nextFloor = this.floorsState.getFloorModel(next).floorState
    Object.keys(nextFloor).forEach(key => {
      if (nextFloor[key]) {
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
      floor: flag && next,
      [DirectionTypes.UP]: up,
      [DirectionTypes.DOWN]: down
    }
  }
}

export default new SystemStore(0)
