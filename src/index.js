import React from 'react'
import { useStrict } from 'mobx'
import { render } from 'react-dom'
import { AppContainer } from 'react-hot-loader'
import App from './App'

useStrict(true)
render(
  <AppContainer>
    <App />
  </AppContainer>,
  document.getElementById('root')
);

if (module.hot) {
  module.hot.accept('./App', () => {
    const NextApp = require('./App').default;

    render(
      <AppContainer>
        <NextApp />
      </AppContainer>,
      document.getElementById('root')
    );
  });
}
