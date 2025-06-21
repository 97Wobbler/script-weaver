import type { EditorState, TemplateDialogues, ValidationResult } from "../../types/dialogue";
import type { IEditorStore, ICoreServices } from "../types/editorTypes";
import { exportToJSON as exportToJSONUtil, exportToCSV as exportToCSVUtil, importFromJSON as importFromJSONUtil, validateTemplateData } from "../../utils/importExport";
import { useLocalizationStore } from "../localizationStore";
import { migrateTemplateData, needsMigration } from "../../utils/migration";

/**
 * Project Domain - 프로젝트 및 데이터 관리
 * 
 * ## 📋 주요 책임
 * - **프로젝트 설정**: 현재 템플릿/씬 전환 및 관리
 * - **구조 생성**: 새 템플릿/씬 생성 및 초기화
 * - **데이터 검증**: 개별 씬 및 전체 프로젝트 유효성 검사
 * - **Import/Export**: JSON/CSV 형식의 데이터 가져오기/내보내기
 * - **데이터 관리**: 초기화, 로컬 저장소 관리, 마이그레이션
 * 
 * ## 🔄 의존성 관리
 * - **Core Services**: 히스토리 기록 (검증 제외, 독립적 동작)
 * - **LocalizationStore**: Import/Export 시 텍스트 데이터 동기화
 * - **Migration Utils**: 레거시 데이터 구조 업그레이드
 * - **독립성**: 다른 도메인과 순환 의존성 없음
 * 
 * ## 🎯 핵심 특징
 * - **구조 보장**: 템플릿/씬 존재 보장 및 자동 생성
 * - **검증 시스템**: 노드 참조 무결성 및 연결 관계 검증
 * - **양방향 동기화**: EditorStore ↔ LocalizationStore 일관성
 * - **마이그레이션 지원**: 이전 버전 데이터 자동 업그레이드
 * - **에러 핸들링**: 안전한 Import 실패 처리 및 복구
 * 
 * @description 9개 public 메서드 + 헬퍼 함수들
 */
export interface IProjectDomain {
  // ===== 기본 액션 =====
  setCurrentTemplate: (templateKey: string) => void;
  setCurrentScene: (sceneKey: string) => void;

  // ===== 템플릿/씬 관리 =====
  createTemplate: (templateKey: string) => void;
  createScene: (templateKey: string, sceneKey: string) => void;

  // ===== 검증 액션 =====
  validateCurrentScene: () => { isValid: boolean; errors: string[] };
  validateAllData: () => ValidationResult;

  // ===== Import/Export 액션 =====
  exportToJSON: () => string;
  exportToCSV: () => { dialogue: string; localization: string };
  importFromJSON: (jsonString: string) => void;

  // ===== 데이터 관리 액션 =====
  resetEditor: () => void;
  loadFromLocalStorage: () => void;
  migrateToNewArchitecture: () => void;
}

// ===== 헬퍼 함수들 =====

/**
 * 빈 씬을 생성합니다.
 */
const createEmptyScene = () => ({});

/**
 * 기본 템플릿을 생성합니다.
 */
const createEmptyTemplate = (): TemplateDialogues => ({
  main: createEmptyScene(),
});

/**
 * 템플릿이 존재하지 않으면 생성합니다.
 */
const ensureTemplateExists = (templateData: TemplateDialogues, templateKey: string): TemplateDialogues => {
  if (!templateData[templateKey]) {
    return {
      ...templateData,
      [templateKey]: createEmptyTemplate()[templateKey] || createEmptyScene(),
    };
  }
  return templateData;
};

/**
 * 씬이 존재하지 않으면 생성합니다.
 */
const ensureSceneExists = (templateData: TemplateDialogues, templateKey: string, sceneKey: string): TemplateDialogues => {
  const updatedTemplateData = ensureTemplateExists(templateData, templateKey);
  
  if (!updatedTemplateData[templateKey][sceneKey]) {
    return {
      ...updatedTemplateData,
      [templateKey]: {
        ...updatedTemplateData[templateKey],
        [sceneKey]: createEmptyScene(),
      },
    };
  }
  return updatedTemplateData;
};

/**
 * 씬에서 노드를 조회합니다.
 */
const getNode = (scene: any, nodeKey: string) => {
  return scene[nodeKey];
};

