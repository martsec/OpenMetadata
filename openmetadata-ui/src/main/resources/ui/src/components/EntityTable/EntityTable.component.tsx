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

import { Popover, Table, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import classNames from 'classnames';
import { cloneDeep, isEmpty, isUndefined, lowerCase, toLower } from 'lodash';
import { EntityFieldThreads, EntityTags, TagOption } from 'Models';
import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { FQN_SEPARATOR_CHAR } from '../../constants/char.constants';
import { EntityField } from '../../constants/Feeds.constants';
import { SettledStatus } from '../../enums/axios.enum';
import { EntityType, FqnPart } from '../../enums/entity.enum';
import { Column } from '../../generated/entity/data/table';
import { ThreadType } from '../../generated/entity/feed/thread';
import { LabelType, State, TagLabel } from '../../generated/type/tagLabel';
import { getPartialNameFromTableFQN } from '../../utils/CommonUtils';
import {
  ENTITY_LINK_SEPARATOR,
  getFrequentlyJoinedColumns,
} from '../../utils/EntityUtils';
import { getFieldThreadElement } from '../../utils/FeedElementUtils';
import {
  fetchGlossaryTerms,
  getGlossaryTermlist,
} from '../../utils/GlossaryUtils';
import SVGIcons, { Icons } from '../../utils/SvgUtils';
import {
  getDataTypeString,
  getTableExpandableConfig,
  makeData,
  prepareConstraintIcon,
} from '../../utils/TableUtils';
import { getClassifications, getTaglist } from '../../utils/TagsUtils';
import {
  getRequestDescriptionPath,
  getRequestTagsPath,
  getUpdateDescriptionPath,
  getUpdateTagsPath,
} from '../../utils/TasksUtils';
import RichTextEditorPreviewer from '../common/rich-text-editor/RichTextEditorPreviewer';
import { ModalWithMarkdownEditor } from '../Modals/ModalWithMarkdownEditor/ModalWithMarkdownEditor';
import TagsContainer from '../tags-container/tags-container';
import TagsViewer from '../tags-viewer/tags-viewer';
import { EntityTableProps, TableCellRendered } from './EntityTable.interface';
import './EntityTable.style.less';

const EntityTable = ({
  tableColumns,
  searchText,
  onUpdate,
  hasDescriptionEditAccess,
  hasTagEditAccess,
  joins,
  entityFieldThreads,
  isReadOnly = false,
  onThreadLinkSelect,
  entityFqn,
  tableConstraints,
  entityFieldTasks,
}: EntityTableProps) => {
  const history = useHistory();
  const { t } = useTranslation();

  const [searchedColumns, setSearchedColumns] = useState<Column[]>([]);

  const data = React.useMemo(
    () => makeData(searchedColumns),
    [searchedColumns]
  );

  const [editColumn, setEditColumn] = useState<{
    column: Column;
    index: number;
  }>();

  const [editColumnTag, setEditColumnTag] = useState<{
    column: Column;
    index: number;
  }>();

  const [allTags, setAllTags] = useState<Array<TagOption>>([]);
  const [isTagLoading, setIsTagLoading] = useState<boolean>(false);
  const [tagFetchFailed, setTagFetchFailed] = useState<boolean>(false);

  const fetchTagsAndGlossaryTerms = () => {
    setIsTagLoading(true);
    Promise.allSettled([getClassifications(), fetchGlossaryTerms()])
      .then((values) => {
        let tagsAndTerms: TagOption[] = [];
        if (
          values[0].status === SettledStatus.FULFILLED &&
          values[0].value.data
        ) {
          tagsAndTerms = getTaglist(values[0].value.data).map((tag) => {
            return { fqn: tag, source: 'Tag' };
          });
        }
        if (
          values[1].status === SettledStatus.FULFILLED &&
          values[1].value &&
          values[1].value.length > 0
        ) {
          const glossaryTerms: TagOption[] = getGlossaryTermlist(
            values[1].value
          ).map((tag) => {
            return { fqn: tag, source: 'Glossary' };
          });
          tagsAndTerms = [...tagsAndTerms, ...glossaryTerms];
        }
        setAllTags(tagsAndTerms);
        if (
          values[0].status === SettledStatus.FULFILLED &&
          values[1].status === SettledStatus.FULFILLED
        ) {
          setTagFetchFailed(false);
        } else {
          setTagFetchFailed(true);
        }
        setIsTagLoading(false);
      })
      .catch(() => {
        setAllTags([]);
        setTagFetchFailed(true);
      })
      .finally(() => {
        setIsTagLoading(false);
      });
  };

  const handleEditColumn = (column: Column, index: number): void => {
    setEditColumn({ column, index });
  };
  const closeEditColumnModal = (): void => {
    setEditColumn(undefined);
  };

  const handleEditColumnTag = (column: Column, index: number): void => {
    setEditColumnTag({ column, index });
  };

  const updateColumnDescription = (
    tableCols: Column[],
    changedColName: string,
    description: string
  ) => {
    tableCols?.forEach((col) => {
      if (col.name === changedColName) {
        col.description = description;
      } else {
        updateColumnDescription(
          col?.children as Column[],
          changedColName,
          description
        );
      }
    });
  };

  const updateColumnTags = (
    tableCols: Column[],
    changedColName: string,
    newColumnTags: Array<TagOption>
  ) => {
    const getUpdatedTags = (column: Column) => {
      const prevTags = column?.tags?.filter((tag) => {
        return newColumnTags.map((tag) => tag.fqn).includes(tag.tagFQN);
      });

      const newTags: Array<EntityTags> = newColumnTags
        .filter((tag) => {
          return !prevTags?.map((prevTag) => prevTag.tagFQN).includes(tag.fqn);
        })
        .map((tag) => ({
          labelType: LabelType.Manual,
          state: State.Confirmed,
          source: tag.source,
          tagFQN: tag.fqn,
        }));
      const updatedTags = [...(prevTags as TagLabel[]), ...newTags];

      return updatedTags;
    };

    tableCols?.forEach((col) => {
      if (col.name === changedColName) {
        col.tags = getUpdatedTags(col);
      } else {
        updateColumnTags(
          col?.children as Column[],
          changedColName,
          newColumnTags
        );
      }
    });
  };

  const handleEditColumnChange = async (columnDescription: string) => {
    if (editColumn) {
      const tableCols = cloneDeep(tableColumns);
      updateColumnDescription(
        tableCols,
        editColumn.column.name,
        columnDescription
      );
      await onUpdate?.(tableCols);
      setEditColumn(undefined);
    } else {
      setEditColumn(undefined);
    }
  };

  const handleTagSelection = (
    selectedTags?: Array<EntityTags>,
    columnName = ''
  ) => {
    const newSelectedTags: TagOption[] | undefined = selectedTags?.map(
      (tag) => {
        return { fqn: tag.tagFQN, source: tag.source };
      }
    );
    if (newSelectedTags && (editColumnTag || columnName)) {
      const tableCols = cloneDeep(tableColumns);
      updateColumnTags(
        tableCols,
        editColumnTag?.column.name || columnName,
        newSelectedTags
      );
      onUpdate?.(tableCols);
    }
    setEditColumnTag(undefined);
  };

  const searchInColumns = (table: Column[], searchText: string): Column[] => {
    const searchedValue: Column[] = table.reduce((searchedCols, column) => {
      const isContainData =
        lowerCase(column.name).includes(searchText) ||
        lowerCase(column.description).includes(searchText) ||
        lowerCase(getDataTypeString(column.dataType)).includes(searchText);

      if (isContainData) {
        return [...searchedCols, column];
      } else if (!isUndefined(column.children)) {
        const searchedChildren = searchInColumns(column.children, searchText);
        if (searchedChildren.length > 0) {
          return [
            ...searchedCols,
            {
              ...column,
              children: searchedChildren,
            },
          ];
        }
      }

      return searchedCols;
    }, [] as Column[]);

    return searchedValue;
  };

  const getColumnName = (cell: Column) => {
    const fqn = cell?.fullyQualifiedName || '';
    const columnName = getPartialNameFromTableFQN(fqn, [FqnPart.NestedColumn]);
    // wrap it in quotes if dot is present

    return columnName.includes(FQN_SEPARATOR_CHAR)
      ? `"${columnName}"`
      : columnName;
  };

  const onRequestDescriptionHandler = (cell: Column) => {
    const field = EntityField.COLUMNS;
    const value = getColumnName(cell);
    history.push(
      getRequestDescriptionPath(
        EntityType.TABLE,
        entityFqn as string,
        field,
        value
      )
    );
  };

  const onUpdateDescriptionHandler = (cell: Column) => {
    const field = EntityField.COLUMNS;
    const value = getColumnName(cell);
    history.push(
      getUpdateDescriptionPath(
        EntityType.TABLE,
        entityFqn as string,
        field,
        value
      )
    );
  };

  const onRequestTagsHandler = (cell: Column) => {
    const field = EntityField.COLUMNS;
    const value = getColumnName(cell);
    history.push(
      getRequestTagsPath(EntityType.TABLE, entityFqn as string, field, value)
    );
  };

  const onUpdateTagsHandler = (cell: Column) => {
    const field = EntityField.COLUMNS;
    const value = getColumnName(cell);
    history.push(
      getUpdateTagsPath(EntityType.TABLE, entityFqn as string, field, value)
    );
  };

  const handleUpdate = (column: Column, index: number) => {
    handleEditColumn(column, index);
  };

  const getRequestDescriptionElement = (cell: Column) => {
    const hasDescription = Boolean(cell?.description ?? '');

    return (
      <button
        className="tw-w-7 tw-h-7 tw-flex-none link-text focus:tw-outline-none hover-cell-icon"
        data-testid="request-description"
        onClick={() =>
          hasDescription
            ? onUpdateDescriptionHandler(cell)
            : onRequestDescriptionHandler(cell)
        }>
        <Popover
          destroyTooltipOnHide
          content={
            hasDescription
              ? t('label.request-update-description')
              : t('label.request-description')
          }
          overlayClassName="ant-popover-request-description"
          trigger="hover"
          zIndex={9999}>
          <SVGIcons
            alt={t('label.request-description')}
            icon={Icons.REQUEST}
            width="16px"
          />
        </Popover>
      </button>
    );
  };

  const getRequestTagsElement = (cell: Column) => {
    const hasTags = !isEmpty(cell?.tags || []);
    const text = hasTags
      ? t('label.update-request-tags')
      : t('label.request-tags');

    return (
      <button
        className="tw-w-7 tw-h-7 tw-flex-none link-text focus:tw-outline-none tw-align-top hover-cell-icon"
        data-testid="request-tags"
        onClick={() =>
          hasTags ? onUpdateTagsHandler(cell) : onRequestTagsHandler(cell)
        }>
        <Popover
          destroyTooltipOnHide
          content={text}
          overlayClassName="ant-popover-request-description"
          trigger="hover"
          zIndex={9999}>
          <SVGIcons
            alt={t('label.request-tags')}
            icon={Icons.REQUEST}
            width="16px"
          />
        </Popover>
      </button>
    );
  };

  const renderDataTypeDisplay: TableCellRendered<Column, 'dataTypeDisplay'> = (
    dataTypeDisplay
  ) => {
    return (
      <>
        {dataTypeDisplay ? (
          isReadOnly || (dataTypeDisplay.length < 25 && !isReadOnly) ? (
            toLower(dataTypeDisplay)
          ) : (
            <Popover
              destroyTooltipOnHide
              content={toLower(dataTypeDisplay)}
              overlayInnerStyle={{
                maxWidth: '420px',
                overflowWrap: 'break-word',
                textAlign: 'center',
              }}
              trigger="hover">
              <Typography.Text ellipsis className="cursor-pointer">
                {dataTypeDisplay}
              </Typography.Text>
            </Popover>
          )
        ) : (
          '--'
        )}
      </>
    );
  };

  const renderDescription: TableCellRendered<Column, 'description'> = (
    description,
    record,
    index
  ) => {
    return (
      <div className="hover-icon-group">
        <div className="d-inline-block">
          <div
            className="d-flex"
            data-testid="description"
            id={`column-description-${index}`}>
            <div>
              {description ? (
                <RichTextEditorPreviewer markdown={description} />
              ) : (
                <span className="tw-no-description">
                  {t('label.no-description')}
                </span>
              )}
            </div>
            <div className="d-flex tw--mt-1.5">
              {!isReadOnly ? (
                <Fragment>
                  {hasDescriptionEditAccess && (
                    <>
                      <button
                        className="tw-self-start tw-w-7 tw-h-7 focus:tw-outline-none tw-flex-none hover-cell-icon"
                        onClick={() => handleUpdate(record, index)}>
                        <SVGIcons
                          alt={t('label.edit')}
                          icon="icon-edit"
                          title={t('label.edit')}
                          width="16px"
                        />
                      </button>
                    </>
                  )}
                  {getRequestDescriptionElement(record)}
                  {getFieldThreadElement(
                    getColumnName(record),
                    EntityField.DESCRIPTION,
                    entityFieldThreads as EntityFieldThreads[],
                    onThreadLinkSelect,
                    EntityType.TABLE,
                    entityFqn,
                    `columns${ENTITY_LINK_SEPARATOR}${getColumnName(
                      record
                    )}${ENTITY_LINK_SEPARATOR}description`,
                    Boolean(record)
                  )}
                  {getFieldThreadElement(
                    getColumnName(record),
                    EntityField.DESCRIPTION,
                    entityFieldTasks as EntityFieldThreads[],
                    onThreadLinkSelect,
                    EntityType.TABLE,
                    entityFqn,
                    `columns${ENTITY_LINK_SEPARATOR}${getColumnName(
                      record
                    )}${ENTITY_LINK_SEPARATOR}description`,
                    Boolean(record),
                    ThreadType.Task
                  )}
                </Fragment>
              ) : null}
            </div>
          </div>
        </div>
        {getFrequentlyJoinedColumns(
          record?.name,
          joins,
          t('label.frequently-joined-columns')
        )}
      </div>
    );
  };

  const renderTags: TableCellRendered<Column, 'tags'> = useCallback(
    (tags, record: Column, index: number) => {
      return (
        <div className="hover-icon-group">
          {isReadOnly ? (
            <div className="tw-flex tw-flex-wrap">
              <TagsViewer sizeCap={-1} tags={tags || []} />
            </div>
          ) : (
            <div
              className={classNames(
                `tw-flex tw-justify-content`,
                editColumnTag?.index === index || !isEmpty(tags)
                  ? 'tw-flex-col tw-items-start'
                  : 'tw-items-center'
              )}
              data-testid="tags-wrapper"
              onClick={() => {
                if (!editColumnTag) {
                  handleEditColumnTag(record, index);
                  // Fetch tags and terms only once
                  if (allTags.length === 0 || tagFetchFailed) {
                    fetchTagsAndGlossaryTerms();
                  }
                }
              }}>
              <TagsContainer
                className="w-max-256"
                editable={editColumnTag?.index === index}
                isLoading={isTagLoading && editColumnTag?.index === index}
                selectedTags={tags || []}
                showAddTagButton={hasTagEditAccess}
                size="small"
                tagList={allTags}
                type="label"
                onCancel={() => {
                  handleTagSelection();
                }}
                onSelectionChange={(selectedTags) => {
                  handleTagSelection(selectedTags, record?.name);
                }}
              />

              <div className="tw-mt-1 tw-flex">
                {getRequestTagsElement(record)}
                {getFieldThreadElement(
                  getColumnName(record),
                  'tags',
                  entityFieldThreads as EntityFieldThreads[],
                  onThreadLinkSelect,
                  EntityType.TABLE,
                  entityFqn,
                  `columns${ENTITY_LINK_SEPARATOR}${getColumnName(
                    record
                  )}${ENTITY_LINK_SEPARATOR}tags`,
                  Boolean(record?.name?.length)
                )}
                {getFieldThreadElement(
                  getColumnName(record),
                  EntityField.TAGS,
                  entityFieldTasks as EntityFieldThreads[],
                  onThreadLinkSelect,
                  EntityType.TABLE,
                  entityFqn,
                  `${
                    EntityField.COLUMNS
                  }${ENTITY_LINK_SEPARATOR}${getColumnName(
                    record
                  )}${ENTITY_LINK_SEPARATOR}${EntityField.TAGS}`,
                  Boolean(record?.name),
                  ThreadType.Task
                )}
              </div>
            </div>
          )}
        </div>
      );
    },
    [
      isReadOnly,
      editColumnTag,
      hasTagEditAccess,
      isTagLoading,
      handleTagSelection,
      handleEditColumnTag,
      fetchTagsAndGlossaryTerms,
      getRequestTagsElement,
    ]
  );

  const columns: ColumnsType<Column> = useMemo(
    () => [
      {
        title: t('label.name'),
        dataIndex: 'name',
        key: 'name',
        accessor: 'name',
        ellipsis: true,
        width: 220,
        render: (name: Column['name'], record: Column) => (
          <Popover destroyTooltipOnHide content={name} trigger="hover">
            {prepareConstraintIcon(name, record.constraint, tableConstraints)}
            <span>{name}</span>
          </Popover>
        ),
      },
      {
        title: t('label.type'),
        dataIndex: 'dataTypeDisplay',
        key: 'dataTypeDisplay',
        accessor: 'dataTypeDisplay',
        ellipsis: true,
        width: 220,
        render: renderDataTypeDisplay,
      },
      {
        title: t('label.description'),
        dataIndex: 'description',
        key: 'description',
        accessor: 'description',
        render: renderDescription,
      },
      {
        title: t('label.tag-plural'),
        dataIndex: 'tags',
        key: 'tags',
        accessor: 'tags',
        width: 272,
        render: renderTags,
      },
    ],
    [editColumnTag, isTagLoading, handleUpdate, handleTagSelection]
  );

  useEffect(() => {
    if (!searchText) {
      setSearchedColumns(tableColumns);
    } else {
      const searchCols = searchInColumns(tableColumns, searchText);
      setSearchedColumns(searchCols);
    }
  }, [searchText, tableColumns]);

  return (
    <>
      <Table
        bordered
        columns={columns}
        data-testid="entity-table"
        dataSource={data}
        expandable={{
          ...getTableExpandableConfig<Column>(),
          rowExpandable: (record) => !isEmpty(record.children),
        }}
        pagination={false}
        size="small"
      />
      {editColumn && (
        <ModalWithMarkdownEditor
          header={`${t('label.edit-entity', { entity: t('label.column') })}: "${
            editColumn.column.name
          }"`}
          placeholder={t('label.enter-column-description')}
          value={editColumn.column.description as string}
          visible={Boolean(editColumn)}
          onCancel={closeEditColumnModal}
          onSave={handleEditColumnChange}
        />
      )}
    </>
  );
};

export default EntityTable;
