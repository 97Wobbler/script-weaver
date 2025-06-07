import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

interface EditorStore extends EditorState {
  // 기본 액션들
  setCurrentTemplate: (templateKey: string) => void;
  setCurrentScene: (sceneKey: string) => void;
  setSelectedNode: (nodeKey?: string) => void;
  
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
        
        // 유틸리티
        getNextNodePosition: () => {
          const state = get();
          return {
            x: state.lastNodePosition.x,
            y: state.lastNodePosition.y + 120 // 노드 높이 + 10px 간격
          };
        },
        
        generateNodeKey: () => {
          const timestamp = Date.now();
          const random = Math.random().toString(36).substr(2, 5);
          return `node_${timestamp}_${random}`;
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