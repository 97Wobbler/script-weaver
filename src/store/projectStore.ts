import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { TemplateDialogues, Scene } from '../types/dialogue';
import { exportToJSON as exportToJSONUtil, exportToCSV as exportToCSVUtil, importFromJSON as importFromJSONUtil, validateTemplateData } from '../utils/importExport';
import { migrateTemplateData, needsMigration } from '../utils/migration';

// 프로젝트 메타데이터 타입
export interface ProjectMetadata {
  name: string;
  description: string;
  version: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

// 프로젝트 상태 인터페이스
export interface ProjectState {
  // 프로젝트 메타데이터
  metadata: ProjectMetadata;
  
  // 템플릿/씬 데이터
  templateData: TemplateDialogues;
  currentTemplate: string;
  currentScene: string;
  
  // 프로젝트 상태
  isDirty: boolean; // 저장되지 않은 변경사항 여부
  lastSaved: string | null; // 마지막 저장 시간
  
  // 템플릿/씬 목록 (캐시된 정보)
  templateList: string[];
  sceneList: Record<string, string[]>; // templateKey -> sceneKeys[]
}

// 프로젝트 스토어 인터페이스
export interface ProjectStore extends ProjectState {
  // 프로젝트 메타데이터 관리
  updateMetadata: (metadata: Partial<ProjectMetadata>) => void;
  setProjectName: (name: string) => void;
  setProjectDescription: (description: string) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  
  // 템플릿/씬 네비게이션
  setCurrentTemplate: (templateKey: string) => void;
  setCurrentScene: (sceneKey: string) => void;
  
  // 템플릿 관리
  createTemplate: (templateKey: string, copyFrom?: string) => void;
  deleteTemplate: (templateKey: string) => void;
  renameTemplate: (oldKey: string, newKey: string) => void;
  duplicateTemplate: (templateKey: string, newKey: string) => void;
  
  // 씬 관리
  createScene: (templateKey: string, sceneKey: string, copyFrom?: string) => void;
  deleteScene: (templateKey: string, sceneKey: string) => void;
  renameScene: (templateKey: string, oldKey: string, newKey: string) => void;
  duplicateScene: (templateKey: string, sceneKey: string, newKey: string) => void;
  
  // 템플릿 데이터 직접 업데이트 (editorStore에서 호출)
  updateTemplateData: (templateData: TemplateDialogues) => void;
  updateScene: (templateKey: string, sceneKey: string, scene: Scene) => void;
  
  // 파일 입출력
  exportToJSON: () => string;
  exportToCSV: () => { dialogue: string; localization: string };
  importFromJSON: (jsonString: string) => { success: boolean; error?: string };
  
  // 프로젝트 관리
  newProject: (metadata?: Partial<ProjectMetadata>) => void;
  loadProject: (projectData: any) => { success: boolean; error?: string };
  saveProject: () => string; // JSON 형태로 전체 프로젝트 저장
  
  // 상태 관리
  markDirty: () => void;
  markClean: () => void;
  updateLastSaved: () => void;
  
  // 유틸리티
  getTemplateList: () => string[];
  getSceneList: (templateKey: string) => string[];
  hasTemplate: (templateKey: string) => boolean;
  hasScene: (templateKey: string, sceneKey: string) => boolean;
  getCurrentScene: () => Scene | null;
  
  // 검증
  validateProject: () => { isValid: boolean; errors: string[] };
  
