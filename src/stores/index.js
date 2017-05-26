import { observable, action, computed, reaction } from 'mobx'
import FloorsStore from './FloorsStore'
import LiftStore from './LiftStore'
import { DirectionTypes } from '../Constants'
import { getOpposite } from '../Utils'

class SystemStore {
  constructor (liftId) {
    this.LIFT_ID = liftId
    reaction(
      () => this.stopping,
      floor => floor && this.liftArrive(floor, this.liftState.goDirection),
      { name: 'lift arrived on demand' }
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
              this.liftState.direct(null)
            }
          } else {
            this.liftState.direct(null)
          }
        } else {
          const difference = this.liftState.nextFloor - this.floorsToStop[0]
          this.liftState.direct(difference > 0 ? DirectionTypes.DOWN : DirectionTypes.UP)
        }
      },
      { name: 'Lift Direction Changed' }
    )
  }
  liftState = new LiftStore(this.LIFT_ID)
  floorsState = new FloorsStore(this.LIFT_ID)
  @observable displayFloor = 1
  @action changeFloorView = (newFloor) => {
    this.displayFloor = newFloor
  }
  @action liftArrive (floor, direction) {
    this.floorsState.getFloorModel(floor).resolve(direction, this.floorsToStop.length === 1)
    this.liftState.getKeyModel(floor).resolve()
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
          return floor >= this.liftState.nextFloor
        case DirectionTypes.DOWN:
          return floor <= this.liftState.nextFloor
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
    if (this.floorsToStop[0] === this.liftState.nextFloor) {
      return this.liftState.nextFloor
    } else {
      return false
    }
  }
}

export default new SystemStore(0)
