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

import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  FormProps,
  Input,
  InputNumber,
  Row,
  Select,
  Slider,
  Space,
  Typography,
} from 'antd';
import { AxiosError } from 'axios';
import { isUndefined, kebabCase } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { getListDataInsightCharts } from '../../axiosAPIs/DataInsightAPI';
import RichTextEditor from '../../components/common/rich-text-editor/RichTextEditor';
import TitleBreadcrumb from '../../components/common/title-breadcrumb/title-breadcrumb.component';
import './KPIPage.less';

import { t } from 'i18next';
import { getListKPIs, postKPI } from '../../axiosAPIs/KpiAPI';
import { ROUTES } from '../../constants/constants';
import {
  KPI_DATES,
  KPI_DATE_PICKER_FORMAT,
  SUPPORTED_CHARTS_FOR_KPI,
  VALIDATE_MESSAGES,
} from '../../constants/DataInsight.constants';
import { EntityType } from '../../enums/entity.enum';
import {
  CreateKpiRequest,
  KpiTargetType,
} from '../../generated/api/dataInsight/kpi/createKpiRequest';
import {
  ChartDataType,
  ChartParameterValues,
  DataInsightChart,
} from '../../generated/dataInsight/dataInsightChart';
import { DataInsightChartType } from '../../generated/dataInsight/dataInsightChartResult';
import { Kpi } from '../../generated/dataInsight/kpi/kpi';
import { KpiDate, KpiDates } from '../../interface/data-insight.interface';
import {
  getDisabledDates,
  getKPIFormattedDates,
  getKpiTargetValueByMetricType,
} from '../../utils/DataInsightUtils';
import { getTimeStampByDateTime } from '../../utils/TimeUtils';
import { showErrorToast } from '../../utils/ToastUtils';
const { Option } = Select;

const breadcrumb = [
  {
    name: t('label.data-insight'),
    url: ROUTES.DATA_INSIGHT,
  },
  {
    name: t('label.kpi-list'),
    url: ROUTES.KPI_LIST,
  },
  {
    name: t('label.add-new-kpi'),
    url: '',
    activeTitle: true,
  },
];

