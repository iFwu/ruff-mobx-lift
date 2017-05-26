import React, { Component } from 'react'
import DevTools from 'mobx-react-devtools'
import FloorTabs from './view/FloorTabs'
import FloorView from './view/FloorView'
import InCarView from './view/InCarView'
import systemState from './stores/'

class App extends Component {
  render () {
    return (
      <div>
        <DevTools />
        <div className='root'>
          <style jsx>{`
            .root {
              padding: 30px;
              display: flex;
              width: 100vw;
            }
          `}</style>
          <FloorTabs store={systemState} />
          <FloorView store={systemState} />
          <InCarView store={systemState} />
        </div>
      </div>
    )
  }
}

export default App
