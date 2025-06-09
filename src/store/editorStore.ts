import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { 
  EditorState, 
  EditorNodeWrapper, 
  Dialogue, 
  TextDialogue, 
  ChoiceDialogue,
  InputDialogue,
  Scene,
  TemplateDialogues,
  ValidationResult
} from '../types/dialogue';
import { DialogueSpeed } from '../types/dialogue';
import { 
  exportToJSON as exportToJSONUtil, 
  exportToCSV as exportToCSVUtil,
  importFromJSON as importFromJSONUtil,
  validateTemplateData
} from '../utils/importExport';
import { useLocalizationStore } from './localizationStore';
import { migrateTemplateData, needsMigration } from '../utils/migration';
import dagre from '@dagrejs/dagre';

interface EditorStore extends EditorState {
  // 기본 액션들
  setCurrentTemplate: (templateKey: string) => void;
  setCurrentScene: (sceneKey: string) => void;
  setSelectedNode: (nodeKey?: string) => void;
  
  // 전역 토스트 함수
  showToast?: (message: string, type?: 'success' | 'info' | 'warning') => void;
  
  // 노드 관리
  addNode: (node: EditorNodeWrapper) => void;
  updateNode: (nodeKey: string, updates: Partial<EditorNodeWrapper>) => void;
  deleteNode: (nodeKey: string) => void;
  moveNode: (nodeKey: string, position: { x: number; y: number }) => void;
  
  // 대화 내용 수정 (실제 텍스트 기반)
  updateDialogue: (nodeKey: string, dialogue: Partial<Dialogue>) => void;
  updateNodeText: (nodeKey: string, speakerText?: string, contentText?: string) => void;
  updateChoiceText: (nodeKey: string, choiceKey: string, choiceText: string) => void;
  
  // 자동 노드 생성 (실제 텍스트 기반)
  createTextNode: (contentText?: string, speakerText?: string) => string;
  createChoiceNode: (contentText?: string, speakerText?: string) => string;
  
  // 선택지 관리 (실제 텍스트 기반)
  addChoice: (nodeKey: string, choiceKey: string, choiceText: string, nextNodeKey?: string) => void;
  removeChoice: (nodeKey: string, choiceKey: string) => void;
  
  // 연결 관리
  connectNodes: (fromNodeKey: string, toNodeKey: string, choiceKey?: string) => void;
  disconnectNodes: (fromNodeKey: string, choiceKey?: string) => void;
  
  // AC-02: 선택지별 새 노드 자동 생성 및 연결
  createAndConnectChoiceNode: (fromNodeKey: string, choiceKey: string, nodeType?: 'text' | 'choice') => string;
  
  // 템플릿/씬 관리
  createTemplate: (templateKey: string) => void;
  createScene: (templateKey: string, sceneKey: string) => void;
  
  // 유틸리티
  getNextNodePosition: () => { x: number; y: number };
  generateNodeKey: () => string;
  getCurrentNodeCount: () => number;
  canCreateNewNode: () => boolean;
  
  // 노드 자동 정렬
  arrangeChildNodesAsTree: (rootNodeKey: string) => void;
  arrangeAllNodesAsTree: () => void;
  arrangeNodesWithDagre: () => void;
  
  // 검증
  validateCurrentScene: () => { isValid: boolean; errors: string[] };
  validateAllData: () => ValidationResult;
  
  // Import/Export
  exportToJSON: () => string;
  exportToCSV: () => { dialogue: string; localization: string };
  importFromJSON: (jsonString: string) => void;
  
  // 데이터 초기화/로드/마이그레이션
  resetEditor: () => void;
  loadFromLocalStorage: () => void;
  migrateToNewArchitecture: () => void;
  
  // 키 참조 업데이트
  updateNodeKeyReference: (nodeKey: string, keyType: 'speaker' | 'text', newKeyRef: string) => void;
  updateChoiceKeyReference: (nodeKey: string, choiceKey: string, newKeyRef: string) => void;
}

// 타입 안전한 헬퍼 함수들
const createEmptyScene = (): Scene => ({});

const createEmptyTemplate = (): TemplateDialogues => ({
  default: {
    main: createEmptyScene()
  }
});

const ensureTemplateExists = (templateData: TemplateDialogues, templateKey: string): TemplateDialogues => {
  if (!templateData[templateKey]) {
    return {
      ...templateData,
      [templateKey]: { main: createEmptyScene() }
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
        [sceneKey]: createEmptyScene()
      }
    };
  }
  return updatedData;
};

// 타입 안전한 Scene 접근 헬퍼
const getNode = (scene: Scene, nodeKey: string): EditorNodeWrapper | undefined => {
  return scene[nodeKey];
};

const setNode = (scene: Scene, nodeKey: string, node: EditorNodeWrapper): Scene => {
  return {
    ...scene,
    [nodeKey]: node
  };
};

const deleteNodeFromScene = (scene: Scene, nodeKey: string): Scene => {
  const newScene = { ...scene };
  delete newScene[nodeKey];
  
  // 댕글링 참조 정리: 삭제된 노드를 참조하는 모든 노드들의 참조를 제거
  Object.values(newScene).forEach(nodeWrapper => {
    const { dialogue } = nodeWrapper;
    
    // TextDialogue의 nextNodeKey 정리
    if (dialogue.type === 'text' && dialogue.nextNodeKey === nodeKey) {
      dialogue.nextNodeKey = undefined;
    }
    
    // ChoiceDialogue의 선택지들 정리
    if (dialogue.type === 'choice' && dialogue.choices) {
      Object.entries(dialogue.choices).forEach(([choiceKey, choice]) => {
        if (choice.nextNodeKey === nodeKey) {
          dialogue.choices[choiceKey].nextNodeKey = '';
        }
      });
    }
  });
  
  return newScene;
};