// Project Domain 구현
export const createProjectDomain = (
  get: () => IEditorStore,
  set: (partial: Partial<IEditorStore>) => void,
  coreServices: ICoreServices,
  updateLocalizationStoreRef: () => void,
  initialState: EditorState
): IProjectDomain => {
  return {
    // 기본 설정
    setCurrentTemplate: (templateKey: string) => {
      set({ currentTemplate: templateKey });
      updateLocalizationStoreRef();
    },

    setCurrentScene: (sceneKey: string) => {
      set({ currentScene: sceneKey });
      updateLocalizationStoreRef();
    },

    // 템플릿/씬 관리
    createTemplate: (templateKey: string) => {
      const state = get();
      set({
        templateData: ensureTemplateExists(state.templateData, templateKey),
      });
    },

    createScene: (templateKey: string, sceneKey: string) => {
      const state = get();
      set({
        templateData: ensureSceneExists(state.templateData, templateKey, sceneKey),
      });
    },

    // 검증
    validateCurrentScene: () => {
      const state = get();
      const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
      const errors: string[] = [];

      if (!currentScene) {
        return { isValid: false, errors: ["현재 씬이 존재하지 않습니다."] };
      }

      Object.entries(currentScene).forEach(([nodeKey, node]) => {
        const dialogue = node.dialogue;

        // 기본 필드 검증
        if (!dialogue.contentText?.trim() && !dialogue.textKeyRef?.trim()) {
          errors.push(`노드 ${nodeKey}: 내용 텍스트가 비어있습니다.`);
        }

        // 타입별 검증
        if (dialogue.type === "text") {
          // 텍스트 노드는 nextNodeKey가 있어야 함 (또는 마지막 노드)
          if (dialogue.nextNodeKey && !getNode(currentScene, dialogue.nextNodeKey)) {
            errors.push(`노드 ${nodeKey}: 존재하지 않는 노드 '${dialogue.nextNodeKey}'를 참조합니다.`);
          }
        } else if (dialogue.type === "choice") {
          // 선택지 노드는 최소 1개의 선택지가 있어야 함
          const choiceCount = Object.keys(dialogue.choices).length;
          if (choiceCount === 0) {
            errors.push(`노드 ${nodeKey}: 선택지가 없습니다.`);
          }

          // 각 선택지의 nextNodeKey 검증
          Object.entries(dialogue.choices).forEach(([choiceKey, choice]) => {
            if (!choice.nextNodeKey) {
              errors.push(`노드 ${nodeKey}, 선택지 ${choiceKey}: nextNodeKey가 비어있습니다.`);
            } else if (!getNode(currentScene, choice.nextNodeKey)) {
              errors.push(`노드 ${nodeKey}, 선택지 ${choiceKey}: 존재하지 않는 노드 '${choice.nextNodeKey}'를 참조합니다.`);
            }
          });
        }
      });

      return {
        isValid: errors.length === 0,
        errors,
      };
    },

    validateAllData: () => {
      const state = get();
      return validateTemplateData(state.templateData);
    },

    // Import/Export - LocalizationStore 연동
    exportToJSON: () => {
      const state = get();
      const localizationStore = useLocalizationStore.getState();
      const localizationData = localizationStore.exportLocalizationData();
      return exportToJSONUtil(state.templateData, localizationData);
    },

    exportToCSV: () => {
      const state = get();
      const localizationStore = useLocalizationStore.getState();
      const localizationData = localizationStore.exportLocalizationData();
      return exportToCSVUtil(state.templateData, localizationData);
    },

    importFromJSON: (jsonString: string) => {
      try {
        const importResult = importFromJSONUtil(jsonString);

        // EditorStore 업데이트 및 히스토리 초기화
        set({
          templateData: importResult.templateData,
          currentTemplate: Object.keys(importResult.templateData)[0] || "default",
          currentScene: "main",
          selectedNodeKey: undefined,
          selectedNodeKeys: new Set<string>(),
          // 히스토리 초기화 - 새로운 프로젝트 시작점 설정
          history: [
            {
              templateData: JSON.parse(JSON.stringify(importResult.templateData)),
              localizationData: useLocalizationStore.getState().exportLocalizationData(),
              timestamp: Date.now(),
              action: "JSON 파일 Import",
            },
          ],
          historyIndex: 0,
          isUndoRedoInProgress: false,
        });

        // LocalizationStore 업데이트
        const localizationStore = useLocalizationStore.getState();
        localizationStore.importLocalizationData(importResult.localizationData);

        // 마이그레이션이 필요한 경우 실행
        if (importResult.needsMigration) {
          get().migrateToNewArchitecture();
        }
      } catch (error) {
        throw error; // 에러를 호출자에게 전파
      }
    },

    // 데이터 초기화/로드/마이그레이션
    resetEditor: () => set(initialState),

    loadFromLocalStorage: () => {
      // persist 미들웨어가 자동으로 처리하므로 별도 구현 불필요
    },

    migrateToNewArchitecture: () => {
      const state = get();

      // 마이그레이션 필요 여부 체크
      if (!needsMigration(state.templateData)) {
        return;
      }

      // LocalizationStore 가져오기
      const localizationStore = useLocalizationStore.getState();
      const existingLocalizationData = localizationStore.exportLocalizationData();

      // 마이그레이션 실행
      const migrationResult = migrateTemplateData(state.templateData, existingLocalizationData);

      if (migrationResult.result.success) {
        // 성공적으로 마이그레이션된 경우 데이터 업데이트
        set({
          templateData: migrationResult.migratedData,
        });

        // LocalizationStore에 새 데이터 적용
        localizationStore.importLocalizationData(migrationResult.localizationData);
      } else {
        console.error("마이그레이션 실패:", migrationResult.result.errors);
      }
    },
  };
}; 