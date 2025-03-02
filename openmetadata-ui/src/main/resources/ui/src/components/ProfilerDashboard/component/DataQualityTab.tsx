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

import { Button, Row, Space, Table, Tooltip } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { isEmpty, isUndefined } from 'lodash';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../../../authentication/auth-provider/AuthProvider';
import { getTableTabPath } from '../../../constants/constants';
import { NO_PERMISSION_FOR_ACTION } from '../../../constants/HelperTextUtil';
import { TestCase, TestCaseResult } from '../../../generated/tests/testCase';
import { useAuth } from '../../../hooks/authHooks';
import { getEntityName, getNameFromFQN } from '../../../utils/CommonUtils';
import { getTestSuitePath } from '../../../utils/RouterUtils';
import { getDecodedFqn } from '../../../utils/StringsUtils';
import SVGIcons, { Icons } from '../../../utils/SvgUtils';
import {
  getEntityFqnFromEntityLink,
  getTableExpandableConfig,
  getTestResultBadgeIcon,
} from '../../../utils/TableUtils';
import { getFormattedDateFromSeconds } from '../../../utils/TimeUtils';
import EditTestCaseModal from '../../AddDataQualityTest/EditTestCaseModal';
import DeleteWidgetModal from '../../common/DeleteWidget/DeleteWidgetModal';
import Loader from '../../Loader/Loader';
import { DataQualityTabProps } from '../profilerDashboard.interface';
import TestSummary from './TestSummary';

const DataQualityTab: React.FC<DataQualityTabProps> = ({
  isLoading = false,
  testCases,
  deletedTable = false,
  onTestUpdate,
}) => {
  const { t } = useTranslation();
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase>();
  const [editTestCase, setEditTestCase] = useState<TestCase>();
  const { isAdminUser } = useAuth();
  const { isAuthDisabled } = useAuthContext();

  const hasAccess = isAdminUser || isAuthDisabled;

  const columns: ColumnsType<TestCase> = useMemo(() => {
    return [
      {
        title: t('label.last-run-result'),
        dataIndex: 'testCaseResult',
        key: 'testCaseResult',
        render: (result: TestCaseResult) => (
          <Space size={8}>
            {result?.testCaseStatus && (
              <SVGIcons
                alt="result"
                className="w-4"
                icon={getTestResultBadgeIcon(result.testCaseStatus)}
              />
            )}
            <span>{result?.testCaseStatus || '--'}</span>
          </Space>
        ),
      },
      {
        title: t('label.last-run'),
        dataIndex: 'testCaseResult',
        key: 'lastRun',
        render: (result: TestCaseResult) =>
          result?.timestamp
            ? getFormattedDateFromSeconds(result.timestamp)
            : '--',
      },
      {
        title: t('label.name'),
        dataIndex: 'name',
        key: 'name',
        render: (name: string) => <span data-testid={name}>{name}</span>,
      },
      {
        title: t('label.description'),
        dataIndex: 'description',
        key: 'description',
        render: (text) => (isEmpty(text) ? '--' : text),
      },
      {
        title: t('label.test-suite'),
        dataIndex: 'testSuite',
        key: 'testSuite',
        render: (value) => {
          return (
            <Link
              to={getTestSuitePath(value?.fullyQualifiedName || '')}
              onClick={(e) => e.stopPropagation()}>
              {getEntityName(value)}
            </Link>
          );
        },
      },
      {
        title: t('label.table'),
        dataIndex: 'entityLink',
        key: 'table',
        render: (entityLink) => {
          const tableFqn = getEntityFqnFromEntityLink(entityLink);
          const name = getNameFromFQN(tableFqn);

          return (
            <Link
              to={getTableTabPath(tableFqn, 'profiler')}
              onClick={(e) => e.stopPropagation()}>
              {name}
            </Link>
          );
        },
      },
      {
        title: t('label.column'),
        dataIndex: 'entityLink',
        key: 'column',
        render: (entityLink) => {
          const isColumn = entityLink.includes('::columns::');

          if (isColumn) {
            const name = getNameFromFQN(
              getDecodedFqn(
                getEntityFqnFromEntityLink(entityLink, isColumn),
                true
              )
            );

            return name;
          }

          return '--';
        },
      },
      {
        title: t('label.actions'),
        dataIndex: 'actions',
        key: 'actions',
        width: 100,
        render: (_, record) => {
          return (
            <Row align="middle">
              {!deletedTable && (
                <Tooltip
                  placement="bottomRight"
                  title={hasAccess ? 'Edit' : NO_PERMISSION_FOR_ACTION}>
                  <Button
                    className="flex-center"
                    data-testid={`edit-${record.name}`}
                    disabled={!hasAccess}
                    icon={
                      <SVGIcons
                        alt="edit"
                        className="h-4"
                        icon={Icons.EDIT}
                        title="Edit"
                      />
                    }
                    type="text"
                    onClick={(e) => {
                      // preventing expand/collapse on click of edit button
                      e.stopPropagation();
                      setEditTestCase(record);
                    }}
                  />
                </Tooltip>
              )}
              <Tooltip
                placement="bottomLeft"
                title={
                  hasAccess ? t('label.delete') : NO_PERMISSION_FOR_ACTION
                }>
                <Button
                  className="flex-center"
                  data-testid={`delete-${record.name}`}
                  disabled={!hasAccess}
                  icon={
                    <SVGIcons
                      alt={t('label.delete')}
                      className="h-4"
                      icon={Icons.DELETE}
                    />
                  }
                  type="text"
                  onClick={(e) => {
                    // preventing expand/collapse on click of delete button
                    e.stopPropagation();
                    setSelectedTestCase(record);
                  }}
                />
              </Tooltip>
            </Row>
          );
        },
      },
    ];
  }, [hasAccess, deletedTable]);

  return (
    <>
      <Table
        bordered
        className="table-shadow"
        columns={columns}
        dataSource={testCases.map((test) => ({ ...test, key: test.name }))}
        expandable={{
          ...getTableExpandableConfig<TestCase>(),
          expandRowByClick: true,
          rowExpandable: () => true,
          expandedRowRender: (recode) => <TestSummary data={recode} />,
        }}
        loading={{
          indicator: <Loader size="small" />,
          spinning: isLoading,
        }}
        pagination={false}
        rowKey="id"
        size="small"
      />
      <EditTestCaseModal
        testCase={editTestCase as TestCase}
        visible={!isUndefined(editTestCase)}
        onCancel={() => setEditTestCase(undefined)}
        onUpdate={onTestUpdate}
      />

      <DeleteWidgetModal
        afterDeleteAction={onTestUpdate}
        allowSoftDelete={!deletedTable}
        entityId={selectedTestCase?.id || ''}
        entityName={selectedTestCase?.name || ''}
        entityType="testCase"
        prepareType={false}
        visible={!isUndefined(selectedTestCase)}
        onCancel={() => {
          setSelectedTestCase(undefined);
        }}
      />
    </>
  );
};

export default DataQualityTab;
