import { useCallback, useEffect, useRef } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useEditorStore } from '../store/editorStore';
import type { TemplateDialogues, Scene } from '../types/dialogue';

// 프로젝트 관리 훅
export const useProject = () => {
  const projectStore = useProjectStore();
  const editorStore = useEditorStore();
  
  // 동기화 중인지 추적하는 플래그
  const syncingRef = useRef(false);

  // editorStore와 projectStore 동기화 (templateData만)
  useEffect(() => {
    const unsubscribe = useEditorStore.subscribe(
      (state) => {
        if (syncingRef.current) return; // 동기화 중이면 무시
        
        // 무한 루프 방지: projectStore의 templateData와 다를 때만 업데이트
        if (JSON.stringify(state.templateData) !== JSON.stringify(projectStore.templateData)) {
          syncingRef.current = true;
          projectStore.updateTemplateData(state.templateData);
          syncingRef.current = false;
        }
      }
    );

    return unsubscribe;
  }, [projectStore]);

  // currentTemplate, currentScene 동기화 (단방향: projectStore -> editorStore)
  useEffect(() => {
    const unsubscribeTemplate = useProjectStore.subscribe(
      (state) => {
        if (syncingRef.current) return; // 동기화 중이면 무시
        
        if (state.currentTemplate !== editorStore.currentTemplate) {
          syncingRef.current = true;
          editorStore.setCurrentTemplate(state.currentTemplate);
          syncingRef.current = false;
        }
      }
    );

    const unsubscribeScene = useProjectStore.subscribe(
      (state) => {
        if (syncingRef.current) return; // 동기화 중이면 무시
        
        if (state.currentScene !== editorStore.currentScene) {
          syncingRef.current = true;
          editorStore.setCurrentScene(state.currentScene);
          syncingRef.current = false;
        }
      }
    );

    return () => {
      unsubscribeTemplate();
      unsubscribeScene();
    };
  }, [editorStore]);

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
    // editorStore도 초기화
    // editorStore.resetEditor(); // 임시 비활성화
  }, [projectStore, editorStore]);

  const loadProject = useCallback((projectData: any) => {
    const result = projectStore.loadProject(projectData);
    if (result.success) {
      // editorStore도 업데이트
      editorStore.setCurrentTemplate(projectStore.currentTemplate);
      editorStore.setCurrentScene(projectStore.currentScene);
    }
    return result;
  }, [projectStore, editorStore]);

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
    const projectData = saveProject();
    const blob = new Blob([projectData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${projectStore.metadata.name || 'project'}_project.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [saveProject, projectStore.metadata.name]);

  // 파일 업로드 헬퍼
  const uploadJSON = useCallback(() => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target?.result as string;
            const result = importFromJSON(content);
            resolve(result);
          };
          reader.onerror = () => {
            resolve({ success: false, error: 'Failed to read file' });
          };
          reader.readAsText(file);
        } else {
          resolve({ success: false, error: 'No file selected' });
        }
      };
      input.click();
    });
  }, [importFromJSON]);

  const uploadProject = useCallback(() => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target?.result as string;
            try {
              const projectData = JSON.parse(content);
              const result = loadProject(projectData);
              resolve(result);
            } catch (error) {
              resolve({ success: false, error: 'Invalid project file format' });
            }
          };
          reader.onerror = () => {
            resolve({ success: false, error: 'Failed to read file' });
          };
          reader.readAsText(file);
        } else {
          resolve({ success: false, error: 'No file selected' });
        }
      };
      input.click();
    });
  }, [loadProject]);

  // 상태 관리
  const markDirty = useCallback(() => {
    projectStore.markDirty();
  }, [projectStore]);

  const markClean = useCallback(() => {
    projectStore.markClean();
  }, [projectStore]);

  // 유틸리티
  const getTemplateList = useCallback(() => {
    return projectStore.getTemplateList();
  }, [projectStore]);

  const getSceneList = useCallback((templateKey: string) => {
    return projectStore.getSceneList(templateKey);
  }, [projectStore]);

  const hasTemplate = useCallback((templateKey: string) => {
    return projectStore.hasTemplate(templateKey);
  }, [projectStore]);

  const hasScene = useCallback((templateKey: string, sceneKey: string) => {
    return projectStore.hasScene(templateKey, sceneKey);
  }, [projectStore]);

  const getCurrentScene = useCallback(() => {
    return projectStore.getCurrentScene();
  }, [projectStore]);

  // 검증
  const validateProject = useCallback(() => {
    return projectStore.validateProject();
  }, [projectStore]);

  // 마이그레이션
  const migrateProject = useCallback(() => {
    projectStore.migrateProject();
  }, [projectStore]);

  // 강제 동기화
  const forceSync = useCallback(() => {
    syncingRef.current = true;
    projectStore.updateTemplateData(editorStore.templateData);
    syncingRef.current = false;
  }, [projectStore, editorStore]);

  return {
    // 상태
    metadata: projectStore.metadata,
    templateData: projectStore.templateData,
    currentTemplate: projectStore.currentTemplate,
    currentScene: projectStore.currentScene,
    isDirty: projectStore.isDirty,
    lastSaved: projectStore.lastSaved,
    templateList: projectStore.templateList,
    sceneList: projectStore.sceneList,

    // 프로젝트 메타데이터 관리
    updateMetadata,
    setProjectName,
    setProjectDescription,
    addTag,
    removeTag,

    // 템플릿/씬 네비게이션
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

    // 프로젝트 관리
    newProject,
    loadProject,
    saveProject,

    // 파일 다운로드/업로드 헬퍼
    downloadJSON,
    downloadCSV,
    downloadProject,
    uploadJSON,
    uploadProject,

    // 상태 관리
    markDirty,
    markClean,

    // 유틸리티
    getTemplateList,
    getSceneList,
    hasTemplate,
    hasScene,
    getCurrentScene,

    // 검증
    validateProject,

    // 마이그레이션
    migrateProject,

    // 강제 동기화
    forceSync,
  };
}; 