const AddKPIPage = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const [dataInsightCharts, setDataInsightCharts] = useState<
    DataInsightChart[]
  >([]);
  const [description, setDescription] = useState<string>('');
  const [selectedChart, setSelectedChart] = useState<DataInsightChart>();
  const [selectedMetric, setSelectedMetric] = useState<ChartParameterValues>();
  const [metricValue, setMetricValue] = useState<number>(0);
  const [isCreatingKPI, setIsCreatingKPI] = useState<boolean>(false);
  const [kpiDates, setKpiDates] = useState<KpiDates>(KPI_DATES);
  const [kpiList, setKpiList] = useState<Array<Kpi>>([]);

  const metricTypes = useMemo(
    () =>
      (selectedChart?.metrics ?? []).filter((metric) =>
        // only return supported data type
        [ChartDataType.Number, ChartDataType.Percentage].includes(
          metric.chartDataType as ChartDataType
        )
      ),
    [selectedChart]
  );

  const chartOptions = useMemo(() => {
    return dataInsightCharts.filter(
      (chart) =>
        // only show unmapped charts
        !kpiList.find((kpi) => kpi.dataInsightChart.name === chart.name)
    );
  }, [kpiList, dataInsightCharts]);

  const fetchCharts = async () => {
    try {
      const response = await getListDataInsightCharts();
      const supportedCharts = response.data.filter((chart) =>
        // only return the supported charts data
        SUPPORTED_CHARTS_FOR_KPI.includes(chart.name as DataInsightChartType)
      );

      setDataInsightCharts(supportedCharts);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const fetchKpiList = async () => {
    try {
      const response = await getListKPIs({
        fields: 'dataInsightChart',
      });
      setKpiList(response.data);
    } catch (err) {
      setKpiList([]);
    }
  };

  const handleChartSelect = (value: string) => {
    const selectedChartValue = dataInsightCharts.find(
      (chart) => chart.id === value
    );
    setSelectedChart(selectedChartValue);
  };

  const handleMetricSelect = (value: string) => {
    const selectedMetricValue = metricTypes.find(
      (metric) => metric.name === value
    );
    setSelectedMetric(selectedMetricValue);
  };

  const handleCancel = () => history.goBack();

  const handleDateChange = (dateString: string, key: KpiDate) => {
    setKpiDates((previous) => ({ ...previous, [key]: dateString }));
  };

  const handleSubmit: FormProps['onFinish'] = async (values) => {
    const formattedDates = getKPIFormattedDates(kpiDates);

    const startDate = getTimeStampByDateTime(formattedDates.startDate);
    const endDate = getTimeStampByDateTime(formattedDates.endDate);
    const metricType =
      selectedMetric?.chartDataType as unknown as KpiTargetType;

    const targetValue = getKpiTargetValueByMetricType(metricType, metricValue);

    const formData: CreateKpiRequest = {
      dataInsightChart: {
        id: values.dataInsightChart,
        type: EntityType.DATA_INSIGHT_CHART,
      },
      description,
      name: kebabCase(`${values.displayName} ${selectedMetric?.name}`),
      displayName: values.displayName,
      startDate,
      endDate,
      metricType,
      targetDefinition: [
        {
          name: selectedMetric?.name as string,
          value: targetValue + '',
        },
      ],
    };
    setIsCreatingKPI(true);
    try {
      await postKPI(formData);
      history.push(ROUTES.KPI_LIST);
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setIsCreatingKPI(false);
    }
  };

  useEffect(() => {
    fetchCharts();
    fetchKpiList();
  }, []);

  return (
    <Row
      className="bg-body-main h-full"
      data-testid="add-kpi-container"
      gutter={[16, 16]}>
      <Col offset={4} span={12}>
        <TitleBreadcrumb className="my-4" titleLinks={breadcrumb} />
        <Card>
          <Typography.Paragraph className="text-base" data-testid="form-title">
            {t('label.add-new-kpi')}
          </Typography.Paragraph>
          <Form
            data-testid="kpi-form"
            id="kpi-form"
            layout="vertical"
            validateMessages={VALIDATE_MESSAGES}
            onFinish={handleSubmit}>
            <Form.Item
              label={t('label.select-a-chart')}
              name="dataInsightChart"
              rules={[
                {
                  required: true,
                  message: t('message.data-insight-chart-required'),
                },
              ]}>
              <Select
                data-testid="dataInsightChart"
                notFoundContent={t('message.all-charts-are-mapped')}
                placeholder={t('label.select-a-chart')}
                value={selectedChart?.id}
                onChange={handleChartSelect}>
                {chartOptions.map((chart) => (
                  <Option key={chart.id}>
                    {chart.displayName || chart.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label={t('label.display-name')} name="displayName">
              <Input
                data-testid="displayName"
                placeholder={t('label.kpi-display-name')}
                type="text"
              />
            </Form.Item>

            <Form.Item
              label={t('label.select-a-metric-type')}
              name="metricType"
              rules={[
                {
                  required: true,
                  message: t('message.metric-type-required'),
                },
              ]}>
              <Select
                data-testid="metricType"
                disabled={isUndefined(selectedChart)}
                placeholder={t('label.select-a-metric-type')}
                value={selectedMetric?.name}
                onChange={handleMetricSelect}>
                {metricTypes.map((metric) => (
                  <Option key={metric.name}>
                    {`${metric.name} (${metric.chartDataType})`}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {!isUndefined(selectedMetric) && (
              <Form.Item
                label={t('label.metric-value')}
                name="metricValue"
                rules={[
                  {
                    required: true,
                    validator: () => {
                      if (metricValue >= 0) {
                        return Promise.resolve();
                      }

                      return Promise.reject(t('message.metric-value-required'));
                    },
                  },
                ]}>
                <>
                  {selectedMetric.chartDataType ===
                    ChartDataType.Percentage && (
                    <Row data-testid="metric-percentage-input" gutter={20}>
                      <Col span={20}>
                        <Slider
                          className="kpi-slider"
                          marks={{
                            0: '0%',
                            100: '100%',
                          }}
                          max={100}
                          min={0}
                          tooltipPlacement="bottom"
                          tooltipVisible={false}
                          value={metricValue}
                          onChange={(value) => {
                            setMetricValue(value);
                          }}
                        />
                      </Col>
                      <Col span={4}>
                        <InputNumber
                          formatter={(value) => `${value}%`}
                          max={100}
                          min={0}
                          step={1}
                          value={metricValue}
                          onChange={(value) => {
                            setMetricValue(Number(value));
                          }}
                        />
                      </Col>
                    </Row>
                  )}
                  {selectedMetric.chartDataType === ChartDataType.Number && (
                    <InputNumber
                      className="w-full"
                      data-testid="metric-number-input"
                      min={0}
                      value={metricValue}
                      onChange={(value) => setMetricValue(Number(value))}
                    />
                  )}
                </>
              </Form.Item>
            )}

            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Form.Item
                  label={t('label.start-date')}
                  messageVariables={{ fieldName: 'startDate' }}
                  name="startDate"
                  rules={[
                    {
                      required: true,
                      message: t('label.field-required', {
                        field: t('label.start-date'),
                      }),
                    },
                  ]}>
                  <DatePicker
                    className="w-full"
                    data-testid="start-date"
                    disabledDate={getDisabledDates}
                    format={KPI_DATE_PICKER_FORMAT}
                    onChange={(_, dateString) =>
                      handleDateChange(dateString, KpiDate.START_DATE)
                    }
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={t('label.end-date')}
                  messageVariables={{ fieldName: 'endDate' }}
                  name="endDate"
                  rules={[
                    {
                      required: true,
                      message: t('label.field-required', {
                        field: t('label.end-date'),
                      }),
                    },
                  ]}>
                  <DatePicker
                    className="w-full"
                    data-testid="end-date"
                    disabledDate={getDisabledDates}
                    format={KPI_DATE_PICKER_FORMAT}
                    onChange={(_, dateString) =>
                      handleDateChange(dateString, KpiDate.END_DATE)
                    }
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label={t('label.description')} name="description">
              <RichTextEditor
                height="200px"
                initialValue={description}
                placeHolder={t('label.write-your-description')}
                style={{ margin: 0 }}
                onTextChange={(value) => setDescription(value)}
              />
            </Form.Item>

            <Space align="center" className="w-full justify-end">
              <Button
                data-testid="cancel-btn"
                type="link"
                onClick={handleCancel}>
                {t('label.cancel')}
              </Button>
              <Button
                data-testid="submit-btn"
                form="kpi-form"
                htmlType="submit"
                loading={isCreatingKPI}
                type="primary">
                {t('label.submit')}
              </Button>
            </Space>
          </Form>
        </Card>
      </Col>
      <Col className="m-t-md" data-testid="right-panel" span={4}>
        <Typography.Paragraph className="text-base font-medium">
          {t('label.add-kpi')}
        </Typography.Paragraph>
        <Typography.Text>{t('message.add-kpi-message')}</Typography.Text>
      </Col>
    </Row>
  );
};

export default AddKPIPage;
