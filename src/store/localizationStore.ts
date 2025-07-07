import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TemplateDialogues, EditorNodeWrapper } from "../types/dialogue";

// 로컬라이제이션 데이터 타입
export interface LocalizationData {
  [key: string]: string; // key -> 실제 텍스트 매핑
}

// 키 생성 결과 타입
export interface KeyGenerationResult {
  key: string;
  isExisting: boolean; // 기존 키 재사용 여부
  conflictingNodes?: string[]; // 같은 키를 사용하는 노드들
}

// 키 수정 옵션
export interface KeyUpdateOption {
  updateAll: boolean; // true: 모든 텍스트 함께 변경, false: 새 키로 분리
}

interface LocalizationStore {
  // 데이터
  localizationData: LocalizationData;

  // ID 추적 상태 (숫자 기반 키 생성용)
  lastSpeakerId: number;
  lastLineId: number;
  lastChoiceId: number;

  // EditorStore 참조 (실제 저장)
  editorStoreRef: any;

  // 기본 액션들
  setText: (key: string, text: string) => void;
  getText: (key: string) => string | undefined;
  deleteKey: (key: string) => void;

  // 키 자동 생성 시스템 (숫자 ID 기반)
  generateSpeakerKey: (speakerName: string) => KeyGenerationResult;
  generateTextKey: (text: string) => KeyGenerationResult;
  generateChoiceKey: (text: string) => KeyGenerationResult;

  // 중복 텍스트 감지
  findExistingKey: (text: string) => string | null;
  findNodesUsingKey: (key: string) => string[]; // 해당 키를 사용하는 노드들 반환

  // 키 수정 및 분리
  updateKeyText: (oldKey: string, newText: string, option: KeyUpdateOption) => string; // 새 키 반환

  // 일괄 수정
  bulkUpdateText: (key: string, newText: string) => void;

  // 유틸리티
  getAllKeys: () => string[];
  getKeyUsageCount: (key: string) => number;
  getNextId: (keyType: "speaker" | "text" | "choice") => number;

  // 데이터 초기화
  resetLocalization: () => void;
  importLocalizationData: (data: LocalizationData) => void;
  exportLocalizationData: () => LocalizationData;

  // EditorStore 참조 설정 (임시 해결책)
  _setEditorStore: (editorStore: any) => void;
}

// 숫자 ID 기반 키 생성 함수들
const createSpeakerKey = (id: number): string => {
  return `npc_${id}`;
};

const createTextKey = (id: number): string => {
  return `line_${id}`;
};

const createChoiceKey = (id: number): string => {
  return `choice_${id}`;
};

