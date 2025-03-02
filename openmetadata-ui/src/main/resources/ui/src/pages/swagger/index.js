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

import { RedocStandalone } from '@deuex-solutions/redoc';
import React from 'react';
import PageContainer from '../../components/containers/PageContainer';

const SwaggerPage = () => {
  // return (<RedocStandalone
  //   specUrl="https://raw.githubusercontent.com/deuex-solutions/redoc/master/demo/petstore.json"
  // />);
  return (
    <PageContainer>
      <div className="container-fluid" data-testid="fluid-container">
        <RedocStandalone
          options={{ enableConsole: true }}
          specUrl="./swagger.json"
        />
      </div>
    </PageContainer>
  );
};

export default SwaggerPage;
