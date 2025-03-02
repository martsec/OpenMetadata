/*
 *  Copyright 2022 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faCheck,
  faCheckCircle,
  faCheckSquare,
  faChevronDown,
  faChevronRight,
  faChevronUp,
  faEllipsisV,
  faPlus,
  faSearch,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import React, { FunctionComponent } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';
import { AuthProvider } from './authentication/auth-provider/AuthProvider';
import Appbar from './components/app-bar/Appbar';
import GlobalSearchProvider from './components/GlobalSearchProvider/GlobalSearchProvider';
import PermissionProvider from './components/PermissionProvider/PermissionProvider';
import WebSocketProvider from './components/web-scoket/web-scoket.provider';
import WebAnalyticsProvider from './components/WebAnalytics/WebAnalyticsProvider';
import { TOAST_OPTIONS } from './constants/Toasts.constants';
import ErrorBoundry from './ErrorBoundry/ErrorBoundry';
import AppRouter from './router/AppRouter';

const App: FunctionComponent = () => {
  library.add(
    faTimes,
    faCheck,
    faSearch,
    faPlus,
    faCheckSquare,
    faCheckCircle,
    faChevronDown,
    faChevronRight,
    faChevronUp,
    faEllipsisV
  );

  return (
    <div className="main-container">
      <div className="content-wrapper" data-testid="content-wrapper">
        <Router>
          <ErrorBoundry>
            <AuthProvider childComponentType={AppRouter}>
              <WebAnalyticsProvider>
                <PermissionProvider>
                  <WebSocketProvider>
                    <GlobalSearchProvider>
                      <Appbar />
                      <AppRouter />
                    </GlobalSearchProvider>
                  </WebSocketProvider>
                </PermissionProvider>
              </WebAnalyticsProvider>
            </AuthProvider>
          </ErrorBoundry>
        </Router>
        <ToastContainer {...TOAST_OPTIONS} newestOnTop />
      </div>
    </div>
  );
};

export default App;