// 기본 상태
const initialState: EditorState = {
  currentTemplate: 'default',
  templateData: createEmptyTemplate(),
  currentScene: 'main',
  selectedNodeKey: undefined,
  lastNodePosition: { x: 250, y: 100 }
};

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => {
      // LocalizationStore 참조 업데이트 헬퍼
      const updateLocalizationStoreRef = () => {
        const localizationStore = useLocalizationStore.getState();
        localizationStore._setEditorStore(get());
      };

      return {
        ...initialState,
        
        // 기본 설정
        setCurrentTemplate: (templateKey) => {
          set(() => ({ currentTemplate: templateKey }));
          updateLocalizationStoreRef();
        },

        setCurrentScene: (sceneKey) => {
          set(() => ({ currentScene: sceneKey }));
          updateLocalizationStoreRef();
        },

        setSelectedNode: (nodeKey) => {
          set(() => ({ selectedNodeKey: nodeKey }));
          updateLocalizationStoreRef();
        },
        
        // 노드 관리
        addNode: (node) => {
          set((state) => {
            const newTemplateData = ensureSceneExists(
              state.templateData,
              state.currentTemplate,
              state.currentScene
            );
            
            const currentScene = newTemplateData[state.currentTemplate][state.currentScene];
            const updatedScene = setNode(currentScene, node.nodeKey, node);
            
            return {
              templateData: {
                ...newTemplateData,
                [state.currentTemplate]: {
                  ...newTemplateData[state.currentTemplate],
                  [state.currentScene]: updatedScene
                }
              },
              lastNodePosition: node.position,
              selectedNodeKey: node.nodeKey
            };
          });
          updateLocalizationStoreRef();
        },
        
        updateNode: (nodeKey, updates) => {
          set((state) => {
            const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
            if (!currentScene) return state;
            
            const currentNode = getNode(currentScene, nodeKey);
            if (!currentNode) return state;
            
            const updatedNode = { ...currentNode, ...updates };
            const updatedScene = setNode(currentScene, nodeKey, updatedNode);
            
            return {
              templateData: {
                ...state.templateData,
                [state.currentTemplate]: {
                  ...state.templateData[state.currentTemplate],
                  [state.currentScene]: updatedScene
                }
              }
            };
          });
          updateLocalizationStoreRef();
        },
        
        deleteNode: (nodeKey) => set((state) => {
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) return state;
          
          // 삭제할 노드를 참조하는 다른 노드들 찾기
          const referencingNodes: string[] = [];
          Object.entries(currentScene).forEach(([key, nodeWrapper]) => {
            if (key === nodeKey) return; // 자기 자신은 제외
            
            const { dialogue } = nodeWrapper;
            
            // TextDialogue 참조 확인
            if (dialogue.type === 'text' && dialogue.nextNodeKey === nodeKey) {
              referencingNodes.push(`${key} (텍스트 노드)`);
            }
            
            // ChoiceDialogue 참조 확인
            if (dialogue.type === 'choice' && dialogue.choices) {
              Object.entries(dialogue.choices).forEach(([choiceKey, choice]) => {
                if (choice.nextNodeKey === nodeKey) {
                  referencingNodes.push(`${key} (선택지 "${choice.choiceText || choice.textKeyRef || choiceKey}")`);
                }
              });
            }
          });
          
          // 참조가 있는 경우 콘솔에 정보 출력 (개발자용)
          if (referencingNodes.length > 0) {
            console.warn(`노드 "${nodeKey}" 삭제: ${referencingNodes.length}개의 참조가 자동으로 정리됩니다.`, referencingNodes);
          }
          
          const updatedScene = deleteNodeFromScene(currentScene, nodeKey);
          
          return {
            templateData: {
              ...state.templateData,
              [state.currentTemplate]: {
                ...state.templateData[state.currentTemplate],
                [state.currentScene]: updatedScene
              }
            },
            selectedNodeKey: state.selectedNodeKey === nodeKey ? undefined : state.selectedNodeKey
          };
        }),
        
        moveNode: (nodeKey, position) => set((state) => {
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) return state;
          
          const currentNode = getNode(currentScene, nodeKey);
          if (!currentNode) return state;
          
          const updatedNode = { ...currentNode, position };
          const updatedScene = setNode(currentScene, nodeKey, updatedNode);
          
          return {
            templateData: {
              ...state.templateData,
              [state.currentTemplate]: {
                ...state.templateData[state.currentTemplate],
                [state.currentScene]: updatedScene
              }
            },
            lastNodePosition: position
          };
        }),
        
        // 대화 내용 수정 (실제 텍스트 기반)
        updateDialogue: (nodeKey, dialogue) => set((state) => {
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) return state;
          
          const currentNode = getNode(currentScene, nodeKey);
          if (!currentNode) return state;
          
          let updatedDialogue: Dialogue;
          
          if (currentNode.dialogue.type === 'text') {
            updatedDialogue = {
              ...currentNode.dialogue,
              ...dialogue
            } as TextDialogue;
          } else if (currentNode.dialogue.type === 'choice') {
            updatedDialogue = {
              ...currentNode.dialogue,
              ...dialogue
            } as ChoiceDialogue;
          } else {
            updatedDialogue = {
              ...currentNode.dialogue,
              ...dialogue
            } as InputDialogue;
          }
          
          const updatedNode = {
            ...currentNode,
            dialogue: updatedDialogue
          };
          const updatedScene = setNode(currentScene, nodeKey, updatedNode);
          
          return {
            templateData: {
              ...state.templateData,
              [state.currentTemplate]: {
                ...state.templateData[state.currentTemplate],
                [state.currentScene]: updatedScene
              }
            }
          };
        }),
        
        updateNodeText: (nodeKey, speakerText, contentText) => {
          set((state) => {
            const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
            if (!currentScene) return state;
            
            const currentNode = getNode(currentScene, nodeKey);
            if (!currentNode) return state;
            
            // LocalizationStore와 연동하여 키 생성 및 텍스트 저장
            const localizationStore = useLocalizationStore.getState();
            
            let speakerKeyRef = currentNode.dialogue.speakerKeyRef;
            let textKeyRef = currentNode.dialogue.textKeyRef;
            
            // 화자 텍스트 처리
            if (speakerText !== undefined) {
              if (speakerText && speakerText.trim()) {
                const currentSpeakerKey = currentNode.dialogue.speakerKeyRef;
                const currentUsageCount = currentSpeakerKey ? localizationStore.getKeyUsageCount(currentSpeakerKey) : 0;
                
                if (currentSpeakerKey && currentUsageCount === 1) {
                  // 단일 사용 키: 기존 키 유지, 텍스트만 업데이트
                  localizationStore.setText(currentSpeakerKey, speakerText);
                  speakerKeyRef = currentSpeakerKey;
                } else {
                  // 다중 사용 키 또는 새 키: 기존 로직 사용
                  const speakerKeyResult = localizationStore.generateSpeakerKey(speakerText);
                  speakerKeyRef = speakerKeyResult.key;
                  localizationStore.setText(speakerKeyResult.key, speakerText);
                }
              } else {
                // 빈 문자열인 경우: 단일 사용 키만 삭제
                if (currentNode.dialogue.speakerKeyRef) {
                  const currentUsageCount = localizationStore.getKeyUsageCount(currentNode.dialogue.speakerKeyRef);
                  if (currentUsageCount === 1) {
                    // 단일 사용 키만 삭제
                    localizationStore.deleteKey(currentNode.dialogue.speakerKeyRef);
                  }
                  // 다중 사용 키는 삭제하지 않고 현재 노드의 참조만 제거
                }
                speakerKeyRef = undefined;
              }
            }
            
            // 내용 텍스트 처리
            if (contentText !== undefined) {
              if (contentText && contentText.trim()) {
                const currentTextKey = currentNode.dialogue.textKeyRef;
                const currentUsageCount = currentTextKey ? localizationStore.getKeyUsageCount(currentTextKey) : 0;
                
                if (currentTextKey && currentUsageCount === 1) {
                  // 단일 사용 키: 기존 키 유지, 텍스트만 업데이트
                  localizationStore.setText(currentTextKey, contentText);
                  textKeyRef = currentTextKey;
                } else {
                  // 다중 사용 키 또는 새 키: 기존 로직 사용
                  const textKeyResult = localizationStore.generateTextKey(contentText);
                  textKeyRef = textKeyResult.key;
                  localizationStore.setText(textKeyResult.key, contentText);
                }
              } else {
                // 빈 문자열인 경우: 단일 사용 키만 삭제
                if (currentNode.dialogue.textKeyRef) {
                  const currentUsageCount = localizationStore.getKeyUsageCount(currentNode.dialogue.textKeyRef);
                  if (currentUsageCount === 1) {
                    // 단일 사용 키만 삭제
                    localizationStore.deleteKey(currentNode.dialogue.textKeyRef);
                  }
                  // 다중 사용 키는 삭제하지 않고 현재 노드의 참조만 제거
                }
                textKeyRef = undefined;
              }
            }
            
            const updatedDialogue = {
              ...currentNode.dialogue,
              speakerText: speakerText !== undefined ? speakerText : currentNode.dialogue.speakerText,
              contentText: contentText !== undefined ? contentText : currentNode.dialogue.contentText,
              speakerKeyRef,
              textKeyRef
            };
            
            const updatedNode = { ...currentNode, dialogue: updatedDialogue };
            const updatedScene = setNode(currentScene, nodeKey, updatedNode);
            
            return {
              templateData: {
                ...state.templateData,
                [state.currentTemplate]: {
                  ...state.templateData[state.currentTemplate],
                  [state.currentScene]: updatedScene
                }
              }
            };
          });
          updateLocalizationStoreRef();
        },

        updateChoiceText: (nodeKey, choiceKey, choiceText) => {
          set((state) => {
            const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
            if (!currentScene) return state;
            
            const currentNode = getNode(currentScene, nodeKey);
            if (!currentNode || currentNode.dialogue.type !== 'choice') return state;
            
            // LocalizationStore와 연동하여 키 생성 및 텍스트 저장
            const localizationStore = useLocalizationStore.getState();
            
            let textKeyRef: string | undefined;
            
            if (choiceText && choiceText.trim()) {
              const currentChoice = currentNode.dialogue.choices[choiceKey];
              const currentChoiceKey = currentChoice?.textKeyRef;
              const currentUsageCount = currentChoiceKey ? localizationStore.getKeyUsageCount(currentChoiceKey) : 0;
              
              if (currentChoiceKey && currentUsageCount === 1) {
                // 단일 사용 키: 기존 키 유지, 텍스트만 업데이트
                localizationStore.setText(currentChoiceKey, choiceText);
                textKeyRef = currentChoiceKey;
              } else {
                // 다중 사용 키 또는 새 키: 기존 로직 사용
                const choiceKeyResult = localizationStore.generateChoiceKey(choiceText);
                localizationStore.setText(choiceKeyResult.key, choiceText);
                textKeyRef = choiceKeyResult.key;
              }
            } else {
              // 빈 문자열인 경우: 단일 사용 키만 삭제
              const existingChoice = currentNode.dialogue.choices[choiceKey];
              if (existingChoice?.textKeyRef) {
                const currentUsageCount = localizationStore.getKeyUsageCount(existingChoice.textKeyRef);
                if (currentUsageCount === 1) {
                  // 단일 사용 키만 삭제
                  localizationStore.deleteKey(existingChoice.textKeyRef);
                }
                // 다중 사용 키는 삭제하지 않고 현재 노드의 참조만 제거
              }
              textKeyRef = undefined;
            }
            
            const updatedDialogue = { ...currentNode.dialogue };
            if (updatedDialogue.choices[choiceKey]) {
              updatedDialogue.choices[choiceKey] = {
                ...updatedDialogue.choices[choiceKey],
                choiceText,
                textKeyRef
              };
            }
            
            const updatedNode = { ...currentNode, dialogue: updatedDialogue };
            const updatedScene = setNode(currentScene, nodeKey, updatedNode);
            
            return {
              templateData: {
                ...state.templateData,
                [state.currentTemplate]: {
                  ...state.templateData[state.currentTemplate],
                  [state.currentScene]: updatedScene
                }
              }
            };
          });
          updateLocalizationStoreRef();
        },
        
        // 자동 노드 생성 (실제 텍스트 기반)
        createTextNode: (contentText = "", speakerText = "") => {
          // 노드 개수 제한 체크
          if (!get().canCreateNewNode()) {
            throw new Error(`노드 개수가 최대 100개 제한에 도달했습니다. (현재: ${get().getCurrentNodeCount()}개)`);
          }
          
          const nodeKey = get().generateNodeKey();
          const position = get().getNextNodePosition();
          const state = get();
          
          // LocalizationStore와 연동하여 키 생성 및 텍스트 저장
          const localizationStore = useLocalizationStore.getState();
          
          let speakerKeyRef: string | undefined;
          let textKeyRef: string | undefined;
          
          if (speakerText && speakerText.trim()) {
            const speakerKeyResult = localizationStore.generateSpeakerKey(speakerText);
            speakerKeyRef = speakerKeyResult.key;
            localizationStore.setText(speakerKeyResult.key, speakerText);
          }
          
          if (contentText && contentText.trim()) {
            const textKeyResult = localizationStore.generateTextKey(contentText);
            textKeyRef = textKeyResult.key;
            localizationStore.setText(textKeyResult.key, contentText);
          }
          
          const textDialogue: TextDialogue = {
            type: "text",
            speakerText,
            contentText,
            speakerKeyRef,
            textKeyRef,
            speed: DialogueSpeed.NORMAL
          };
          
          const node: EditorNodeWrapper = {
            nodeKey,
            dialogue: textDialogue,
            position
          };
          
          get().addNode(node);
          return nodeKey;
        },
        
        createChoiceNode: (contentText = "", speakerText = "") => {
          // 노드 개수 제한 체크
          if (!get().canCreateNewNode()) {
            throw new Error(`노드 개수가 최대 100개 제한에 도달했습니다. (현재: ${get().getCurrentNodeCount()}개)`);
          }
          
          const nodeKey = get().generateNodeKey();
          const position = get().getNextNodePosition();
          const state = get();
          
          // LocalizationStore와 연동하여 키 생성 및 텍스트 저장
          const localizationStore = useLocalizationStore.getState();
          
          let speakerKeyRef: string | undefined;
          let textKeyRef: string | undefined;
          
          if (speakerText && speakerText.trim()) {
            const speakerKeyResult = localizationStore.generateSpeakerKey(speakerText);
            speakerKeyRef = speakerKeyResult.key;
            localizationStore.setText(speakerKeyResult.key, speakerText);
          }
          
          if (contentText && contentText.trim()) {
            const textKeyResult = localizationStore.generateTextKey(contentText);
            textKeyRef = textKeyResult.key;
            localizationStore.setText(textKeyResult.key, contentText);
          }
          
          const choiceDialogue: ChoiceDialogue = {
            type: "choice",
            speakerText,
            contentText,
            speakerKeyRef,
            textKeyRef,
            choices: {},
            speed: DialogueSpeed.NORMAL
          };
          
          const node: EditorNodeWrapper = {
            nodeKey,
            dialogue: choiceDialogue,
            position
          };
          
          get().addNode(node);
          return nodeKey;
        },
        
        // 선택지 관리 (실제 텍스트 기반)
        addChoice: (nodeKey, choiceKey, choiceText, nextNodeKey = "") => set((state) => {
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) return state;
          
          const currentNode = getNode(currentScene, nodeKey);
          if (!currentNode || currentNode.dialogue.type !== 'choice') return state;
          
          // LocalizationStore와 연동하여 키 생성 및 텍스트 저장
          const localizationStore = useLocalizationStore.getState();
          
          let textKeyRef: string | undefined;
          
          // 빈 텍스트가 아닐 때만 키 생성
          if (choiceText && choiceText.trim()) {
            const choiceKeyResult = localizationStore.generateChoiceKey(choiceText);
            localizationStore.setText(choiceKeyResult.key, choiceText);
            textKeyRef = choiceKeyResult.key;
          }
          
          const updatedDialogue = { ...currentNode.dialogue };
          updatedDialogue.choices[choiceKey] = {
            choiceText,
            textKeyRef,
            nextNodeKey
          };
          
          const updatedNode = { ...currentNode, dialogue: updatedDialogue };
          const updatedScene = setNode(currentScene, nodeKey, updatedNode);
          
          return {
            templateData: {
              ...state.templateData,
              [state.currentTemplate]: {
                ...state.templateData[state.currentTemplate],
                [state.currentScene]: updatedScene
              }
            }
          };
        }),
        
        removeChoice: (nodeKey, choiceKey) => set((state) => {
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) return state;
          
          const currentNode = getNode(currentScene, nodeKey);
          if (!currentNode || currentNode.dialogue.type !== 'choice') return state;
          
          const updatedDialogue = { ...currentNode.dialogue };
          delete updatedDialogue.choices[choiceKey];
          
          const updatedNode = { ...currentNode, dialogue: updatedDialogue };
          const updatedScene = setNode(currentScene, nodeKey, updatedNode);
          
          return {
            templateData: {
              ...state.templateData,
              [state.currentTemplate]: {
                ...state.templateData[state.currentTemplate],
                [state.currentScene]: updatedScene
              }
            }
          };
        }),
        
        // 연결 관리
        connectNodes: (fromNodeKey, toNodeKey, choiceKey) => set((state) => {
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) return state;
          
          const fromNode = getNode(currentScene, fromNodeKey);
          if (!fromNode) return state;
          
          let updatedNode: EditorNodeWrapper;
          
          if (fromNode.dialogue.type === 'text') {
            // 텍스트 노드의 경우 nextNodeKey 설정
            const updatedDialogue = { ...fromNode.dialogue };
            updatedDialogue.nextNodeKey = toNodeKey;
            updatedNode = { ...fromNode, dialogue: updatedDialogue };
          } else if (fromNode.dialogue.type === 'choice' && choiceKey) {
            // 선택지 노드의 경우 특정 선택지의 nextNodeKey 설정
            const updatedDialogue = { ...fromNode.dialogue };
            if (updatedDialogue.choices[choiceKey]) {
              updatedDialogue.choices[choiceKey] = {
                ...updatedDialogue.choices[choiceKey],
                nextNodeKey: toNodeKey
              };
            }
            updatedNode = { ...fromNode, dialogue: updatedDialogue };
          } else {
            return state;
          }
          
          const updatedScene = setNode(currentScene, fromNodeKey, updatedNode);
          
          return {
            templateData: {
              ...state.templateData,
              [state.currentTemplate]: {
                ...state.templateData[state.currentTemplate],
                [state.currentScene]: updatedScene
              }
            }
          };
        }),

        // 연결 끊기
        disconnectNodes: (fromNodeKey, choiceKey) => set((state) => {
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) return state;
          
          const fromNode = getNode(currentScene, fromNodeKey);
          if (!fromNode) return state;
          
          let updatedNode: EditorNodeWrapper;
          
          if (fromNode.dialogue.type === 'text') {
            // 텍스트 노드의 경우 nextNodeKey 제거
            const updatedDialogue = { ...fromNode.dialogue };
            delete updatedDialogue.nextNodeKey;
            updatedNode = { ...fromNode, dialogue: updatedDialogue };
          } else if (fromNode.dialogue.type === 'choice' && choiceKey) {
            // 선택지 노드의 경우 특정 선택지의 nextNodeKey 제거
            const updatedDialogue = { ...fromNode.dialogue };
            if (updatedDialogue.choices[choiceKey]) {
              updatedDialogue.choices[choiceKey] = {
                ...updatedDialogue.choices[choiceKey],
                nextNodeKey: ''
              };
            }
            updatedNode = { ...fromNode, dialogue: updatedDialogue };
          } else {
            return state;
          }
          
          const updatedScene = setNode(currentScene, fromNodeKey, updatedNode);
          
          return {
            templateData: {
              ...state.templateData,
              [state.currentTemplate]: {
                ...state.templateData[state.currentTemplate],
                [state.currentScene]: updatedScene
              }
            }
          };
        }),
        
        // AC-02: 선택지별 새 노드 자동 생성 및 연결
        createAndConnectChoiceNode: (fromNodeKey, choiceKey, nodeType = 'text') => {
          // 노드 개수 제한 체크
          if (!get().canCreateNewNode()) {
            throw new Error(`노드 개수가 최대 100개 제한에 도달했습니다. (현재: ${get().getCurrentNodeCount()}개)`);
          }
          
          const state = get();
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) return '';
          
          const fromNode = getNode(currentScene, fromNodeKey);
          if (!fromNode || fromNode.dialogue.type !== 'choice') return '';
          
          const choice = fromNode.dialogue.choices[choiceKey];
          if (!choice) return '';
          
          // 새 노드 생성
          const newNodeKey = get().generateNodeKey();
          const newNodePosition = get().getNextNodePosition();
          
          let newNode: EditorNodeWrapper;
          
          if (nodeType === 'text') {
            const textDialogue: TextDialogue = {
              type: 'text',
              speakerText: '',
              contentText: '',
              speed: DialogueSpeed.NORMAL
            };
            
            newNode = {
              nodeKey: newNodeKey,
              dialogue: textDialogue,
              position: newNodePosition
            };
          } else {
            const choiceDialogue: ChoiceDialogue = {
              type: 'choice',
              speakerText: '',
              contentText: '',
              choices: {},
              speed: DialogueSpeed.NORMAL
            };
            
            newNode = {
              nodeKey: newNodeKey,
              dialogue: choiceDialogue,
              position: newNodePosition
            };
          }
          
          // 새 노드를 씬에 추가 (이때 lastNodePosition이 업데이트됨)
          get().addNode(newNode);
          
          // 선택지를 새 노드에 연결
          get().connectNodes(fromNodeKey, newNodeKey, choiceKey);
          
          return newNodeKey;
        },
        
        // 템플릿/씬 관리
        createTemplate: (templateKey) => set((state) => ({
          templateData: ensureTemplateExists(state.templateData, templateKey)
        })),
        
        createScene: (templateKey, sceneKey) => set((state) => ({
          templateData: ensureSceneExists(state.templateData, templateKey, sceneKey)
        })),
        
        // 유틸리티 - 동적 노드 크기를 고려한 위치 계산
        getNextNodePosition: () => {
          const state = get();
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          
          if (!currentScene) {
            return { x: 100, y: 100 };
          }
          
          // 현재 씬의 모든 노드 위치 확인
          const allNodes = Object.values(currentScene);
          
          // 동적 노드 크기 계산 (DOM에서 실제 크기 가져오기)
          const getNodeDimensions = (nodeKey: string) => {
            const nodeElement = document.querySelector(`[data-id="${nodeKey}"]`);
            if (nodeElement) {
              const rect = nodeElement.getBoundingClientRect();
              return { width: rect.width, height: rect.height };
            }
            // 기본값 (DOM에서 찾을 수 없는 경우)
            return { width: 200, height: 120 };
          };
          
          // 기본 간격 설정
          const SPACING_X = 60;
          const SPACING_Y = 40;
          
          // 마지막 노드의 크기 계산
          const lastNodeKey = Object.keys(currentScene).pop();
          const lastNodeDimensions = lastNodeKey ? getNodeDimensions(lastNodeKey) : { width: 200, height: 120 };
          
          // 새 위치 후보 계산
          let candidateX = state.lastNodePosition.x + lastNodeDimensions.width + SPACING_X;
          let candidateY = state.lastNodePosition.y;
          
          // 겹치는 노드가 있는지 확인하는 함수 (더 정확한 계산)
          const isPositionOccupied = (x: number, y: number, newNodeWidth: number, newNodeHeight: number) => {
            return allNodes.some(node => {
              const existingDimensions = getNodeDimensions(node.nodeKey);
              
              // AABB (Axis-Aligned Bounding Box) 충돌 감지
              const overlap = !(
                x + newNodeWidth + SPACING_X < node.position.x ||
                x > node.position.x + existingDimensions.width + SPACING_X ||
                y + newNodeHeight + SPACING_Y < node.position.y ||
                y > node.position.y + existingDimensions.height + SPACING_Y
              );
              
              return overlap;
            });
          };
          
          // 새 노드의 예상 크기 (타입에 따라 다름)
          const estimatedNewNodeDimensions = { width: 200, height: 120 };
          
          // 겹치지 않는 위치 찾기
          let attempts = 0;
          const maxAttempts = 20;
          
          while (isPositionOccupied(candidateX, candidateY, estimatedNewNodeDimensions.width, estimatedNewNodeDimensions.height) && attempts < maxAttempts) {
            candidateY += estimatedNewNodeDimensions.height + SPACING_Y;
            
            // Y가 너무 아래로 가면 다음 열로 이동
            if (candidateY > state.lastNodePosition.y + (estimatedNewNodeDimensions.height + SPACING_Y) * 4) {
              candidateX += estimatedNewNodeDimensions.width + SPACING_X;
              candidateY = state.lastNodePosition.y;
            }
            
            attempts++;
          }
          
          // 최대 시도 횟수에 도달하면 강제로 위치 지정
          if (attempts >= maxAttempts) {
            candidateX = state.lastNodePosition.x + 250;
            candidateY = state.lastNodePosition.y + 150;
          }
          
          return {
            x: candidateX,
            y: candidateY
          };
        },
        
        generateNodeKey: () => {
          const timestamp = Date.now();
          const random = Math.random().toString(36).substr(2, 5);
          return `node_${timestamp}_${random}`;
        },
        
        getCurrentNodeCount: () => {
          const state = get();
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          return currentScene ? Object.keys(currentScene).length : 0;
        },
        
        canCreateNewNode: () => {
          const MAX_NODES = 100;
          return get().getCurrentNodeCount() < MAX_NODES;
        },
        
        // Dagre 기반 자동 정렬 (향상된 버전)
        arrangeNodesWithDagre: () => {
          const state = get();
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) return;
          
          const allNodeKeys = Object.keys(currentScene);
          if (allNodeKeys.length === 0) return;
          
          // Dagre 그래프 생성
          const dagreGraph = new dagre.graphlib.Graph();
          dagreGraph.setDefaultEdgeLabel(() => ({}));
          dagreGraph.setGraph({ 
            rankdir: 'LR', // 좌우 배치
            nodesep: 20,   // 노드 간격
            ranksep: 120,  // 레벨 간격
            marginx: 50,
            marginy: 50
          });
          
          // 노드들을 Dagre에 추가
          allNodeKeys.forEach(nodeKey => {
            dagreGraph.setNode(nodeKey, { 
              width: 200, 
              height: 120 
            });
          });
          
          // 엣지들을 Dagre에 추가
          allNodeKeys.forEach(nodeKey => {
            const node = getNode(currentScene, nodeKey);
            if (!node) return;
            
            if (node.dialogue.type === 'text' && node.dialogue.nextNodeKey) {
              dagreGraph.setEdge(nodeKey, node.dialogue.nextNodeKey);
            } else if (node.dialogue.type === 'choice') {
              Object.values(node.dialogue.choices).forEach(choice => {
                if (choice.nextNodeKey) {
                  dagreGraph.setEdge(nodeKey, choice.nextNodeKey);
                }
              });
            }
          });
          
          // 레이아웃 계산
          dagre.layout(dagreGraph);
          
          // 계산된 위치를 적용
          allNodeKeys.forEach(nodeKey => {
            const nodeWithPosition = dagreGraph.node(nodeKey);
            if (nodeWithPosition) {
              // Dagre는 중앙 좌표를 반환하므로 좌상단 좌표로 변환
              const newPosition = {
                x: nodeWithPosition.x - nodeWithPosition.width / 2,
                y: nodeWithPosition.y - nodeWithPosition.height / 2
              };
              get().moveNode(nodeKey, newPosition);
            }
          });
        },

        // 노드 자동 정렬 - 선택된 노드를 루트로 하여 자식 노드들을 트리 형태로 배치
        arrangeChildNodesAsTree: (rootNodeKey) => {
          const state = get();
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) return;
          
          const rootNode = getNode(currentScene, rootNodeKey);
          if (!rootNode) return;
          
          // 트리 구조 분석을 위한 노드 관계 매핑
          const childrenMap = new Map<string, string[]>();
          const allNodeKeys = Object.keys(currentScene);
          
          // 각 노드의 자식 노드들을 찾아서 매핑
          allNodeKeys.forEach(nodeKey => {
            const node = getNode(currentScene, nodeKey);
            if (!node) return;
            
            const children: string[] = [];
            
            if (node.dialogue.type === 'text' && node.dialogue.nextNodeKey) {
              children.push(node.dialogue.nextNodeKey);
            } else if (node.dialogue.type === 'choice') {
              Object.values(node.dialogue.choices).forEach(choice => {
                if (choice.nextNodeKey) {
                  children.push(choice.nextNodeKey);
                }
              });
            }
            
            if (children.length > 0) {
              childrenMap.set(nodeKey, children);
            }
          });
          
          // 개선된 BFS: 다중 부모의 경우 더 높은 depth 우선
          const nodeLevels = new Map<string, number>();
          const levelMap = new Map<number, string[]>();
          const queue: { nodeKey: string; level: number }[] = [{ nodeKey: rootNodeKey, level: 0 }];
          
          nodeLevels.set(rootNodeKey, 0);
          
          while (queue.length > 0) {
            const { nodeKey, level } = queue.shift()!;
            
            // 이미 더 높은 레벨로 처리된 노드는 건너뜀
            if (nodeLevels.has(nodeKey) && nodeLevels.get(nodeKey)! > level) {
              continue;
            }
            
            // 레벨 업데이트 (더 높은 레벨 우선)
            const currentLevel = Math.max(nodeLevels.get(nodeKey) || 0, level);
            nodeLevels.set(nodeKey, currentLevel);
            
            // 자식 노드들을 다음 레벨에 추가
            const children = childrenMap.get(nodeKey) || [];
            children.forEach(childKey => {
              const childNextLevel = currentLevel + 1;
              const existingLevel = nodeLevels.get(childKey);
              
              // 자식 노드가 더 높은 레벨로 갱신되거나 처음 방문하는 경우
              if (!existingLevel || childNextLevel > existingLevel) {
                nodeLevels.set(childKey, childNextLevel);
                queue.push({ nodeKey: childKey, level: childNextLevel });
              }
            });
          }
          
          // levelMap 구성
          nodeLevels.forEach((level, nodeKey) => {
            if (!levelMap.has(level)) {
              levelMap.set(level, []);
            }
            levelMap.get(level)!.push(nodeKey);
          });
          
          // 동적 노드 크기를 고려한 레벨별 위치 계산
          const startX = rootNode.position.x;
          const startY = rootNode.position.y;
          const levelSpacing = 320; // 레벨 간 X축 간격
          
          // 동적 노드 크기 계산 함수
          const getNodeDimensions = (nodeKey: string) => {
            const nodeElement = document.querySelector(`[data-id="${nodeKey}"]`);
            if (nodeElement) {
              const rect = nodeElement.getBoundingClientRect();
              return { width: rect.width, height: rect.height };
            }
            return { width: 200, height: 120 }; // 기본값
          };
          
          levelMap.forEach((nodesInLevel, level) => {
            const levelX = startX + (level * levelSpacing);
            let cumulativeY = startY;
            
            nodesInLevel.forEach((nodeKey, index) => {
              const nodeDimensions = getNodeDimensions(nodeKey);
              const dynamicSpacing = nodeDimensions.height + 30; // 동적 간격
              
              const newY = index === 0 ? startY : cumulativeY;
              
              // 루트 노드가 아닌 경우에만 위치 업데이트
              if (nodeKey !== rootNodeKey) {
                get().moveNode(nodeKey, { x: levelX, y: newY });
              }
              
              // 다음 노드를 위한 Y 위치 누적
              if (index < nodesInLevel.length - 1) {
                cumulativeY = newY + dynamicSpacing;
              }
            });
          });
        },
        
        // 전체 노드 자동 정렬 - 모든 노드를 계층적으로 배치
        arrangeAllNodesAsTree: () => {
          const state = get();
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) return;
          
          const allNodeKeys = Object.keys(currentScene);
          if (allNodeKeys.length === 0) return;
          
          // 트리 구조 분석을 위한 노드 관계 매핑
          const childrenMap = new Map<string, string[]>();
          const parentMap = new Map<string, string[]>();
          
          // 각 노드의 자식 노드들을 찾아서 매핑
          allNodeKeys.forEach(nodeKey => {
            const node = getNode(currentScene, nodeKey);
            if (!node) return;
            
            const children: string[] = [];
            
            if (node.dialogue.type === 'text' && node.dialogue.nextNodeKey) {
              children.push(node.dialogue.nextNodeKey);
            } else if (node.dialogue.type === 'choice') {
              Object.values(node.dialogue.choices).forEach(choice => {
                if (choice.nextNodeKey) {
                  children.push(choice.nextNodeKey);
                }
              });
            }
            
            if (children.length > 0) {
              childrenMap.set(nodeKey, children);
              // 부모 관계도 매핑
              children.forEach(childKey => {
                if (!parentMap.has(childKey)) {
                  parentMap.set(childKey, []);
                }
                parentMap.get(childKey)!.push(nodeKey);
              });
            }
          });
          
          // 루트 노드들 찾기 (부모가 없는 노드들)
          const rootNodes = allNodeKeys.filter(nodeKey => !parentMap.has(nodeKey));
          
          // 루트 노드가 없으면 첫 번째 노드를 루트로 사용
          if (rootNodes.length === 0 && allNodeKeys.length > 0) {
            rootNodes.push(allNodeKeys[0]);
          }
          
          // 각 루트 노드별로 트리 배치
          const startX = 100;
          const startY = 100;
          const rootSpacing = 400; // 루트 노드 간 수직 간격
          
          rootNodes.forEach((rootNodeKey, rootIndex) => {
            const rootY = startY + (rootIndex * rootSpacing);
            
            // 개선된 BFS: 다중 부모의 경우 더 높은 depth 우선
            const nodeLevels = new Map<string, number>();
            const levelMap = new Map<number, string[]>();
            const queue: { nodeKey: string; level: number }[] = [{ nodeKey: rootNodeKey, level: 0 }];
            
            nodeLevels.set(rootNodeKey, 0);
            
            while (queue.length > 0) {
              const { nodeKey, level } = queue.shift()!;
              
              // 이미 더 높은 레벨로 처리된 노드는 건너뜀
              if (nodeLevels.has(nodeKey) && nodeLevels.get(nodeKey)! > level) {
                continue;
              }
              
              // 레벨 업데이트 (더 높은 레벨 우선)
              const currentLevel = Math.max(nodeLevels.get(nodeKey) || 0, level);
              nodeLevels.set(nodeKey, currentLevel);
              
              // 자식 노드들을 다음 레벨에 추가
              const children = childrenMap.get(nodeKey) || [];
              children.forEach(childKey => {
                const childNextLevel = currentLevel + 1;
                const existingLevel = nodeLevels.get(childKey);
                
                // 자식 노드가 더 높은 레벨로 갱신되거나 처음 방문하는 경우
                if (!existingLevel || childNextLevel > existingLevel) {
                  nodeLevels.set(childKey, childNextLevel);
                  queue.push({ nodeKey: childKey, level: childNextLevel });
                }
              });
            }
            
            // levelMap 구성
            nodeLevels.forEach((level, nodeKey) => {
              if (!levelMap.has(level)) {
                levelMap.set(level, []);
              }
              levelMap.get(level)!.push(nodeKey);
            });
            
            // 동적 노드 크기를 고려한 레벨별 위치 계산
            const levelSpacing = 320; // 레벨 간 X축 간격
            
            // 동적 노드 크기 계산 함수
            const getNodeDimensions = (nodeKey: string) => {
              const nodeElement = document.querySelector(`[data-id="${nodeKey}"]`);
              if (nodeElement) {
                const rect = nodeElement.getBoundingClientRect();
                return { width: rect.width, height: rect.height };
              }
              return { width: 200, height: 120 }; // 기본값
            };
            
            levelMap.forEach((nodesInLevel, level) => {
              const levelX = startX + (level * levelSpacing);
              let cumulativeY = rootY;
              
              nodesInLevel.forEach((nodeKey, index) => {
                const nodeDimensions = getNodeDimensions(nodeKey);
                const dynamicSpacing = nodeDimensions.height + 30; // 동적 간격
                
                const newY = index === 0 ? rootY : cumulativeY;
                get().moveNode(nodeKey, { x: levelX, y: newY });
                
                // 다음 노드를 위한 Y 위치 누적
                if (index < nodesInLevel.length - 1) {
                  cumulativeY = newY + dynamicSpacing;
                }
              });
            });
          });
        },
        
        // 검증
        validateCurrentScene: () => {
          const state = get();
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          const errors: string[] = [];
          
          if (!currentScene) {
            return { isValid: false, errors: ['현재 씬이 존재하지 않습니다.'] };
          }
          
          Object.entries(currentScene).forEach(([nodeKey, node]) => {
            const dialogue = node.dialogue;
            
            // 기본 필드 검증
            if (!dialogue.contentText?.trim() && !dialogue.textKeyRef?.trim()) {
              errors.push(`노드 ${nodeKey}: 내용 텍스트가 비어있습니다.`);
            }
            
            // 타입별 검증
            if (dialogue.type === 'text') {
              // 텍스트 노드는 nextNodeKey가 있어야 함 (또는 마지막 노드)
              if (dialogue.nextNodeKey && !getNode(currentScene, dialogue.nextNodeKey)) {
                errors.push(`노드 ${nodeKey}: 존재하지 않는 노드 '${dialogue.nextNodeKey}'를 참조합니다.`);
              }
            } else if (dialogue.type === 'choice') {
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
            errors
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
            
            // EditorStore 업데이트
            set({
              templateData: importResult.templateData,
              currentTemplate: Object.keys(importResult.templateData)[0] || 'default',
              currentScene: 'main',
              selectedNodeKey: undefined
            });
            
            // LocalizationStore 업데이트
            const localizationStore = useLocalizationStore.getState();
            localizationStore.importLocalizationData(importResult.localizationData);
            
            // 마이그레이션이 필요한 경우 실행
            if (importResult.needsMigration) {
              console.log('마이그레이션이 필요한 데이터입니다. 자동 마이그레이션을 실행합니다.');
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
            console.log('마이그레이션이 필요하지 않습니다.');
            return;
          }
          
          console.log('데이터 마이그레이션을 시작합니다...');
          
          // LocalizationStore 가져오기
          const localizationStore = useLocalizationStore.getState();
          const existingLocalizationData = localizationStore.exportLocalizationData();
          
          // 마이그레이션 실행
          const migrationResult = migrateTemplateData(state.templateData, existingLocalizationData);
          
          if (migrationResult.result.success) {
            // 성공적으로 마이그레이션된 경우 데이터 업데이트
            set({
              templateData: migrationResult.migratedData
            });
            
            // LocalizationStore에 새 데이터 적용
            localizationStore.importLocalizationData(migrationResult.localizationData);
            
            console.log(`마이그레이션 완료: ${migrationResult.result.migratedNodes}개 노드가 성공적으로 마이그레이션되었습니다.`);
          } else {
            console.error('마이그레이션 실패:', migrationResult.result.errors);
          }
        },
        
        // 키 참조 업데이트
        updateNodeKeyReference: (nodeKey, keyType, newKeyRef) => set((state) => {
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) return state;
          
          const currentNode = getNode(currentScene, nodeKey);
          if (!currentNode) return state;
          
          const localizationStore = useLocalizationStore.getState();
          const newText = localizationStore.getText(newKeyRef) || '';
          
          const updatedDialogue = { ...currentNode.dialogue };
          if (keyType === 'speaker') {
            updatedDialogue.speakerKeyRef = newKeyRef;
            updatedDialogue.speakerText = newText; // 실제 텍스트도 동기화
          } else if (keyType === 'text') {
            updatedDialogue.textKeyRef = newKeyRef;
            updatedDialogue.contentText = newText; // 실제 텍스트도 동기화
          }
          
          const updatedNode = { ...currentNode, dialogue: updatedDialogue };
          const updatedScene = setNode(currentScene, nodeKey, updatedNode);
          
          return {
            templateData: {
              ...state.templateData,
              [state.currentTemplate]: {
                ...state.templateData[state.currentTemplate],
                [state.currentScene]: updatedScene
              }
            }
          };
        }),
        
        updateChoiceKeyReference: (nodeKey, choiceKey, newKeyRef) => set((state) => {
          const currentScene = state.templateData[state.currentTemplate]?.[state.currentScene];
          if (!currentScene) return state;
          
          const currentNode = getNode(currentScene, nodeKey);
          if (!currentNode || currentNode.dialogue.type !== 'choice') return state;
          
          const localizationStore = useLocalizationStore.getState();
          const newText = localizationStore.getText(newKeyRef) || '';
          
          const updatedDialogue = { ...currentNode.dialogue };
          if (updatedDialogue.choices[choiceKey]) {
            updatedDialogue.choices[choiceKey] = {
              ...updatedDialogue.choices[choiceKey],
              textKeyRef: newKeyRef,
              choiceText: newText // 실제 텍스트도 동기화
            };
          }
          
          const updatedNode = { ...currentNode, dialogue: updatedDialogue };
          const updatedScene = setNode(currentScene, nodeKey, updatedNode);
          
          return {
            templateData: {
              ...state.templateData,
              [state.currentTemplate]: {
                ...state.templateData[state.currentTemplate],
                [state.currentScene]: updatedScene
              }
            }
          };
        })
      };
    },
    {
      name: 'script-weaver-editor', // localStorage key
      version: 1,
      onRehydrateStorage: () => (state) => {
        // LocalizationStore에 EditorStore 참조 설정
        if (state) {
          const localizationStore = useLocalizationStore.getState();
          localizationStore._setEditorStore(state);
        }
      }
    }
  )
);

// 초기 참조 설정
setTimeout(() => {
  const localizationStore = useLocalizationStore.getState();
  localizationStore._setEditorStore(useEditorStore.getState());
}, 0); 