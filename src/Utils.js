import { TOP_FLOOR, BOTTOM_FLOOR, DirectionTypes } from './Constants'

export function timeout (ms, cancelFn = () => {}) {
  if (typeof ms !== 'number') {
    throw new Error('Not A Valid Time')
  }
  return new Promise((resolve, reject) => {
    cancelFn(setTimeout(resolve, ms), reject)
  })
}

export function isTop (floor) {
  return floor === TOP_FLOOR
}
export function isBottom (floor) {
  return floor === BOTTOM_FLOOR
}
export function getOpposite (direction) {
  switch (direction) {
    case DirectionTypes.UP:
      return DirectionTypes.DOWN
    case DirectionTypes.DOWN:
      return DirectionTypes.UP
    default:
      throw new Error('Not a Valid Direction')
  }
}

export const clearAndReject = (timer) => {
  clearTimeout(timer[0])
  timer[1]('Clear and Rejecting!')
  timer.clear()
}
