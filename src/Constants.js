export const FLOORS_COUNT = 10
export const BOTTOM_FLOOR = 1
export const TOP_FLOOR = (FLOORS_COUNT - BOTTOM_FLOOR) + 1
export const DOOR_TOGGLE_TIME = 1500 //in millisecond
export const FLOOR_CHANGE_TIME = 2000 //in millisecond
export const DOOR_TIMEOUT = 5000
export const IDLE_TIME = 60 // idle time before go back to first floor, in s
export const DirectionTypes = {
  UP: 'UP',
  DOWN: 'DOWN'
}
export const DoorStates = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  OPENING: 'OPENING',
  CLOSING: 'CLOSING'
}
