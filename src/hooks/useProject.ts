import { useCallback } from 'react';
import { useProjectStore } from '../store/projectStore';
import type { TemplateDialogues } from '../types/dialogue';

// 프로젝트 관리 훅 (단순화 버전)
export const useProject = () => {
  const projectStore = useProjectStore();

  // 프로젝트 메타데이터 관리
  const updateMetadata = useCallback((metadata: Parameters<typeof projectStore.updateMetadata>[0]) => {
    projectStore.updateMetadata(metadata);
  }, [projectStore]);

  const setProjectName = useCallback((name: string) => {
    projectStore.setProjectName(name);
  }, [projectStore]);

  const setProjectDescription = useCallback((description: string) => {
    projectStore.setProjectDescription(description);
  }, [projectStore]);

  const addTag = useCallback((tag: string) => {
    projectStore.addTag(tag);
  }, [projectStore]);

  const removeTag = useCallback((tag: string) => {
    projectStore.removeTag(tag);
  }, [projectStore]);

  // 템플릿/씬 네비게이션
  const setCurrentTemplate = useCallback((templateKey: string) => {
    projectStore.setCurrentTemplate(templateKey);
  }, [projectStore]);

  const setCurrentScene = useCallback((sceneKey: string) => {
    projectStore.setCurrentScene(sceneKey);
  }, [projectStore]);

  // 템플릿 관리
  const createTemplate = useCallback((templateKey: string, copyFrom?: string) => {
    projectStore.createTemplate(templateKey, copyFrom);
  }, [projectStore]);

  const deleteTemplate = useCallback((templateKey: string) => {
    projectStore.deleteTemplate(templateKey);
  }, [projectStore]);

  const renameTemplate = useCallback((oldKey: string, newKey: string) => {
    projectStore.renameTemplate(oldKey, newKey);
  }, [projectStore]);

  const duplicateTemplate = useCallback((templateKey: string, newKey: string) => {
    projectStore.duplicateTemplate(templateKey, newKey);
  }, [projectStore]);

  // 씬 관리
  const createScene = useCallback((templateKey: string, sceneKey: string, copyFrom?: string) => {
    projectStore.createScene(templateKey, sceneKey, copyFrom);
  }, [projectStore]);

  const deleteScene = useCallback((templateKey: string, sceneKey: string) => {
    projectStore.deleteScene(templateKey, sceneKey);
  }, [projectStore]);

  const renameScene = useCallback((templateKey: string, oldKey: string, newKey: string) => {
    projectStore.renameScene(templateKey, oldKey, newKey);
  }, [projectStore]);

  const duplicateScene = useCallback((templateKey: string, sceneKey: string, newKey: string) => {
    projectStore.duplicateScene(templateKey, sceneKey, newKey);
  }, [projectStore]);

  // 파일 입출력
  const exportToJSON = useCallback(() => {
    return projectStore.exportToJSON();
  }, [projectStore]);

  const exportToCSV = useCallback(() => {
    return projectStore.exportToCSV();
  }, [projectStore]);

  const importFromJSON = useCallback((jsonString: string) => {
    return projectStore.importFromJSON(jsonString);
  }, [projectStore]);

  // 프로젝트 관리
  const newProject = useCallback((metadata?: Parameters<typeof projectStore.newProject>[0]) => {
    projectStore.newProject(metadata);
  }, [projectStore]);

  const loadProject = useCallback((projectData: any) => {
    return projectStore.loadProject(projectData);
  }, [projectStore]);

  const saveProject = useCallback(() => {
    return projectStore.saveProject();
  }, [projectStore]);

  // 파일 다운로드 헬퍼
  const downloadJSON = useCallback((filename?: string) => {
    const jsonData = exportToJSON();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${projectStore.metadata.name || 'project'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportToJSON, projectStore.metadata.name]);

  const downloadCSV = useCallback((filename?: string) => {
    const csvData = exportToCSV();
    const dialogueBlob = new Blob([csvData.dialogue], { type: 'text/csv' });
    const localizationBlob = new Blob([csvData.localization], { type: 'text/csv' });
    
    const baseName = filename || projectStore.metadata.name || 'project';
    
    // 대화 CSV 다운로드
    const dialogueUrl = URL.createObjectURL(dialogueBlob);
    const dialogueA = document.createElement('a');
    dialogueA.href = dialogueUrl;
    dialogueA.download = `${baseName}_dialogue.csv`;
    document.body.appendChild(dialogueA);
    dialogueA.click();
    document.body.removeChild(dialogueA);
    URL.revokeObjectURL(dialogueUrl);
    
    // 로컬라이제이션 CSV 다운로드
    const localizationUrl = URL.createObjectURL(localizationBlob);
    const localizationA = document.createElement('a');
    localizationA.href = localizationUrl;
    localizationA.download = `${baseName}_localization.csv`;
    document.body.appendChild(localizationA);
    localizationA.click();
    document.body.removeChild(localizationA);
    URL.revokeObjectURL(localizationUrl);
  }, [exportToCSV, projectStore.metadata.name]);

  const downloadProject = useCallback((filename?: string) => {
    const projectData = projectStore.saveProject();
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${projectStore.metadata.name || 'project'}.swproj`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [projectStore]);

  // 파일 업로드 헬퍼
  const uploadJSON = useCallback((): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve({ success: false, error: '파일이 선택되지 않았습니다.' });
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const jsonString = e.target?.result as string;
            const result = importFromJSON(jsonString);
            resolve(result);
          } catch (error) {
            resolve({ success: false, error: '파일 읽기 중 오류가 발생했습니다.' });
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }, [importFromJSON]);

  const uploadProject = useCallback((): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.swproj,.json';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve({ success: false, error: '파일이 선택되지 않았습니다.' });
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const jsonString = e.target?.result as string;
            const projectData = JSON.parse(jsonString);
            const result = loadProject(projectData);
            resolve(result);
          } catch (error) {
            resolve({ success: false, error: '파일 읽기 중 오류가 발생했습니다.' });
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }, [loadProject]);

  // 유틸리티 함수들
  const hasTemplate = useCallback((templateKey: string) => {
    return projectStore.hasTemplate(templateKey);
  }, [projectStore]);

  const hasScene = useCallback((templateKey: string, sceneKey: string) => {
    return projectStore.hasScene(templateKey, sceneKey);
  }, [projectStore]);

  const getCurrentScene = useCallback(() => {
    return projectStore.getCurrentScene();
  }, [projectStore]);

  const validateProject = useCallback(() => {
    return projectStore.validateProject();
  }, [projectStore]);

  const migrateProject = useCallback(() => {
    return projectStore.migrateProject();
  }, [projectStore]);

  const forceSync = useCallback(() => {
    // 동기화 로직 (현재는 빈 함수)
  }, []);

  const markDirty = useCallback(() => {
    projectStore.markDirty();
  }, [projectStore]);

  return {
    // 상태
    ...projectStore,
    
    // 메타데이터
    updateMetadata,
    setProjectName,
    setProjectDescription,
    addTag,
    removeTag,
    
    // 네비게이션
    setCurrentTemplate,
    setCurrentScene,
    
    // 템플릿 관리
    createTemplate,
    deleteTemplate,
    renameTemplate,
    duplicateTemplate,
    
    // 씬 관리
    createScene,
    deleteScene,
    renameScene,
    duplicateScene,
    
    // 파일 입출력
    exportToJSON,
    exportToCSV,
    importFromJSON,
    downloadJSON,
    downloadCSV,
    downloadProject,
    uploadJSON,
    uploadProject,
    
    // 프로젝트 관리
    newProject,
    loadProject,
    saveProject,
    
    // 유틸리티
    hasTemplate,
    hasScene,
    getCurrentScene,
    validateProject,
    migrateProject,
    forceSync,
    markDirty,
  };
}; 