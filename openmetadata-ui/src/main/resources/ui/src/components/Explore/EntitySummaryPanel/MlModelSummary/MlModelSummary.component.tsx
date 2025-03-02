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

import { Col, Divider, Row, Typography } from 'antd';
import React, { ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getDashboardDetailsPath } from '../../../../constants/constants';
import { SearchIndex } from '../../../../enums/search.enum';
import { Mlmodel } from '../../../../generated/entity/data/mlmodel';
import { getEntityName } from '../../../../utils/CommonUtils';
import TableDataCardTitle from '../../../common/table-data-card-v2/TableDataCardTitle.component';
import SummaryList from '../SummaryList/SummaryList.component';

interface MlModelSummaryProps {
  entityDetails: Mlmodel;
}

interface BasicMlModelInfo {
  algorithm: string;
  target?: string;
  server?: ReactNode;
  dashboard?: ReactNode;
}

function MlModelSummary({ entityDetails }: MlModelSummaryProps) {
  const { t } = useTranslation();

  const basicMlModelInfo: BasicMlModelInfo = useMemo(
    () => ({
      algorithm: entityDetails.algorithm,
      target: entityDetails.target,
      server: entityDetails.server ? (
        <a href={entityDetails.server}>{entityDetails.server}</a>
      ) : undefined,
      dashboard: entityDetails.dashboard ? (
        <Link
          to={getDashboardDetailsPath(
            entityDetails.dashboard?.fullyQualifiedName as string
          )}>
          {getEntityName(entityDetails.dashboard)}
        </Link>
      ) : undefined,
    }),
    [entityDetails]
  );

  return (
    <>
      <Row className="m-md" gutter={[0, 4]}>
        <Col span={24}>
          <TableDataCardTitle
            dataTestId="summary-panel-title"
            searchIndex={SearchIndex.MLMODEL}
            source={entityDetails}
          />
        </Col>
        <Col span={24}>
          <Row>
            {Object.keys(basicMlModelInfo).map((fieldName) => {
              const value =
                basicMlModelInfo[fieldName as keyof BasicMlModelInfo];
              if (value) {
                return (
                  <Col key={fieldName} span={24}>
                    <Row gutter={16}>
                      <Col className="text-gray" span={10}>
                        {fieldName}
                      </Col>
                      <Col span={12}>
                        {basicMlModelInfo[fieldName as keyof BasicMlModelInfo]}
                      </Col>
                    </Row>
                  </Col>
                );
              } else {
                return null;
              }
            })}
          </Row>
        </Col>
      </Row>
      <Divider className="m-0" />
      <Row className="m-md" gutter={[0, 16]}>
        <Col span={24}>
          <Typography.Text className="section-header">
            {t('label.feature-plural')}
          </Typography.Text>
        </Col>
        <Col span={24}>
          <SummaryList mlFeatures={entityDetails.mlFeatures || []} />
        </Col>
      </Row>
    </>
  );
}

export default MlModelSummary;
