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

import { Typography } from 'antd';
import { isEmpty } from 'lodash';
import React, { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { TERM_ADMIN } from '../../../constants/constants';
import { getEntityName } from '../../../utils/CommonUtils';
import SVGIcons, { Icons } from '../../../utils/SvgUtils';
import { RolesElementProps } from './RolesElement.interface';
import './RolesElement.styles.less';

const RolesElement = ({ userData }: RolesElementProps) => {
  const { t } = useTranslation();

  return (
    <Fragment>
      {userData.isAdmin && (
        <div className="mb-2 flex items-center gap-2">
          <SVGIcons alt="icon" className="w-4" icon={Icons.USERS} />
          <span>{TERM_ADMIN}</span>
        </div>
      )}
      {userData?.roles?.map((role, i) => (
        <div className="mb-2 flex items-center gap-2" key={i}>
          <SVGIcons alt="icon" className="w-4" icon={Icons.USERS} />
          <Typography.Text
            className="ant-typography-ellipsis-custom w-48"
            ellipsis={{ tooltip: true }}>
            {getEntityName(role)}
          </Typography.Text>
        </div>
      ))}
      {!userData.isAdmin && isEmpty(userData.roles) && (
        <span className="roles-no-description">
          {t('label.no-roles-assigned')}
        </span>
      )}
    </Fragment>
  );
};

export default RolesElement;
