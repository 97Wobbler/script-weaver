import React from 'react';

function App() {
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
      <div className="flex-1 flex">
        {/* Toolbar */}
        <aside className="w-64 bg-white border-r border-gray-200 p-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">노드 추가</h3>
              <div className="space-y-2">
                <button className="w-full px-3 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors">
                  + 텍스트 노드
                </button>
                <button className="w-full px-3 py-2 text-sm bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors">
                  + 선택지 노드
                </button>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">프로젝트</h3>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">템플릿: default</p>
                <p className="text-sm text-gray-600">씬: main</p>
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
          {/* Canvas Placeholder */}
          <div className="h-full bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">노드를 추가하여 시작하세요</h3>
              <p className="text-gray-600 mb-4">왼쪽 패널에서 텍스트 노드나 선택지 노드를 추가할 수 있습니다.</p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                첫 번째 노드 추가
              </button>
            </div>
          </div>
        </div>

        {/* Property Panel */}
        <aside className="w-80 bg-white border-l border-gray-200 p-4">
          <div className="text-center text-gray-500 mt-8">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">노드를 선택하면<br />속성을 편집할 수 있습니다</p>
          </div>
        </aside>
      </div>

      {/* Status Bar */}
      <footer className="bg-white border-t border-gray-200 px-6 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>노드: 0개</span>
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
