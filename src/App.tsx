// React import removed as it's not needed with jsx transform
import Canvas from './components/Canvas';
import PropertyPanel from './components/PropertyPanel';
import { useEditorStore } from './store/editorStore';

function App() {
  const { 
    createTextNode, 
    createChoiceNode, 
    templateData, 
    currentTemplate, 
    currentScene 
  } = useEditorStore();

  // 현재 씬의 노드 수 계산
  const currentSceneData = templateData[currentTemplate]?.[currentScene];
  const nodeCount = currentSceneData ? Object.keys(currentSceneData).length : 0;

  // 노드 생성 핸들러
  const handleCreateTextNode = () => {
    const nodeKey = createTextNode("새 텍스트", "speaker");
    console.log(`텍스트 노드 생성됨: ${nodeKey}`);
  };

  const handleCreateChoiceNode = () => {
    const nodeKey = createChoiceNode("새 선택지", "speaker");
    console.log(`선택지 노드 생성됨: ${nodeKey}`);
  };

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
                  className="w-full px-3 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                >
                  + 텍스트 노드
                </button>
                <button 
                  onClick={handleCreateChoiceNode}
                  className="w-full px-3 py-2 text-sm bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
                >
                  + 선택지 노드
                </button>
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
                <button className="w-full px-3 py-2 text-sm bg-gray-50 text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors">
                  JSON 내보내기
                </button>
                <button className="w-full px-3 py-2 text-sm bg-gray-50 text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors">
                  CSV 내보내기
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
        <PropertyPanel />
      </div>

      {/* Status Bar */}
      <footer className="bg-white border-t border-gray-200 px-6 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>노드: {nodeCount}개</span>
            <span>상태: 준비</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>자동 저장됨</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
