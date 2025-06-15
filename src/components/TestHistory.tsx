import React, { useState } from 'react';
import { useHistory } from '../hooks/useHistory';
import { useProjectStore } from '../store/projectStore';
import { useNodeCreation } from '../hooks/useNodeCreation';
import { useNodeStore } from '../store/nodeStore';
import { useHistoryStore } from '../store/historyStore';

export const TestHistory: React.FC = () => {
  const history = useHistory();
  const projectStore = useProjectStore();
  const nodeCreation = useNodeCreation();
  const nodeStore = useNodeStore();
  const historyStore = useHistoryStore();
  
  const [testAction, setTestAction] = useState('테스트 액션');
  const [compoundActionId, setCompoundActionId] = useState<string | null>(null);

  // 테스트용 노드 생성 함수
  const createTestNode = () => {
    try {
      const nodeKey = nodeCreation.createTextNode('테스트 내용', '테스트 화자');
      history.pushToHistory(`테스트 노드 생성: ${nodeKey}`);
    } catch (error) {
      console.error('노드 생성 오류:', error);
    }
  };

  // 테스트용 노드 수정 함수
  const updateTestNode = () => {
    const nodes = Object.values(projectStore.templateData[projectStore.currentTemplate]?.[projectStore.currentScene] || {});
    if (nodes.length > 0) {
      const node = nodes[0] as any;
      
      // 노드 업데이트 - projectStore를 통해 직접 업데이트
      const updatedNode = {
        ...node,
        dialogue: {
          ...node.dialogue,
          speakerText: '수정된 화자',
          contentText: '수정된 내용'
        }
      };
      
      const currentScene = projectStore.templateData[projectStore.currentTemplate]?.[projectStore.currentScene] || {};
      const updatedScene = { ...currentScene, [node.nodeKey]: updatedNode };
      const updatedTemplateData = {
        ...projectStore.templateData,
        [projectStore.currentTemplate]: {
          ...projectStore.templateData[projectStore.currentTemplate],
          [projectStore.currentScene]: updatedScene
        }
      };
      projectStore.updateTemplateData(updatedTemplateData);
      
      history.pushToHistory(`노드 수정: ${node.nodeKey}`);
    }
  };

  // 복합 액션 테스트
  const startCompoundTest = () => {
    const id = history.startCompoundAction('복합 테스트 액션');
    setCompoundActionId(id);
  };

  const endCompoundTest = () => {
    history.endCompoundAction();
    setCompoundActionId(null);
  };

  // 현재 씬의 노드 수
  const nodeCount = Object.keys(projectStore.templateData[projectStore.currentTemplate]?.[projectStore.currentScene] || {}).length;

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">🔄 useHistory Hook 테스트</h2>
        <div className="text-sm text-gray-600 mb-4">
          새로운 useHistory Hook의 모든 기능을 테스트합니다.
        </div>
      </div>

      {/* 히스토리 상태 정보 */}
      <div className="bg-blue-50 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">📊 히스토리 상태</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>히스토리 크기:</strong> {history.historySize}
          </div>
          <div>
            <strong>현재 액션:</strong> {history.currentAction || '없음'}
          </div>
          <div>
            <strong>Undo 가능:</strong> {history.canUndo ? '✅' : '❌'}
          </div>
          <div>
            <strong>Redo 가능:</strong> {history.canRedo ? '✅' : '❌'}
          </div>
          <div>
            <strong>Undo/Redo 진행중:</strong> {history.isUndoRedoInProgress ? '✅' : '❌'}
          </div>
          <div>
            <strong>복합 액션 진행중:</strong> {compoundActionId ? `✅ (${compoundActionId})` : '❌'}
          </div>
        </div>
      </div>

      {/* 기본 히스토리 테스트 */}
      <div className="bg-green-50 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-4">🏗️ 기본 히스토리 테스트</h3>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={testAction}
              onChange={(e) => setTestAction(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              placeholder="테스트 액션 이름"
            />
            <button
              onClick={() => history.pushToHistory(testAction)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
              히스토리 추가
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => history.pushToHistoryWithTextEdit('텍스트 편집 테스트')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              텍스트 편집 히스토리
            </button>
            <button
              onClick={createTestNode}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
              테스트 노드 생성
            </button>
            <button
              onClick={updateTestNode}
              disabled={nodeCount === 0}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400">
              노드 수정 ({nodeCount}개)
            </button>
          </div>
        </div>
      </div>

      {/* Undo/Redo 테스트 */}
      <div className="bg-yellow-50 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-4">↩️ Undo/Redo 테스트</h3>
        
        <div className="flex gap-2">
          <button
            onClick={history.undo}
            disabled={!history.canUndo}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400">
            ↩️ Undo {!history.canUndo && '(불가능)'}
          </button>
          <button
            onClick={history.redo}
            disabled={!history.canRedo}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400">
            ↪️ Redo {!history.canRedo && '(불가능)'}
          </button>
        </div>
      </div>

      {/* 복합 액션 테스트 */}
      <div className="bg-purple-50 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-purple-900 mb-4">🔗 복합 액션 테스트</h3>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            {!compoundActionId ? (
              <button
                onClick={startCompoundTest}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                복합 액션 시작
              </button>
            ) : (
              <>
                <button
                  onClick={endCompoundTest}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                  복합 액션 완료
                </button>
                <button
                  onClick={() => {
                    history.cancelCompoundAction();
                    setCompoundActionId(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                  복합 액션 취소
                </button>
              </>
            )}
          </div>

          {compoundActionId && (
            <div className="bg-purple-100 p-3 rounded-md">
              <p className="text-sm text-purple-800">
                복합 액션이 진행 중입니다. 이 상태에서는 중간 히스토리가 저장되지 않습니다.
              </p>
              <p className="text-xs text-purple-600 mt-1">
                ID: {compoundActionId}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 유틸리티 테스트 */}
      <div className="bg-gray-50 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🛠️ 유틸리티 테스트</h3>
        
        <div className="flex gap-2">
          <button
            onClick={() => history.trimHistory(10)}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
            히스토리 정리 (10개로)
          </button>
          <button
            onClick={history.clearHistory}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
            히스토리 전체 삭제
          </button>
        </div>
      </div>

      {/* 상세 히스토리 정보 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 히스토리 상세 정보</h3>
        
        <div className="space-y-2">
          <h4 className="font-medium text-gray-800">historyStore 상태:</h4>
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
            <div><strong>전체 히스토리:</strong> {historyStore.history.length}개</div>
            <div><strong>현재 인덱스:</strong> {historyStore.historyIndex}</div>
            <div><strong>Undo/Redo 진행중:</strong> {historyStore.isUndoRedoInProgress ? 'Yes' : 'No'}</div>
            <div><strong>복합 액션 ID:</strong> {historyStore.currentCompoundActionId || '없음'}</div>
          </div>

          {historyStore.history.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-800">최근 히스토리 (최대 5개):</h4>
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md max-h-40 overflow-y-auto">
                {historyStore.history.slice(-5).map((item, index) => (
                  <div key={index} className="py-1 border-b border-gray-200 last:border-b-0">
                    <span className="font-medium">{item.action}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                    {item.groupId && (
                      <span className="text-xs bg-purple-100 text-purple-600 px-1 rounded ml-2">
                        {item.groupId}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 동기화 상태 */}
      <div className="bg-indigo-50 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-indigo-900 mb-4">🔄 Store 동기화 상태</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>현재 템플릿:</strong> {projectStore.currentTemplate}
          </div>
          <div>
            <strong>현재 씬:</strong> {projectStore.currentScene}
          </div>
          <div>
            <strong>노드 수:</strong> {nodeCount}개
          </div>
          <div>
            <strong>선택된 노드:</strong> {nodeStore.selectedNodeKey || '없음'}
          </div>
        </div>
      </div>
    </div>
  );
}; 