  // 마이그레이션
  migrateProject: () => void;
}

// 헬퍼 함수들
const createEmptyScene = (): Scene => ({});

const createEmptyTemplate = (): TemplateDialogues => ({
  default: {
    main: createEmptyScene(),
  },
});

const createDefaultMetadata = (): ProjectMetadata => ({
  name: 'Untitled Project',
  description: '',
  version: '1.0.0',
  author: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  tags: [],
});

const ensureTemplateExists = (templateData: TemplateDialogues, templateKey: string): TemplateDialogues => {
  if (!templateData[templateKey]) {
    return {
      ...templateData,
      [templateKey]: { main: createEmptyScene() },
    };
  }
  return templateData;
};

const ensureSceneExists = (templateData: TemplateDialogues, templateKey: string, sceneKey: string): TemplateDialogues => {
  const updatedData = ensureTemplateExists(templateData, templateKey);
  if (!updatedData[templateKey][sceneKey]) {
    return {
      ...updatedData,
      [templateKey]: {
        ...updatedData[templateKey],
        [sceneKey]: createEmptyScene(),
      },
    };
  }
  return updatedData;
};

const updateTemplateAndSceneLists = (templateData: TemplateDialogues) => {
  const templateList = Object.keys(templateData);
  const sceneList: Record<string, string[]> = {};
  
  templateList.forEach(templateKey => {
    sceneList[templateKey] = Object.keys(templateData[templateKey]);
  });
  
  return { templateList, sceneList };
};

// 초기 상태
const initialState: ProjectState = {
  metadata: createDefaultMetadata(),
  templateData: createEmptyTemplate(),
  currentTemplate: 'default',
  currentScene: 'main',
  isDirty: false,
  lastSaved: null,
  templateList: ['default'],
  sceneList: { default: ['main'] },
};

// 프로젝트 스토어 생성
export const useProjectStore = create<ProjectStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // 프로젝트 메타데이터 관리
    updateMetadata: (metadata) => {
      set((state) => ({
        metadata: { ...state.metadata, ...metadata, updatedAt: new Date().toISOString() },
        isDirty: true,
      }));
    },

    setProjectName: (name) => {
      get().updateMetadata({ name });
    },

    setProjectDescription: (description) => {
      get().updateMetadata({ description });
    },

    addTag: (tag) => {
      const { metadata } = get();
      if (!metadata.tags.includes(tag)) {
        get().updateMetadata({ tags: [...metadata.tags, tag] });
      }
    },

    removeTag: (tag) => {
      const { metadata } = get();
      get().updateMetadata({ tags: metadata.tags.filter(t => t !== tag) });
    },

    // 템플릿/씬 네비게이션
    setCurrentTemplate: (templateKey) => {
      const state = get();
      if (state.hasTemplate(templateKey)) {
        const sceneList = state.getSceneList(templateKey);
        const currentScene = sceneList.includes(state.currentScene) ? state.currentScene : sceneList[0] || 'main';
        
        set({ currentTemplate: templateKey, currentScene });
      }
    },

    setCurrentScene: (sceneKey) => {
      const state = get();
      if (state.hasScene(state.currentTemplate, sceneKey)) {
        set({ currentScene: sceneKey });
      }
    },

    // 템플릿 관리
    createTemplate: (templateKey, copyFrom) => {
      const state = get();
      if (state.hasTemplate(templateKey)) return;

      let newTemplateData: TemplateDialogues;
      
      if (copyFrom && state.hasTemplate(copyFrom)) {
        // 기존 템플릿 복사
        newTemplateData = {
          ...state.templateData,
          [templateKey]: JSON.parse(JSON.stringify(state.templateData[copyFrom])),
        };
      } else {
        // 새 템플릿 생성
        newTemplateData = ensureTemplateExists(state.templateData, templateKey);
      }

      const { templateList, sceneList } = updateTemplateAndSceneLists(newTemplateData);

      set({
        templateData: newTemplateData,
        templateList,
        sceneList,
        isDirty: true,
      });
    },

    deleteTemplate: (templateKey) => {
      const state = get();
      if (!state.hasTemplate(templateKey) || templateKey === 'default') return;

      const newTemplateData = { ...state.templateData };
      delete newTemplateData[templateKey];

      const { templateList, sceneList } = updateTemplateAndSceneLists(newTemplateData);

      // 현재 템플릿이 삭제되는 경우 default로 변경
      const currentTemplate = state.currentTemplate === templateKey ? 'default' : state.currentTemplate;
      const currentScene = state.currentTemplate === templateKey ? 'main' : state.currentScene;

      set({
        templateData: newTemplateData,
        templateList,
        sceneList,
        currentTemplate,
        currentScene,
        isDirty: true,
      });
    },

    renameTemplate: (oldKey, newKey) => {
      const state = get();
      if (!state.hasTemplate(oldKey) || state.hasTemplate(newKey) || oldKey === 'default') return;

      const newTemplateData = { ...state.templateData };
      newTemplateData[newKey] = newTemplateData[oldKey];
      delete newTemplateData[oldKey];

      const { templateList, sceneList } = updateTemplateAndSceneLists(newTemplateData);

      // 현재 템플릿이 변경되는 경우 업데이트
      const currentTemplate = state.currentTemplate === oldKey ? newKey : state.currentTemplate;

      set({
        templateData: newTemplateData,
        templateList,
        sceneList,
        currentTemplate,
        isDirty: true,
      });
    },

