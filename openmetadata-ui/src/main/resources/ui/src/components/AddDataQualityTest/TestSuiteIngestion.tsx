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

import { Col, Row, Typography } from 'antd';
import { AxiosError } from 'axios';
import { camelCase, isEmpty } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  addIngestionPipeline,
  checkAirflowStatus,
  deployIngestionPipelineById,
  updateIngestionPipeline as putIngestionPipeline,
} from '../../axiosAPIs/ingestionPipelineAPI';
import {
  DEPLOYED_PROGRESS_VAL,
  INGESTION_PROGRESS_END_VAL,
} from '../../constants/constants';
import { FormSubmitType } from '../../enums/form.enum';
import { IngestionActionMessage } from '../../enums/ingestion.enum';
import {
  ConfigType,
  CreateIngestionPipeline,
  PipelineType,
} from '../../generated/api/services/ingestionPipelines/createIngestionPipeline';
import { IngestionPipeline } from '../../generated/entity/services/ingestionPipelines/ingestionPipeline';
import jsonData from '../../jsons/en';
import {
  getIngestionFrequency,
  replaceSpaceWith_,
} from '../../utils/CommonUtils';
import { getTestSuitePath } from '../../utils/RouterUtils';
import { showErrorToast } from '../../utils/ToastUtils';
import SuccessScreen from '../common/success-screen/SuccessScreen';
import DeployIngestionLoaderModal from '../Modals/DeployIngestionLoaderModal/DeployIngestionLoaderModal';
import { TestSuiteIngestionProps } from './AddDataQualityTest.interface';
import TestSuiteScheduler from './components/TestSuiteScheduler';

