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
  EntityFieldThreadCount,
  LeafNodes,
  LineagePos,
  LoadingNodeState,
} from 'Models';
import { HTMLAttributes } from 'react';
import { FeedFilter } from '../../enums/mydata.enum';
import { CreateThread } from '../../generated/api/feed/createThread';
import { Mlmodel } from '../../generated/entity/data/mlmodel';
import { Thread, ThreadType } from '../../generated/entity/feed/thread';
import { EntityLineage } from '../../generated/type/entityLineage';
import { EntityReference } from '../../generated/type/entityReference';
import { Paging } from '../../generated/type/paging';
import { ThreadUpdatedFunc } from '../../interface/feed.interface';
import { Edge, EdgeData } from '../EntityLineage/EntityLineage.interface';

export interface MlModelDetailProp extends HTMLAttributes<HTMLDivElement> {
  mlModelDetail: Mlmodel;
  activeTab: number;
  entityThread: Thread[];
  isEntityThreadLoading: boolean;
  paging: Paging;
  feedCount: number;
  followMlModelHandler: () => void;
  unfollowMlModelHandler: () => void;
  descriptionUpdateHandler: (updatedMlModel: Mlmodel) => Promise<void>;
  setActiveTabHandler: (value: number) => void;
  tagUpdateHandler: (updatedMlModel: Mlmodel) => void;
  updateMlModelFeatures: (updatedMlModel: Mlmodel) => Promise<void>;
  settingsUpdateHandler: (updatedMlModel: Mlmodel) => Promise<void>;
  lineageTabData: {
    loadNodeHandler: (node: EntityReference, pos: LineagePos) => void;
    addLineageHandler: (edge: Edge) => Promise<void>;
    removeLineageHandler: (data: EdgeData) => void;
    entityLineageHandler: (lineage: EntityLineage) => void;
    isLineageLoading?: boolean;
    entityLineage: EntityLineage;
    lineageLeafNodes: LeafNodes;
    isNodeLoading: LoadingNodeState;
  };
  onExtensionUpdate: (updatedMlModel: Mlmodel) => Promise<void>;
  fetchFeedHandler: (
    after?: string,
    feedType?: FeedFilter,
    threadType?: ThreadType
  ) => void;
  postFeedHandler: (value: string, id: string) => void;
  deletePostHandler: (
    threadId: string,
    postId: string,
    isThread: boolean
  ) => void;

  updateThreadHandler: ThreadUpdatedFunc;
  entityFieldThreadCount: EntityFieldThreadCount[];
  entityFieldTaskCount: EntityFieldThreadCount[];
  createThread: (data: CreateThread) => void;
}