    duplicateTemplate: (templateKey, newKey) => {
      get().createTemplate(newKey, templateKey);
    },

    // 씬 관리
    createScene: (templateKey, sceneKey, copyFrom) => {
      const state = get();
      if (!state.hasTemplate(templateKey) || state.hasScene(templateKey, sceneKey)) return;

      let newTemplateData = ensureTemplateExists(state.templateData, templateKey);
      
      if (copyFrom && state.hasScene(templateKey, copyFrom)) {
        // 기존 씬 복사
        newTemplateData = {
          ...newTemplateData,
          [templateKey]: {
            ...newTemplateData[templateKey],
            [sceneKey]: JSON.parse(JSON.stringify(newTemplateData[templateKey][copyFrom])),
          },
        };
      } else {
        // 새 씬 생성
        newTemplateData = ensureSceneExists(newTemplateData, templateKey, sceneKey);
      }

      const { templateList, sceneList } = updateTemplateAndSceneLists(newTemplateData);

      set({
        templateData: newTemplateData,
        templateList,
        sceneList,
        isDirty: true,
      });
    },

    deleteScene: (templateKey, sceneKey) => {
      const state = get();
      if (!state.hasScene(templateKey, sceneKey) || sceneKey === 'main') return;

      const newTemplateData = {
        ...state.templateData,
        [templateKey]: {
          ...state.templateData[templateKey],
        },
      };
      delete newTemplateData[templateKey][sceneKey];

      const { templateList, sceneList } = updateTemplateAndSceneLists(newTemplateData);

      // 현재 씬이 삭제되는 경우 main으로 변경
      const currentScene = state.currentTemplate === templateKey && state.currentScene === sceneKey 
        ? 'main' 
        : state.currentScene;

      set({
        templateData: newTemplateData,
        templateList,
        sceneList,
        currentScene,
        isDirty: true,
      });
    },

    renameScene: (templateKey, oldKey, newKey) => {
      const state = get();
      if (!state.hasScene(templateKey, oldKey) || state.hasScene(templateKey, newKey) || oldKey === 'main') return;

      const newTemplateData = {
        ...state.templateData,
        [templateKey]: {
          ...state.templateData[templateKey],
          [newKey]: state.templateData[templateKey][oldKey],
        },
      };
      delete newTemplateData[templateKey][oldKey];

      const { templateList, sceneList } = updateTemplateAndSceneLists(newTemplateData);

      // 현재 씬이 변경되는 경우 업데이트
      const currentScene = state.currentTemplate === templateKey && state.currentScene === oldKey 
        ? newKey 
        : state.currentScene;

      set({
        templateData: newTemplateData,
        templateList,
        sceneList,
        currentScene,
        isDirty: true,
      });
    },

    duplicateScene: (templateKey, sceneKey, newKey) => {
      get().createScene(templateKey, newKey, sceneKey);
    },

    // 템플릿 데이터 직접 업데이트
    updateTemplateData: (templateData) => {
      const { templateList, sceneList } = updateTemplateAndSceneLists(templateData);
      
      set({
        templateData,
        templateList,
        sceneList,
        isDirty: true,
      });
    },

    updateScene: (templateKey, sceneKey, scene) => {
      const state = get();
      const newTemplateData = ensureSceneExists(state.templateData, templateKey, sceneKey);
      
      newTemplateData[templateKey][sceneKey] = scene;
      
      get().updateTemplateData(newTemplateData);
    },

    // 파일 입출력
    exportToJSON: () => {
      const state = get();
      // localizationData는 별도 스토어에서 가져와야 함 (임시로 빈 객체 사용)
      const localizationData = {};
      return exportToJSONUtil(state.templateData, localizationData);
    },

    exportToCSV: () => {
      const state = get();
      // localizationData는 별도 스토어에서 가져와야 함 (임시로 빈 객체 사용)
      const localizationData = {};
      return exportToCSVUtil(state.templateData, localizationData);
    },