const TestSuiteIngestion: React.FC<TestSuiteIngestionProps> = ({
  ingestionPipeline,
  testSuite,
  onCancel,
}) => {
  const { ingestionFQN } = useParams<Record<string, string>>();
  const history = useHistory();
  const [ingestionData, setIngestionData] = useState<
    IngestionPipeline | undefined
  >(ingestionPipeline);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showDeployButton, setShowDeployButton] = useState(false);
  const [ingestionAction, setIngestionAction] = useState(
    ingestionFQN
      ? IngestionActionMessage.UPDATING
      : IngestionActionMessage.CREATING
  );
  const [isIngestionDeployed, setIsIngestionDeployed] = useState(false);
  const [isIngestionCreated, setIsIngestionCreated] = useState(false);
  const [ingestionProgress, setIngestionProgress] = useState(0);
  const getSuccessMessage = useMemo(() => {
    const createMessage = showDeployButton
      ? `has been ${ingestionFQN ? 'updated' : 'created'}, but failed to deploy`
      : `has been ${
          ingestionFQN ? 'updated' : 'created'
        } and deployed successfully`;

    return (
      <span>
        <span className="tw-mr-1 tw-font-semibold">
          &quot;{ingestionData?.name ?? 'Test Suite'}&quot;
        </span>
        <span>{createMessage}</span>
      </span>
    );
  }, [ingestionData, showDeployButton]);
  const [isAirflowRunning, setIsAirflowRunning] = useState(false);

  const handleIngestionDeploy = (id?: string) => {
    setShowDeployModal(true);

    setIsIngestionCreated(true);
    setIngestionProgress(INGESTION_PROGRESS_END_VAL);
    setIngestionAction(IngestionActionMessage.DEPLOYING);

    deployIngestionPipelineById(`${id || ingestionData?.id}`)
      .then(() => {
        setIsIngestionDeployed(true);
        setShowDeployButton(false);
        setIngestionProgress(DEPLOYED_PROGRESS_VAL);
        setIngestionAction(IngestionActionMessage.DEPLOYED);
      })
      .catch((err: AxiosError) => {
        setShowDeployButton(true);
        setIngestionAction(IngestionActionMessage.DEPLOYING_ERROR);
        showErrorToast(
          err || jsonData['api-error-messages']['deploy-ingestion-error']
        );
      })
      .finally(() => setTimeout(() => setShowDeployModal(false), 500));
  };

  const createIngestionPipeline = async (repeatFrequency: string) => {
    const updatedName = replaceSpaceWith_(testSuite.name);

    const ingestionPayload: CreateIngestionPipeline = {
      airflowConfig: {
        scheduleInterval: isEmpty(repeatFrequency)
          ? undefined
          : repeatFrequency,
      },
      name: `${updatedName}_${PipelineType.TestSuite}`,
      pipelineType: PipelineType.TestSuite,
      service: {
        id: testSuite.id || '',
        type: camelCase(PipelineType.TestSuite),
      },
      sourceConfig: {
        config: {
          type: ConfigType.TestSuite,
        },
      },
    };

    const ingestion = await addIngestionPipeline(ingestionPayload);

    setIngestionData(ingestion);
    handleIngestionDeploy(ingestion.id);
  };

  const updateIngestionPipeline = async (repeatFrequency: string) => {
    const {
      airflowConfig,
      description,
      displayName,
      loggerLevel,
      name,
      owner,
      pipelineType,
      service,
      sourceConfig,
    } = ingestionPipeline as IngestionPipeline;

    const updatedPipelineData = {
      airflowConfig: {
        ...airflowConfig,
        scheduleInterval: isEmpty(repeatFrequency)
          ? undefined
          : repeatFrequency,
      },
      description,
      displayName,
      loggerLevel,
      name,
      owner,
      pipelineType,
      service,
      sourceConfig,
    };

    try {
      const response = await putIngestionPipeline(
        updatedPipelineData as CreateIngestionPipeline
      );
      handleIngestionDeploy(response.id);
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        jsonData['api-error-messages']['update-ingestion-error']
      );
    }
  };

  const handleIngestionSubmit = (repeatFrequency: string) => {
    if (ingestionFQN) {
      updateIngestionPipeline(repeatFrequency);
    } else {
      createIngestionPipeline(repeatFrequency);
    }
  };

  const handleViewTestSuiteClick = () => {
    history.push(getTestSuitePath(testSuite?.fullyQualifiedName || ''));
  };

  const handleDeployClick = () => {
    setShowDeployModal(true);
    handleIngestionDeploy();
  };

  const handleAirflowStatusCheck = (): Promise<void> => {
    return checkAirflowStatus()
      .then((res) => {
        if (res.status === 200) {
          setIsAirflowRunning(true);
        } else {
          setIsAirflowRunning(false);
        }
      })
      .catch(() => {
        setIsAirflowRunning(false);
      });
  };

  useEffect(() => {
    handleAirflowStatusCheck();
  }, []);

  return (
    <Row className="tw-form-container" gutter={[16, 16]}>
      <Col span={24}>
        <Typography.Paragraph
          className="tw-heading tw-text-base"
          data-testid="header">
          Schedule for Ingestion
        </Typography.Paragraph>
      </Col>

      <Col span={24}>
        {isIngestionCreated ? (
          <SuccessScreen
            handleDeployClick={handleDeployClick}
            handleViewServiceClick={handleViewTestSuiteClick}
            isAirflowSetup={isAirflowRunning}
            name={`${testSuite?.name}_${PipelineType.TestSuite}`}
            showDeployButton={showDeployButton}
            showIngestionButton={false}
            state={FormSubmitType.ADD}
            successMessage={getSuccessMessage}
            viewServiceText="View Test Suite"
            onCheckAirflowStatus={handleAirflowStatusCheck}
          />
        ) : (
          <TestSuiteScheduler
            initialData={
              ingestionPipeline?.airflowConfig.scheduleInterval ||
              getIngestionFrequency(PipelineType.TestSuite)
            }
            onCancel={onCancel}
            onSubmit={handleIngestionSubmit}
          />
        )}
      </Col>
      <DeployIngestionLoaderModal
        action={ingestionAction}
        ingestionName={ingestionData?.name || ''}
        isDeployed={isIngestionDeployed}
        isIngestionCreated={isIngestionCreated}
        progress={ingestionProgress}
        visible={showDeployModal}
      />
    </Row>
  );
};

export default TestSuiteIngestion;
