import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App/App';
import store from './redux/store';
import { Provider } from 'react-redux';

// Importing MDB
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'bootstrap-css-only/css/bootstrap.min.css';
import 'mdbreact/dist/css/mdb.css';

// Importing the Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';

// Importing react-redux-notify CSS
import 'react-redux-notify/dist/ReactReduxNotify.css';

// Importing AOS
import AOS from 'aos';
import 'aos/dist/aos.css';

AOS.init();

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
  document.getElementById('root')
);