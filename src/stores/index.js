import { observable, action, computed, reaction, autorun, runInAction } from 'mobx'
import FloorsStore from './FloorsStore'
import LiftStore from './LiftStore'
import { DirectionTypes, DoorStates } from '../Constants'
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
        debugger
        if (floor) {
          alert('react to keypad')
          this.liftArrive()
        }
      }
    )
    reaction(
      // react to the same direction
      () => ({
        curr: this.currFloorState,
        direction: this.liftState.currDirection
      }),
      ({ curr, direction }) => {
        if (curr.floor && curr[direction]) {
          alert('the same')
          this.liftArrive()
        }
        // if (floor && direction) {
        //   await this.liftArrive(floor, direction, curr)
        // } else if (!direction && floor && floor === curr.floor) {
        //   // case this floor button
        //   await this.liftArrive(floor, direction, true)
        // }
      },
      { name: 'Lift Arrived on Demand' }
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
            if (upLen || downLen) {
              alert('one')
              this.liftState.direct(getOpposite(this.liftState.currDirection))
            } else {
              alert('three')
              this.liftState.clearDirection()
            }
          } else if (this.liftState.currFloor - this.floorsToStop[0]) {
            alert('four')
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
      while (this.liftState.currDirection && this.floorsToStop.length && this.liftState.doorState === DoorStates.CLOSED) {
        try {
          //eslint-disable-next-line no-await-in-loop
          await this.liftState.goNextFloor(false)
        //eslint-disable-next-line no-empty
        } catch (e) {}
      }
    })
  }

  // next floor in current direction
  // use struct to prevent unnecessary render
  @computed.struct get floorsToStop () {
    const direction = this.liftState.currDirection
    const filterByDirection = (floor) => {
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
    const filterNotCurrent = (floor) => {
      return floor !== this.liftState.currFloor
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
    const drctCalls = this.floorsState.callQueue[direction || DirectionTypes.DOWN]
    const opstCalls = this.floorsState.callQueue[direction ? getOpposite(direction) : DirectionTypes.UP]
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
    return [...(new Set(next))].filter(filterNotCurrent)
  }
  @computed get stopping () {
    debugger
    if (this.liftState.currDirection === DirectionTypes.UP) {
      if (this.floorsToStop[0] - 1 === this.liftState.currFloor) {
        return this.floorsToStop[0]
      }
    } else if (this.liftState.currDirection === DirectionTypes.DOWN) {
      if (this.floorsToStop[0] + 1 === this.liftState.currFloor) {
        return this.floorsToStop[0]
      }
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