export const useLocalizationStore = create<LocalizationStore>()(
  persist(
    (set, get) => ({
      localizationData: {},

      lastSpeakerId: 0,
      lastLineId: 0,
      lastChoiceId: 0,

      editorStoreRef: null,

      setText: (key, text) => {
        set((state) => ({
          localizationData: {
            ...state.localizationData,
            [key]: text,
          },
        }));
      },

      getText: (key) => {
        const state = get();
        return state.localizationData[key];
      },

      deleteKey: (key) =>
        set((state) => {
          const newData = { ...state.localizationData };
          delete newData[key];
          return { localizationData: newData };
        }),

      generateSpeakerKey: (speakerName) => {
        const state = get();
        const existingKey = get().findExistingKey(speakerName);

        if (existingKey) {
          return {
            key: existingKey,
            isExisting: true,
            conflictingNodes: get().findNodesUsingKey(existingKey),
          };
        }

        const nextId = state.lastSpeakerId + 1;
        const newKey = createSpeakerKey(nextId);

        // ID 증가
        set((prevState) => ({
          ...prevState,
          lastSpeakerId: nextId,
        }));

        return {
          key: newKey,
          isExisting: false,
        };
      },

      generateTextKey: (text) => {
        const state = get();
        const existingKey = get().findExistingKey(text);

        if (existingKey) {
          return {
            key: existingKey,
            isExisting: true,
            conflictingNodes: get().findNodesUsingKey(existingKey),
          };
        }

        const nextId = state.lastLineId + 1;
        const newKey = createTextKey(nextId);

        // ID 증가
        set((prevState) => ({
          ...prevState,
          lastLineId: nextId,
        }));

        return {
          key: newKey,
          isExisting: false,
        };
      },

      generateChoiceKey: (text) => {
        const state = get();
        const existingKey = get().findExistingKey(text);

        if (existingKey) {
          return {
            key: existingKey,
            isExisting: true,
            conflictingNodes: get().findNodesUsingKey(existingKey),
          };
        }

        const nextId = state.lastChoiceId + 1;
        const newKey = createChoiceKey(nextId);

        // ID 증가
        set((prevState) => ({
          ...prevState,
          lastChoiceId: nextId,
        }));

        return {
          key: newKey,
          isExisting: false,
        };
      },

      findExistingKey: (text) => {
        const state = get();
        for (const [key, value] of Object.entries(state.localizationData)) {
          if (value === text) {
            return key;
          }
        }
        return null;
      },

      findNodesUsingKey: (key) => {
        // EditorStore와 연동하여 해당 키를 사용하는 노드들 찾기
        // 이 기능은 EditorStore에서 호출할 때 templateData를 받아서 처리
        const editorStore = get().editorStoreRef as { templateData: TemplateDialogues } | undefined;
        if (!editorStore) return [];

        const nodes: string[] = [];
        const templateData = editorStore.templateData;

        Object.entries(templateData).forEach(([templateKey, template]) => {
          Object.entries(template).forEach(([sceneKey, scene]) => {
            Object.entries(scene).forEach(([nodeKey, nodeWrapper]: [string, EditorNodeWrapper]) => {
              const dialogue = nodeWrapper.dialogue;

              // 화자 키 검증
              if (dialogue.speakerKeyRef === key) {
                nodes.push(`${templateKey}/${sceneKey}/${nodeKey} (화자)`);
              }

              // 텍스트 키 검증
              if (dialogue.textKeyRef === key) {
                nodes.push(`${templateKey}/${sceneKey}/${nodeKey} (내용)`);
              }

              // 선택지 키 검증
              if (dialogue.type === "choice" && dialogue.choices) {
                Object.entries(dialogue.choices).forEach(([choiceKey, choice]) => {
                  if (choice.textKeyRef === key) {
                    nodes.push(`${templateKey}/${sceneKey}/${nodeKey} (선택지: ${choiceKey})`);
                  }
                });
              }
            });
          });
        });

        return nodes;
      },

      updateKeyText: (oldKey, newText, option) => {
        const state = get();

        if (option.updateAll) {
          // 모든 텍스트 함께 변경 - 기존 키의 텍스트만 업데이트
          get().setText(oldKey, newText);
          return oldKey;
        } else {
          // 새 키로 분리 - 기존 키는 그대로 두고 새 키 생성
          const existingKey = get().findExistingKey(newText);
          if (existingKey) {
            return existingKey;
          } else {
            // 키 타입에 따라 적절한 새 키 생성
            let newKey: string;
            if (oldKey.startsWith("npc_")) {
              newKey = get().generateSpeakerKey(newText).key;
            } else if (oldKey.startsWith("line_")) {
              newKey = get().generateTextKey(newText).key;
            } else if (oldKey.startsWith("choice_")) {
              newKey = get().generateChoiceKey(newText).key;
            } else {
              // 기본값으로 line 타입 사용
              newKey = get().generateTextKey(newText).key;
            }

            get().setText(newKey, newText);
            return newKey;
          }
        }
      },

      bulkUpdateText: (key, newText) => {
        get().setText(key, newText);
        // TODO: EditorStore와 연동하여 해당 키를 사용하는 모든 노드 업데이트
      },

      getAllKeys: () => {
        const state = get();
        return Object.keys(state.localizationData);
      },

      getKeyUsageCount: (key) => {
        return get().findNodesUsingKey(key).length;
      },

      getNextId: (keyType: "speaker" | "text" | "choice") => {
        const state = get();
        if (keyType === "speaker") {
          return state.lastSpeakerId + 1;
        } else if (keyType === "text") {
          return state.lastLineId + 1;
        } else if (keyType === "choice") {
          return state.lastChoiceId + 1;
        }
        return 0;
      },

      resetLocalization: () =>
        set({
          localizationData: {},
          lastSpeakerId: 0,
          lastLineId: 0,
          lastChoiceId: 0,
        }),

      importLocalizationData: (data) => set({ localizationData: data }),

      exportLocalizationData: () => {
        const state = get();
        return state.localizationData;
      },

      // EditorStore 참조 설정 (임시 해결책)
      _setEditorStore: (editorStore: any) => {
        set((state) => ({
          ...state,
          editorStoreRef: editorStore,
        }));
      },
    }),
    {
      name: "localization-store",
      version: 1,
      onRehydrateStorage: () => (state) => {
        // localStorage에서 복원된 데이터가 있는지 확인
        const storedData = localStorage.getItem('script-weaver-localization');
        if (!storedData || storedData === '{}') {
          // 저장된 데이터가 없으면 완전히 초기화
          if (state) {
            state.localizationData = {};
            state.lastSpeakerId = 0;
            state.lastLineId = 0;
            state.lastChoiceId = 0;
          }
        }
      },
    }
  )
);
