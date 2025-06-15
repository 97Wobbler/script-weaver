import React, { useState } from 'react';
import { useProject } from '../hooks/useProject';

export const TestProject: React.FC = () => {
  const project = useProject();
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newSceneName, setNewSceneName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newTag, setNewTag] = useState('');

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Project Store 테스트</h2>
      
      {/* 프로젝트 상태 표시 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">프로젝트 상태</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>프로젝트명:</strong> {project.metadata.name}
          </div>
          <div>
            <strong>설명:</strong> {project.metadata.description || '없음'}
          </div>
          <div>
            <strong>버전:</strong> {project.metadata.version}
          </div>
          <div>
            <strong>작성자:</strong> {project.metadata.author || '없음'}
          </div>
          <div>
            <strong>생성일:</strong> {new Date(project.metadata.createdAt).toLocaleString()}
          </div>
          <div>
            <strong>수정일:</strong> {new Date(project.metadata.updatedAt).toLocaleString()}
          </div>
          <div>
            <strong>현재 템플릿:</strong> {project.currentTemplate}
          </div>
          <div>
            <strong>현재 씬:</strong> {project.currentScene}
          </div>
          <div>
            <strong>변경사항:</strong> {project.isDirty ? '있음' : '없음'}
          </div>
          <div>
            <strong>마지막 저장:</strong> {project.lastSaved ? new Date(project.lastSaved).toLocaleString() : '없음'}
          </div>
        </div>
        
        {/* 태그 표시 */}
        <div className="mt-3">
          <strong>태그:</strong>
          <div className="flex flex-wrap gap-2 mt-1">
            {project.metadata.tags.map((tag, index) => (
              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                {tag}
                <button
                  onClick={() => project.removeTag(tag)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 템플릿/씬 목록 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">템플릿/씬 목록</h3>
        <div className="space-y-2">
          {project.templateList.map(templateKey => (
            <div key={templateKey} className="border rounded p-2">
              <div className="flex items-center justify-between">
                <strong className={templateKey === project.currentTemplate ? 'text-blue-600' : ''}>
                  템플릿: {templateKey}
                </strong>
                <div className="space-x-2">
                  <button
                    onClick={() => project.setCurrentTemplate(templateKey)}
                    className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                    disabled={templateKey === project.currentTemplate}
                  >
                    선택
                  </button>
                  {templateKey !== 'default' && (
                    <button
                      onClick={() => project.deleteTemplate(templateKey)}
                      className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
              <div className="ml-4 mt-2 space-y-1">
                {project.getSceneList(templateKey).map(sceneKey => (
                  <div key={sceneKey} className="flex items-center justify-between text-sm">
                    <span className={sceneKey === project.currentScene && templateKey === project.currentTemplate ? 'text-green-600' : ''}>
                      씬: {sceneKey}
                    </span>
                    <div className="space-x-2">
                      <button
                        onClick={() => {
                          project.setCurrentTemplate(templateKey);
                          project.setCurrentScene(sceneKey);
                        }}
                        className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                        disabled={sceneKey === project.currentScene && templateKey === project.currentTemplate}
                      >
                        선택
                      </button>
                      {sceneKey !== 'main' && (
                        <button
                          onClick={() => project.deleteScene(templateKey, sceneKey)}
                          className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 프로젝트 메타데이터 수정 */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">프로젝트 메타데이터 수정</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <input
              type="text"
              placeholder="프로젝트명"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
            <button
              onClick={() => {
                console.log('프로젝트명 변경 전:', project.metadata.name);
                project.setProjectName(newProjectName);
                
                // 비동기 업데이트 확인을 위해 setTimeout 사용
                setTimeout(() => {
                  console.log('프로젝트명 변경 후 (비동기):', project.metadata.name);
                  console.log('localStorage 내용:', localStorage.getItem('script-weaver-project'));
                }, 100);
                
                setNewProjectName('');
              }}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={!newProjectName}
            >
              프로젝트명 변경
            </button>
          </div>
          <div>
            <input
              type="text"
              placeholder="새 태그"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
            <button
              onClick={() => {
                console.log('태그 추가 전:', project.metadata.tags);
                project.addTag(newTag);
                
                // 비동기 업데이트 확인을 위해 setTimeout 사용
                setTimeout(() => {
                  console.log('태그 추가 후 (비동기):', project.metadata.tags);
                  console.log('localStorage 내용:', localStorage.getItem('script-weaver-project'));
                }, 100);
                
                setNewTag('');
              }}
              className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              disabled={!newTag}
            >
              태그 추가
            </button>
          </div>
        </div>
        
        {/* 디버깅 정보 */}
        <div className="mt-4 p-3 bg-yellow-100 rounded text-sm">
          <h4 className="font-medium mb-2">디버깅 정보</h4>
          <div><strong>현재 프로젝트명:</strong> "{project.metadata.name}"</div>
          <div><strong>현재 태그:</strong> [{project.metadata.tags.join(', ')}]</div>
          <div><strong>isDirty:</strong> {project.isDirty ? 'true' : 'false'}</div>
          <div><strong>updatedAt:</strong> {project.metadata.updatedAt}</div>
          
          <div className="mt-3 space-x-2">
            <button
              onClick={() => {
                const stored = localStorage.getItem('script-weaver-project');
                if (stored) {
                  const parsed = JSON.parse(stored);
                  console.log('localStorage 전체 내용:', parsed);
                  console.log('localStorage 메타데이터:', parsed.metadata);
                } else {
                  console.log('localStorage에 저장된 데이터 없음');
                }
              }}
              className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
            >
              localStorage 확인
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('script-weaver-project');
                console.log('localStorage 클리어됨');
                window.location.reload();
              }}
              className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
            >
              localStorage 클리어 & 새로고침
            </button>
          </div>
        </div>
      </div>

      {/* 템플릿/씬 생성 */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">템플릿/씬 생성</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <input
              type="text"
              placeholder="새 템플릿명"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
            <div className="mt-2 space-x-2">
              <button
                onClick={() => {
                  project.createTemplate(newTemplateName);
                  setNewTemplateName('');
                }}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                disabled={!newTemplateName || project.hasTemplate(newTemplateName)}
              >
                새 템플릿
              </button>
              <button
                onClick={() => {
                  project.duplicateTemplate(project.currentTemplate, newTemplateName);
                  setNewTemplateName('');
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                disabled={!newTemplateName || project.hasTemplate(newTemplateName)}
              >
                현재 템플릿 복사
              </button>
            </div>
          </div>
          <div>
            <input
              type="text"
              placeholder="새 씬명"
              value={newSceneName}
              onChange={(e) => setNewSceneName(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
            <div className="mt-2 space-x-2">
              <button
                onClick={() => {
                  project.createScene(project.currentTemplate, newSceneName);
                  setNewSceneName('');
                }}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                disabled={!newSceneName || project.hasScene(project.currentTemplate, newSceneName)}
              >
                새 씬
              </button>
              <button
                onClick={() => {
                  project.duplicateScene(project.currentTemplate, project.currentScene, newSceneName);
                  setNewSceneName('');
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                disabled={!newSceneName || project.hasScene(project.currentTemplate, newSceneName)}
              >
                현재 씬 복사
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 파일 입출력 */}
      <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">파일 입출력</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <h4 className="font-medium mb-2">내보내기</h4>
            <div className="space-y-2">
              <button
                onClick={() => project.downloadJSON()}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                JSON 다운로드
              </button>
              <button
                onClick={() => project.downloadCSV()}
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                CSV 다운로드
              </button>
              <button
                onClick={() => project.downloadProject()}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                프로젝트 다운로드
              </button>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2">가져오기</h4>
            <div className="space-y-2">
              <button
                onClick={async () => {
                  const result = await project.uploadJSON();
                  alert(result.success ? '성공적으로 가져왔습니다!' : `오류: ${result.error}`);
                }}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                JSON 업로드
              </button>
              <button
                onClick={async () => {
                  const result = await project.uploadProject();
                  alert(result.success ? '성공적으로 가져왔습니다!' : `오류: ${result.error}`);
                }}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                프로젝트 업로드
              </button>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2">프로젝트 관리</h4>
            <div className="space-y-2">
              <button
                onClick={() => {
                  if (confirm('새 프로젝트를 생성하시겠습니까? 현재 작업이 사라집니다.')) {
                    project.newProject();
                  }
                }}
                className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                새 프로젝트
              </button>
              <button
                onClick={() => project.migrateProject()}
                className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                마이그레이션
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 검증 */}
      <div className="mb-6 p-4 bg-red-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">프로젝트 검증</h3>
        <button
          onClick={() => {
            const validation = project.validateProject();
            if (validation.isValid) {
              alert('프로젝트가 유효합니다!');
            } else {
              alert(`검증 오류:\n${validation.errors.join('\n')}`);
            }
          }}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          프로젝트 검증
        </button>
      </div>

      {/* 현재 씬 정보 */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">현재 씬 정보</h3>
        
        {/* ProjectStore 정보 */}
        <div className="mb-4 p-3 bg-blue-50 rounded">
          <h4 className="font-medium text-blue-800 mb-2">ProjectStore 데이터</h4>
          <div className="text-sm">
            <div><strong>템플릿:</strong> {project.currentTemplate}</div>
            <div><strong>씬:</strong> {project.currentScene}</div>
            <div><strong>노드 수:</strong> {project.getCurrentScene() ? Object.keys(project.getCurrentScene()!).length : 0}</div>
          </div>
          {project.getCurrentScene() && (
            <div className="mt-2">
              <strong>노드 목록:</strong>
              <div className="max-h-24 overflow-y-auto bg-white p-2 rounded border mt-1">
                {Object.keys(project.getCurrentScene()!).map(nodeKey => (
                  <div key={nodeKey} className="text-xs text-gray-600">
                    {nodeKey}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>



        {/* 동기화 버튼 */}
        <div className="mt-3">
          <button
            onClick={() => {
              project.forceSync();
              project.markDirty();
            }}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
          >
            강제 동기화
          </button>
        </div>
      </div>
    </div>
  );
}; 