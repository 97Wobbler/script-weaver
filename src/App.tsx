// React import removed as it's not needed with jsx transform

import React, { useState, useRef } from 'react';
import Canvas from './components/Canvas';
import PropertyPanel from './components/PropertyPanel';
import { useEditorStore } from './store/editorStore';
import { globalAsyncOperationManager, type SystemStatus } from './store/asyncOperationManager';
import { downloadFile, uploadFile } from './utils/importExport';

// 전역 토스트 상태 타입
interface ToastState {
  isVisible: boolean;
  message: string;
  type: 'success' | 'info' | 'warning';
}

function App() {
  const { 
    createTextNode, 
    createChoiceNode, 
    templateData, 
    currentTemplate, 
    currentScene,
    exportToJSON,
    exportToCSV,
    importFromJSON,
    validateAllData,
    setSelectedNode,
    selectedNodeKey,
    arrangeChildNodesAsTree,
    arrangeAllNodesAsTree,
    arrangeNodesWithDagre,
    arrangeAllNodes,
    arrangeSelectedNodeChildren,
    arrangeSelectedNodeDescendants,
    canCreateNewNode
  } = useEditorStore();

  // 전역 토스트 상태
  const [toastState, setToastState] = useState<ToastState>({
    isVisible: false,
    message: '',
    type: 'info'
  });

  // 시스템 상태 관리
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    type: 'idle',
    message: '자동 저장됨',
    timestamp: Date.now()
  });

  // 토스트 타이머 참조
  const toastTimerRef = useRef<number | null>(null);

  // 전역 토스트 표시 함수
  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    // 이전 타이머가 있다면 취소
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    
    setToastState({ isVisible: true, message, type });
    
    // 새로운 타이머 설정
    toastTimerRef.current = setTimeout(() => {
      setToastState(prev => ({ ...prev, isVisible: false }));
      toastTimerRef.current = null;
    }, 3000);
  };

  // editorStore에 showToast 함수 연결
  React.useEffect(() => {
    const editorStore = useEditorStore.getState();
    editorStore.showToast = showToast;
  }, []);

  // AsyncOperationManager와 상태 콜백 연결
  React.useEffect(() => {
    const handleStatusChange = (status: SystemStatus) => {
      setSystemStatus(status);
    };

    globalAsyncOperationManager.setStatusChangeCallback(handleStatusChange);

    return () => {
      globalAsyncOperationManager.setStatusChangeCallback(undefined);
    };
  }, []);

  // 컴포넌트 언마운트 시 타이머 정리
  React.useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // 현재 씬의 노드 수 계산
  const currentSceneData = templateData[currentTemplate]?.[currentScene];
  const nodeCount = currentSceneData ? Object.keys(currentSceneData).length : 0;
  const canCreateNode = canCreateNewNode();
  const maxNodes = 100;

  // 노드 생성 핸들러
  const handleCreateTextNode = () => {
    try {
      const nodeKey = createTextNode("", "");
      setSelectedNode(nodeKey);
    } catch (error) {
      alert(error instanceof Error ? error.message : '노드 생성에 실패했습니다.');
    }
  };

  const handleCreateChoiceNode = () => {
    try {
      const nodeKey = createChoiceNode("", "");
      setSelectedNode(nodeKey);
    } catch (error) {
      alert(error instanceof Error ? error.message : '노드 생성에 실패했습니다.');
    }
  };

  // 노드 정렬 핸들러 (기존)
  const handleArrangeNodes = () => {
    if (selectedNodeKey) {
      // 선택된 노드가 있으면 그 자식 노드들을 정렬
      arrangeChildNodesAsTree(selectedNodeKey);
    } else {
      // 선택된 노드가 없으면 모든 노드를 정렬
      arrangeAllNodesAsTree();
    }
  };

  // 새로운 레이아웃 시스템 핸들러들
  const handleNewLayoutAll = async () => {
    await arrangeAllNodes();
  };

  const handleNewLayoutChildren = async () => {
    if (!selectedNodeKey) {
      showToast('노드를 선택한 후 자식 정렬을 실행해주세요.', 'warning');
      return;
    }
    
    await arrangeSelectedNodeChildren(selectedNodeKey);
  };

  const handleNewLayoutDescendants = async () => {
    if (!selectedNodeKey) {
      showToast('노드를 선택한 후 후손 정렬을 실행해주세요.', 'warning');
      return;
    }
    
    await arrangeSelectedNodeDescendants(selectedNodeKey);
  };

  // Export 핸들러들 (검증 포함)
  const handleExportJSON = () => {
    // 빈 프로젝트 체크
    if (nodeCount === 0) {
      alert('내보낼 노드가 없습니다. 먼저 노드를 추가해주세요.');
      return;
    }

    // Export 시점 검증
    const result = validateAllData();
    if (!result.isValid) {
      const errorMessages = result.errors.map(e => `${e.nodeKey} - ${e.field}: ${e.message}`);
      const errorText = errorMessages.slice(0, 5).join('\n');
      const remainingCount = errorMessages.length > 5 ? `\n... 외 ${errorMessages.length - 5}개` : '';
      
      alert(`데이터에 오류가 있어 내보낼 수 없습니다:\n\n${errorText}${remainingCount}`);
      return;
    }
    
    try {
      const jsonContent = exportToJSON();
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      downloadFile(jsonContent, `dialogue-${timestamp}.json`, 'application/json');
    } catch (error) {
      alert(`JSON 내보내기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  const handleExportCSV = () => {
    // 빈 프로젝트 체크
    if (nodeCount === 0) {
      alert('내보낼 노드가 없습니다. 먼저 노드를 추가해주세요.');
      return;
    }

    // Export 시점 검증
    const result = validateAllData();
    if (!result.isValid) {
      const errorMessages = result.errors.map(e => `${e.nodeKey} - ${e.field}: ${e.message}`);
      const errorText = errorMessages.slice(0, 5).join('\n');
      const remainingCount = errorMessages.length > 5 ? `\n... 외 ${errorMessages.length - 5}개` : '';
      
      alert(`데이터에 오류가 있어 내보낼 수 없습니다:\n\n${errorText}${remainingCount}`);
      return;
    }
    
    try {
      const { dialogue, localization } = exportToCSV();
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      
      downloadFile(dialogue, `dialogue-${timestamp}.csv`, 'text/csv');
      downloadFile(localization, `localization-${timestamp}.csv`, 'text/csv');
    } catch (error) {
      alert(`CSV 내보내기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  // Import 핸들러
  const handleImportJSON = async () => {
    try {
      const content = await uploadFile();
      importFromJSON(content);
      
      // 현재 노드 수와 템플릿 정보 확인
      const newNodeCount = Object.values(templateData).reduce((sum, template) => 
        sum + Object.values(template).reduce((sceneSum, scene) => 
          sceneSum + Object.keys(scene).length, 0), 0);
      
      alert(`JSON 파일을 성공적으로 가져왔습니다!\n노드: ${newNodeCount}개\n템플릿: ${Object.keys(templateData).length}개`);
    } catch (error) {
      alert(`JSON 가져오기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  // Undo/Redo 핸들러들




  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Script Weaver</h1>
            <span className="text-sm text-gray-500">Dialogue Editor</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">MVP v0.1.0</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Toolbar */}
        <aside className="w-64 bg-white border-r border-gray-200 p-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">노드 추가</h3>
              <div className="space-y-2">
                <button 
                  onClick={handleCreateTextNode}
                  disabled={!canCreateNode}
                  className={`w-full px-3 py-2 text-sm border rounded-md transition-colors ${
                    canCreateNode 
                      ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' 
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  }`}
                  title={!canCreateNode ? `노드 개수 제한 (${nodeCount}/${maxNodes})` : '새 텍스트 노드 추가'}
                >
                  + 텍스트 노드
                </button>
                <button 
                  onClick={handleCreateChoiceNode}
                  disabled={!canCreateNode}
                  className={`w-full px-3 py-2 text-sm border rounded-md transition-colors ${
                    canCreateNode 
                      ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  }`}
                  title={!canCreateNode ? `노드 개수 제한 (${nodeCount}/${maxNodes})` : '새 선택지 노드 추가'}
                >
                  + 선택지 노드
                </button>
              </div>
            </div>
            

            
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">스마트 정렬 🚀</h3>
              <div className="space-y-2">
                <button 
                  onClick={handleNewLayoutAll}
                  className="w-full px-3 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                  title="전체 캔버스의 모든 노드를 최적 배치합니다 (3단계 해결 방식)"
                >
                  🌐 전체 캔버스 정렬
                </button>
                <button 
                  onClick={handleNewLayoutChildren}
                  disabled={!selectedNodeKey}
                  className={`w-full px-3 py-2 text-sm border rounded-md transition-colors ${
                    selectedNodeKey 
                      ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  }`}
                  title={selectedNodeKey ? `선택된 노드의 직접 자식들만 정렬합니다` : "노드를 선택해주세요"}
                >
                  🔗 자식 노드 정렬
                </button>
                <button 
                  onClick={handleNewLayoutDescendants}
                  disabled={!selectedNodeKey}
                  className={`w-full px-3 py-2 text-sm border rounded-md transition-colors ${
                    selectedNodeKey 
                      ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' 
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  }`}
                  title={selectedNodeKey ? `선택된 노드의 모든 후손들을 정렬합니다` : "노드를 선택해주세요"}
                >
                  🌳 후손 전체 정렬
                </button>
              </div>
              
              {/* 기존 정렬 (호환성) */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <h4 className="text-xs font-medium text-gray-500 mb-2">기존 정렬 (호환성)</h4>
                <div className="space-y-1">
                  <button 
                    onClick={handleArrangeNodes}
                    className="w-full px-2 py-1 text-xs bg-orange-50 text-orange-600 border border-orange-200 rounded hover:bg-orange-100 transition-colors"
                    title={selectedNodeKey ? `기존 방식: 자식 노드 정렬` : "기존 방식: 전체 정렬"}
                  >
                    {selectedNodeKey ? '🔗 기존 자식 정렬' : '📐 기존 전체 정렬'}
                  </button>
                  <button 
                    onClick={arrangeNodesWithDagre}
                    className="w-full px-2 py-1 text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                    title="기존 Dagre 정렬"
                  >
                    ✨ 기존 Dagre
                  </button>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">프로젝트</h3>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">템플릿: {currentTemplate}</p>
                <p className="text-sm text-gray-600">씬: {currentScene}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">내보내기</h3>
              <div className="space-y-2">
                <button 
                  onClick={handleExportJSON}
                  className="w-full px-3 py-2 text-sm bg-gray-50 text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                >
                  JSON 내보내기
                </button>
                <button 
                  onClick={handleExportCSV}
                  className="w-full px-3 py-2 text-sm bg-gray-50 text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                >
                  CSV 내보내기
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">가져오기</h3>
              <div className="space-y-2">
                <button 
                  onClick={handleImportJSON}
                  className="w-full px-3 py-2 text-sm bg-purple-50 text-purple-700 border border-purple-200 rounded-md hover:bg-purple-100 transition-colors"
                >
                  JSON 가져오기
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Canvas Area */}
        <div className="flex-1 relative">
          <Canvas />
        </div>

        {/* Property Panel */}
        <PropertyPanel showToast={showToast} />
      </div>

      {/* Status Bar */}
      <footer className="bg-white border-t border-gray-200 px-6 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span className={nodeCount >= maxNodes ? 'text-red-600 font-medium' : ''}>
              노드: {nodeCount}/{maxNodes}개
            </span>
            {nodeCount >= maxNodes && (
              <span className="text-red-600 text-xs">⚠️ 최대 개수 도달</span>
            )}
            <span>상태: 준비</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              systemStatus.type === 'idle' ? 'bg-green-400' :
              systemStatus.type === 'working' ? 'bg-blue-400 animate-pulse' :
              systemStatus.type === 'success' ? 'bg-green-500' :
              systemStatus.type === 'error' ? 'bg-red-400' : 'bg-gray-400'
            }`}></div>
            <span className={
              systemStatus.type === 'error' ? 'text-red-600' :
              systemStatus.type === 'working' ? 'text-blue-600' :
              systemStatus.type === 'success' ? 'text-green-600' : ''
            }>
              {systemStatus.message}
            </span>
          </div>
        </div>
      </footer>

      {/* 토스트 알림 */}
      {toastState.isVisible && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 animate-fadeIn">
          <div className={`
            px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 min-w-80
            ${toastState.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : ''}
            ${toastState.type === 'info' ? 'bg-blue-50 border border-blue-200 text-blue-800' : ''}
            ${toastState.type === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' : ''}
          `}>
            <div className="flex-shrink-0">
              {toastState.type === 'success' && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {toastState.type === 'info' && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
              {toastState.type === 'warning' && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex-1 text-sm font-medium">
              {toastState.message}
            </div>
            <button
              onClick={() => setToastState(prev => ({ ...prev, isVisible: false }))}
              className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
