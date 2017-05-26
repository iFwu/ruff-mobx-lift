import React, { Component } from 'react'
import { observer } from 'mobx-react'
import { DirectionTypes } from '../Constants'

const { UP, DOWN } = DirectionTypes
@observer
class FloorButton extends Component {
  render () {
    const { btn, store } = this.props
    return (
      <li key={btn.floor}>
        <style jsx>{`
          li {
            position: relative;
          }
          button {
            width: 30px;
            border: 1px solid #0881A3;
            background: #F0F0F0;
            box-shadow: 0px 0px 5px rgba(0,0,0,.2);
            display: block;
            margin: 2px auto;
          }
          button.on {
            border-color: #BE3144;
            color: #BE3144;
            box-shadow: 0px 0px 5px rgba(255,0,0,.3);
          }
          span {
            position: absolute;
          }
          .before {
            left: 10px;
          }
          .after {
            top: 0;
            bottom: 0;
            display: block;
            margin: auto;
            font-size: 13px;
            letter-spacing: 2;
            right: -8px;
            display: flex;
            align-items: center;
            width: 30px;
          }
        `}</style>
        <span className='before'>{store.liftState.nextFloor === btn.floor && '➠'}</span>
        <button
          onClick={!btn.isOn && btn.press}
          onDoubleClick={btn.isOn && btn.cancel}
          className={btn.isOn && 'on'}
        >
          {btn.floor}
        </button>
        <span className='after'>
          {store.floorsState.getFloorModel(btn.floor).floorState[UP] && '↑' }
          {store.floorsState.getFloorModel(btn.floor).floorState[DOWN] && '↓' }
        </span>
      </li>
    )
  }
}

@observer
class FloorPanelView extends Component {
  render () {
    const { store } = this.props
    return (
      <div>
        <style jsx>{`
          div {
            min-width: 90px;
          }
          ol {
            list-style: none;
            padding: 0;
            display: flex;
            flex-direction: column-reverse;
            justify-content: space-between;
            margin: 0 auto;
            width: auto;
          }
          button {
            font-size: 13px;
            height: 23px;
          }
        `}</style>
        <ol>
          {
            store.liftState.keypadState.map(btn => (
              <FloorButton key={btn.floor} btn={btn} store={store} />
            ))
          }
        </ol>
        {/*<button>←|→</button>
        <button>→|←</button>*/}
      </div>
    )
  }
}

export default FloorPanelView
