import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Button, Typography } from 'antd';
import { v4 as uid } from 'uuid';

import { useAppDispatch } from '@/app/hooks';
import {
  addActionToEvent,
  addActionToScenario,
  argsToAction,
} from '@/features';
import { Action } from '@/features/interactive/interactiveSlice';
import { Icon } from '@/Icon';

import {
  TreeNodeExtended,
  useContextMenu,
} from '../../components/InteractionMenu';
import { getIsMultiTargetByTitle } from '../../components/InteractionSelector';
import InteractionSelector from '../../components/InteractionSelector';
import { formatComponentSettingsToText } from '../../Schema/hideOrShow';
import { formatSettingsToText } from '../../Schema/setTitle';

import ActionParamForm from './ActionParamForm';
import styles from './tree.module.less';

const { Text } = Typography;

interface ActionNodeProps {
  node: Action;
  level: number;
  hasSibling?: boolean;
  nodeId: string;
  eventId: string;
  scenarioId?: string;
  isDark: boolean;
  index?: number;
  selectedKey?: string;
  onSelect?: (key: string, type: string) => void;
  isModal?: boolean;
  handleActionParams?: (data: {
    actionName: string;
    initialValues: Record<string, unknown>;
    paramId: string;
    paramIndex: number;
    eventId?: string;
    scenarioId?: string;
    actionId?: string;
  }) => void;
  onTreeAddAction?: (eventId?: string, scenarioId?: string) => void;
}

// 参数文本节点组件
const ParamTextNode: React.FC<{
  param: any;
  index: number;
  paramTextNodeKey: string;
  paramTextNode: TreeNodeExtended;
  isParamOpenState: boolean;
  hasText: boolean;
  isParamTextSelected: boolean;
  scenarioId?: string;
  actionName: string;
  eventId: string;
  actionId: string;
  isModal?: boolean;
  onSelect?: (key: string, type: string) => void;
  setParamOpen: (param: any, index: number, isOpen: boolean) => void;
  handleActionParams?: (data: {
    actionName: string;
    initialValues: Record<string, unknown>;
    paramId: string;
    paramIndex: number;
    eventId?: string;
    scenarioId?: string;
    actionId?: string;
  }) => void;
  handleParamTextContextMenu: (paramTextNode: TreeNodeExtended) => (e: React.MouseEvent) => void;
  handleSubmit: (values: Record<string, any>, paramId?: string) => void;
  handleCancel: (index?: number) => void;
  closeMenu: () => void;
}> = memo(({
  param,
  index,
  paramTextNodeKey,
  paramTextNode,
  isParamOpenState,
  hasText,
  isParamTextSelected,
  scenarioId,
  actionName,
  eventId,
  actionId,
  isModal,
  onSelect,
  setParamOpen,
  handleActionParams,
  handleParamTextContextMenu,
  handleSubmit,
  handleCancel,
  closeMenu,
}) => {
  const handleParamClick = useCallback(() => {
    onSelect?.(paramTextNodeKey, 'text');
    setParamOpen(param, index, true);
    handleActionParams?.({
      actionName,
      initialValues: param?.args || {},
      paramId: param.id,
      paramIndex: index,
      eventId,
      scenarioId,
      actionId,
    });
    closeMenu();
  }, [
    paramTextNodeKey,
    param,
    index,
    actionName,
    eventId,
    scenarioId,
    actionId,
    onSelect,
    setParamOpen,
    handleActionParams,
    closeMenu,
  ]);

  const textClassName = useMemo(() => {
    const baseClass = hasText ? styles.hasText : styles.noHasText;
    const selectedClass = isParamTextSelected
      ? scenarioId
        ? styles.onfounsBorderTextSc
        : styles.onfounsBorderText
      : scenarioId
      ? styles.onfounsTargetTextSc
      : styles.onfounsTargetText;
    return `${selectedClass} ${baseClass}`;
  }, [isParamTextSelected, scenarioId, hasText]);

  if (isParamOpenState) {
    if (!isModal) {
      return (
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: '292px',
              position: 'relative',
              left: '-47px',
              marginTop: '8px',
            }}>
            <ActionParamForm
              actionName={actionName}
              initialValues={param?.args || {}}
              paramId={param.id}
              paramIndex={index}
              onSubmit={(values) => handleSubmit(values, param.id)}
              onCancel={() => handleCancel(index)}
            />
          </div>
        </div>
      );
    }

    if (hasText) {
      return (
        <span
          style={{
            display: 'inline-block',
            color: '#6dd400',
            marginRight: '8px',
            marginLeft: '16px',
            cursor: 'pointer',
          }}
          className={textClassName}
          onClick={handleParamClick}
          onContextMenu={handleParamTextContextMenu(paramTextNode)}>
          {param.text}
        </span>
      );
    }

    return (
      <span
        style={{
          display: 'inline-block',
          cursor: 'pointer',
          marginRight: 0,
          marginBottom: '8px',
          marginLeft: '16px',
        }}
        className={textClassName}
        onClick={handleParamClick}>
        <Icon type={'icon-jingshi'} className={styles.iconText} />
        <span className={styles.actionTitle}>未选择任何目标</span>
      </span>
    );
  }

  if (hasText) {
    return (
      <span
        style={{
          display: 'inline-block',
          color: '#6dd400',
          marginRight: '8px',
          marginLeft: '16px',
          cursor: 'pointer',
        }}
        className={textClassName}
        onClick={handleParamClick}
        onContextMenu={handleParamTextContextMenu(paramTextNode)}>
        {param.text}
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-block',
        cursor: 'pointer',
        marginRight: 0,
        marginBottom: '8px',
        marginLeft: '16px',
      }}
      className={textClassName}
      onClick={handleParamClick}>
      <Icon type={'icon-jingshi'} className={styles.iconText} />
      <span className={styles.actionTitle}>未选择任何目标</span>
    </span>
  );
});

