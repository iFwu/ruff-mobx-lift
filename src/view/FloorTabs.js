import React, { Component } from 'react'
import { observer } from 'mobx-react'
import { isBottom } from '../Utils'
import { TOP_FLOOR, BOTTOM_FLOOR } from '../Constants'

@observer
class FloorViewRadio extends Component {
  render () {
    const { floor, changeFloorView } = this.props
    return (
      <label htmlFor={'floor-' + floor}>
        <li>
          <style jsx>{`
            input:checked + span {
              color: crimson;
            }
            span {
              font-family: monospace;
              font-size: 16px;
            }
          `}</style>

          <input
            type='radio'
            name='outCarBtn'
            value={floor}
            id={'floor-' + floor}
            onClick={() => changeFloorView(floor)}
            defaultChecked={isBottom(floor)}
          />
          <span>F{floor}</span>

        </li>
      </label>
    )
  }
}

function FloorTreeList (props) {
  const btns = []
  for (let i = BOTTOM_FLOOR; i <= TOP_FLOOR; i++) {
    btns.push(
    <FloorViewRadio
      key={i}
      floor={i}
      changeFloorView={props.store.changeFloorView}
    />)
  }

  return (
    <ol className='floor-tree-list'>
      <style jsx>{`
        .floor-tree-list {
          flex-shrink: 0;
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column-reverse;
          justify-content: space-between;
        }
      `}</style>
      {btns}
    </ol>
  )
}

export default FloorTreeList
