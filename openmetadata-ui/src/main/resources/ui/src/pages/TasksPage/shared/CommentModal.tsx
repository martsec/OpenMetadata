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

import { Modal } from 'antd';
import React, { FC } from 'react';
import { useTranslation } from 'react-i18next';
import RichTextEditor from '../../../components/common/rich-text-editor/RichTextEditor';
import { Thread } from '../../../generated/entity/feed/thread';

interface CommentModalProps {
  taskDetail: Thread;
  comment: string;
  open: boolean;
  setComment: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

const CommentModal: FC<CommentModalProps> = ({
  taskDetail,
  comment,
  open,
  setComment,
  onClose,
  onConfirm,
  isLoading,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      centered
      destroyOnClose
      cancelButtonProps={{
        type: 'link',
        className: 'ant-btn-link-custom',
      }}
      closable={false}
      confirmLoading={isLoading}
      data-testid="comment-modal"
      okButtonProps={{
        disabled: !comment,
        className: 'ant-btn-primary-custom',
      }}
      okText="Close with comment"
      open={open}
      title={`Close Task #${taskDetail.task?.id} ${taskDetail.message}`}
      width={900}
      onCancel={onClose}
      onOk={onConfirm}>
      <RichTextEditor
        height="208px"
        initialValue={comment}
        placeHolder={t('label.add-comment')}
        style={{ marginTop: '0px' }}
        onTextChange={setComment}
      />
    </Modal>
  );
};

export default CommentModal;