    importFromJSON: (jsonString) => {
      try {
        const importResult = importFromJSONUtil(jsonString);
        
        const { templateData, localizationData, needsMigration: needsMigrationFlag } = importResult;
        
        // 마이그레이션 필요 여부 확인
        let finalTemplateData = templateData;
        if (needsMigrationFlag || needsMigration(templateData)) {
          const migrationResult = migrateTemplateData(templateData);
          finalTemplateData = migrationResult.migratedData;
        }

        // 유효성 검사
        const validation = validateTemplateData(finalTemplateData);
        if (!validation.isValid) {
          return { success: false, error: `Invalid template data: ${validation.errors.join(', ')}` };
        }

        // 데이터 업데이트
        get().updateTemplateData(finalTemplateData);
        
        // localizationData는 별도 스토어에서 처리해야 함
        // TODO: localizationStore.updateData(localizationData);

        get().markClean();
        
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },

    // 프로젝트 관리
    newProject: (metadata) => {
      const newMetadata = { ...createDefaultMetadata(), ...metadata };
      const templateData = createEmptyTemplate();
      const { templateList, sceneList } = updateTemplateAndSceneLists(templateData);

      set({
        metadata: newMetadata,
        templateData,
        currentTemplate: 'default',
        currentScene: 'main',
        templateList,
        sceneList,
        isDirty: false,
        lastSaved: null,
      });
    },

    loadProject: (projectData) => {
      try {
        const { metadata, templateData, currentTemplate, currentScene } = projectData;
        
        // 유효성 검사
        if (!templateData || typeof templateData !== 'object') {
          return { success: false, error: 'Invalid project data: missing template data' };
        }

        // 마이그레이션 필요 여부 확인
        let finalTemplateData = templateData;
        if (needsMigration(templateData)) {
          finalTemplateData = migrateTemplateData(templateData);
        }

        const validation = validateTemplateData(finalTemplateData);
        if (!validation.isValid) {
          return { success: false, error: `Invalid template data: ${validation.errors.join(', ')}` };
        }

        const { templateList, sceneList } = updateTemplateAndSceneLists(finalTemplateData);
        
        // 현재 템플릿/씬 유효성 확인
        const validCurrentTemplate = templateList.includes(currentTemplate) ? currentTemplate : templateList[0];
        const validCurrentScene = sceneList[validCurrentTemplate]?.includes(currentScene) 
          ? currentScene 
          : sceneList[validCurrentTemplate]?.[0] || 'main';

        set({
          metadata: { ...createDefaultMetadata(), ...metadata },
          templateData: finalTemplateData,
          currentTemplate: validCurrentTemplate,
          currentScene: validCurrentScene,
          templateList,
          sceneList,
          isDirty: false,
          lastSaved: new Date().toISOString(),
        });

        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },

    saveProject: () => {
      const state = get();
      const projectData = {
        metadata: state.metadata,
        templateData: state.templateData,
        currentTemplate: state.currentTemplate,
        currentScene: state.currentScene,
        version: '2.0.0', // 프로젝트 파일 버전
        savedAt: new Date().toISOString(),
      };

      get().updateLastSaved();
      get().markClean();

      return JSON.stringify(projectData, null, 2);
    },

    // 상태 관리
    markDirty: () => {
      set({ isDirty: true });
    },

    markClean: () => {
      set({ isDirty: false });
    },

    updateLastSaved: () => {
      set({ lastSaved: new Date().toISOString() });
    },

    // 유틸리티
    getTemplateList: () => {
      return get().templateList;
    },

    getSceneList: (templateKey) => {
      return get().sceneList[templateKey] || [];
    },

    hasTemplate: (templateKey) => {
      return get().templateList.includes(templateKey);
    },

    hasScene: (templateKey, sceneKey) => {
      return get().sceneList[templateKey]?.includes(sceneKey) || false;
    },

    getCurrentScene: () => {
      const { templateData, currentTemplate, currentScene } = get();
      return templateData[currentTemplate]?.[currentScene] || null;
    },

    // 검증
    validateProject: () => {
      const { templateData } = get();
      const validation = validateTemplateData(templateData);
      return {
        isValid: validation.isValid,
        errors: validation.errors.map(e => `${e.nodeKey} - ${e.field}: ${e.message}`)
      };
    },

    // 마이그레이션
    migrateProject: () => {
      const state = get();
      if (needsMigration(state.templateData)) {
        const migrationResult = migrateTemplateData(state.templateData);
        get().updateTemplateData(migrationResult.migratedData);
      }
    },
  }))
);

// localStorage 연동은 persist 미들웨어에서 자동으로 처리됨
// 추가 subscribe나 초기 로드는 불필요 (무한 루프 방지) 