ParamTextNode.displayName = 'ParamTextNode';

// 动作节点渲染
const ActionNode: React.FC<ActionNodeProps> = memo(
  ({
    node,
    level,
    hasSibling,
    nodeId,
    eventId,
    scenarioId,
    isDark,
    selectedKey,
    onSelect,
    isModal,
    handleActionParams,
    onTreeAddAction,
  }) => {
    const { showMenu, closeMenu } = useContextMenu();
    const nodeRef = useRef<HTMLDivElement>(null);
    const dispatch = useAppDispatch();
    const [openParams, setOpenParams] = useState<Map<string, boolean>>(
      new Map(),
    );
    const [showAddTarget, setShowAddTarget] = useState(false);

    const textNodeKey = `${node.key}-text`;
    const isActionSelected = selectedKey === node.key;
    const isMultiTarget = getIsMultiTargetByTitle(node?.title);

    // 获取param的key（优先使用id，否则使用index）
    const getParamKey = useCallback(
      (param: any, index: number) => param?.id || `param-${index}`,
      [],
    );

    // 获取或设置param的isOpen状态
    const isParamOpen = useCallback(
      (param: any, index: number) => {
        const key = getParamKey(param, index);
        return openParams.get(key) || false;
      },
      [openParams, getParamKey],
    );

    const setParamOpen = useCallback(
      (param: any, index: number, isOpen: boolean) => {
        const key = getParamKey(param, index);
        setOpenParams((prev) => {
          const newMap = new Map(prev);
          if (isOpen) {
            newMap.set(key, true);
          } else {
            newMap.delete(key);
          }
          return newMap;
        });
      },
      [getParamKey],
    );

    const addActionSelect = useCallback(
      (value: { title: string; name: string }) => {
        const actionData = {
          nodeId,
          eventKey: eventId,
          parameterDefinitions: {},
          data: {
            label: value.title,
            value: value.name,
          },
        };

        if (scenarioId) {
          dispatch(
            addActionToScenario({
              ...actionData,
              scenarioKey: scenarioId,
            }),
          );
        } else {
          dispatch(addActionToEvent(actionData));
        }
      },
      [dispatch, nodeId, eventId, scenarioId],
    );

    // 构建扩展节点信息
    const extendedNode: TreeNodeExtended = useMemo(
      () => ({
        ...node,
        eventId,
        scenarioId,
        actionId: node.key,
        type: 'action',
        children: undefined,
      }),
      [node, eventId, scenarioId],
    );

    const extendedTextNode: TreeNodeExtended = useMemo(
      () => ({
        key: textNodeKey,
        eventId,
        scenarioId,
        actionId: node.key,
        type: 'text',
        params: node.params,
      }),
      [textNodeKey, eventId, scenarioId, node.key, node.params],
    );

    // 为每个 param 的 text 节点创建扩展信息
    const extendedParamTextNodes = useMemo(() => {
      if (!node.params || node.params.length === 0) {
        return [];
      }
      return node.params.map((param: any, index: number) => {
        const paramKey = getParamKey(param, index);
        const paramTextNodeKey = `${textNodeKey}-${paramKey}`;
        return {
          key: paramTextNodeKey,
          eventId,
          scenarioId,
          actionId: node.key,
          type: 'text' as const,
          params: node.params,
          paramId: param?.id,
          paramIndex: index,
        };
      });
    }, [textNodeKey, eventId, scenarioId, node.key, node.params, getParamKey]);

    // 处理动作节点的右键菜单
    const handleActionContextMenu = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect?.(node.key, 'action');
        showMenu(extendedNode, { x: e.clientX, y: e.clientY });
      },
      [node.key, extendedNode, onSelect, showMenu],
    );

    // 处理文本节点的右键菜单
    const handleTextContextMenu = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect?.(textNodeKey, 'text');
        showMenu(extendedTextNode, { x: e.clientX, y: e.clientY }, 'delete-only');
      },
      [textNodeKey, extendedTextNode, onSelect, showMenu],
    );

    // 处理参数文本节点的右键菜单
    const handleParamTextContextMenu = useCallback(
      (paramTextNode: TreeNodeExtended) => {
        return (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          onSelect?.(paramTextNode.key, 'text');
          showMenu(paramTextNode, { x: e.clientX, y: e.clientY }, 'delete-only');
        };
      },
      [onSelect, showMenu],
    );

    const handleSubmit = useCallback(
      (values: Record<string, any>, paramId?: string) => {
        const content =
          node?.actionName === 'setHideOrShow'
            ? formatComponentSettingsToText(values)
            : formatSettingsToText(values);

        dispatch(
          argsToAction({
            nodeId,
            eventId,
            scenarioId,
            actionId: node.key,
            paramId,
            args: values,
            text: content,
          }),
        );

        // 关闭对应的param
        if (paramId && node.params) {
          const paramIndex = node.params.findIndex((p) => p.id === paramId);
          if (paramIndex !== -1) {
            setParamOpen(node.params[paramIndex], paramIndex, false);
          }
        }
      },
      [dispatch, nodeId, eventId, scenarioId, node.key, node.actionName, node.params, setParamOpen],
    );

    const handleCancel = useCallback(
      (index?: number) => {
        if (index !== undefined && node.params) {
          setParamOpen(node.params[index], index, false);
        }
      },
      [node.params, setParamOpen],
    );

    // 添加新目标（添加新的param）
    const handleAddTarget = useCallback(() => {
      const uuid = uid();
      dispatch(
        argsToAction({
          nodeId,
          eventId,
          scenarioId,
          actionId: node.key,
          paramId: uuid,
          args: {},
          text: '',
        }),
      );
      setParamOpen({ id: uuid }, -1, true);
    }, [dispatch, nodeId, eventId, scenarioId, node.key, setParamOpen]);

    const handleNodeClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect?.(node.key, 'action');
        closeMenu();
      },
      [node.key, onSelect, closeMenu],
    );

    const handleTextNodeClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect?.(textNodeKey, 'text');
        closeMenu();
      },
      [textNodeKey, onSelect, closeMenu],
    );

    const handleAddActionClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        closeMenu();
      },
      [closeMenu],
    );

    const handleAddActionContextMenu = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
      },
      [closeMenu],
    );

    const actionBorderClass = useMemo(() => {
      if (!isActionSelected) return '';
      return scenarioId ? styles.onfounsBorderAction : styles.onfounsBorder;
    }, [isActionSelected, scenarioId]);

    const paddingLeft = useMemo(
      () => (scenarioId ? `${level * 13}px` : `${level * 30}px`),
      [scenarioId, level],
    );

    return (
      <div
        ref={nodeRef}
        data-node-key={node.key}
        className={actionBorderClass}
        style={{
          position: 'relative',
          right: scenarioId ? '22px' : '',
          paddingBottom: '8px',
        }}
        onClick={handleNodeClick}
        onContextMenu={handleActionContextMenu}>
        <div
          className={
            isDark ? styles.actionContentDark : styles.actionContentLight
          }
          style={{ paddingLeft }}>
          <div
            className={styles.actionPanel}
            onMouseEnter={() => setShowAddTarget(true)}
            onMouseLeave={() => setShowAddTarget(false)}>
            <Text className={styles.actionTitle}>{node.title}</Text>
            {showAddTarget && isMultiTarget && (
              <div className={styles.operation} onClick={handleAddTarget}>
                <p className={styles.operateText}>添加目标</p>
              </div>
            )}
          </div>
          <div
            data-node-key={textNodeKey}
            onClick={handleTextNodeClick}
            onContextMenu={handleTextContextMenu}
            style={{
              position: 'relative',
              left: '-38px',
              width: '280px',
            }}>
            {node?.params &&
              node.params.length > 0 &&
              node.params.map((param, index) => {
                const paramKey = getParamKey(param, index);
                const paramTextNodeKey = `${textNodeKey}-${paramKey}`;
                const isParamOpenState = isParamOpen(param, index);
                const hasText = param.text && param.text.trim() !== '';
                const isParamTextSelected = selectedKey === paramTextNodeKey;

                return (
                  <div
                    data-node-key={paramTextNodeKey}
                    data-menu-mode="delete-only"
                    key={paramKey}
                    className={styles.actionContain}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect?.(paramTextNodeKey, 'text');
                      closeMenu();
                    }}
                    onContextMenu={handleParamTextContextMenu(
                      extendedParamTextNodes[index],
                    )}>
                    <ParamTextNode
                      param={param}
                      index={index}
                      paramTextNodeKey={paramTextNodeKey}
                      paramTextNode={extendedParamTextNodes[index]}
                      isParamOpenState={isParamOpenState}
                      hasText={hasText}
                      isParamTextSelected={isParamTextSelected}
                      scenarioId={scenarioId}
                      actionName={node?.actionName}
                      eventId={eventId}
                      actionId={node.key}
                      isModal={isModal}
                      onSelect={onSelect}
                      setParamOpen={setParamOpen}
                      handleActionParams={handleActionParams}
                      handleParamTextContextMenu={handleParamTextContextMenu}
                      handleSubmit={handleSubmit}
                      handleCancel={handleCancel}
                      closeMenu={closeMenu}
                    />
                  </div>
                );
              })}
          </div>
          {!hasSibling && (
            <div
              className={styles.actionAdd}
              style={{ margin: '8px 0 2px 0' }}
              onClick={handleAddActionClick}
              onContextMenu={handleAddActionContextMenu}>
              {isModal && onTreeAddAction ? (
                <Button
                  type="text"
                  icon={
                    <Icon
                      type={'icon-bianlan_tianjia'}
                      className={styles.iconTextAdd}
                    />
                  }
                  onClick={() => onTreeAddAction(eventId, scenarioId)}>
                  <span
                    className={styles.addText}
                    style={{ textDecoration: 'underline' }}>
                    添加动作
                  </span>
                </Button>
              ) : (
                <InteractionSelector
                  isDark={isDark}
                  type="action"
                  onSelectAction={addActionSelect}
                  offset={['-97%', '120%']}>
                  <Button
                    type="text"
                    icon={
                      <Icon
                        type={'icon-bianlan_tianjia'}
                        className={styles.iconTextAdd}
                      />
                    }>
                    <span
                      className={styles.addText}
                      style={{ textDecoration: 'underline' }}>
                      添加动作
                    </span>
                  </Button>
                </InteractionSelector>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);

ActionNode.displayName = 'ActionNode';

export default ActionNode;
