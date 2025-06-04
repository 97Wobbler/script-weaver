import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  EditorState, 
  EditorNodeWrapper, 
  Dialogue, 
  TextDialogue, 
  ChoiceDialogue,
  Scene,
  TemplateDialogues
} from '../types/dialogue';
import { DialogueSpeed } from '../types/dialogue';

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
  
  // 대화 내용 수정
  updateDialogue: (nodeKey: string, dialogue: Partial<Dialogue>) => void;
  
  // 자동 노드 생성 (PRD 요구사항: 마지막 노드 기준 Y축 + 10px)
  createTextNode: (text?: string, speaker?: string) => string; // 생성된 nodeKey 반환
  createChoiceNode: (text?: string, speaker?: string) => string;
  
  // 선택지 관리
  addChoice: (nodeKey: string, choiceKey: string, choice: { textKey: string; nextNodeKey: string }) => void;
  removeChoice: (nodeKey: string, choiceKey: string) => void;
  
  // 연결 관리
  connectNodes: (fromNodeKey: string, toNodeKey: string, choiceKey?: string) => void;
  
  // 템플릿/씬 관리
  createTemplate: (templateKey: string) => void;
  createScene: (templateKey: string, sceneKey: string) => void;
  
  // 유틸리티
  getNextNodePosition: () => { x: number; y: number };
  generateNodeKey: () => string;
  
  // 검증
  validateCurrentScene: () => { isValid: boolean; errors: string[] };
  
  // 데이터 초기화/로드
  resetEditor: () => void;
  loadFromLocalStorage: () => void;
}

// 기본 상태
const initialState: EditorState = {
  currentTemplate: 'default',
  templateData: {
    default: {
      main: {}
    }
  },
  currentScene: 'main',
  selectedNodeKey: undefined,
  lastNodePosition: { x: 250, y: 100 }
};

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // 기본 설정
      setCurrentTemplate: (templateKey) => 
        set((state) => ({ currentTemplate: templateKey })),
      
      setCurrentScene: (sceneKey) => 
        set((state) => ({ currentScene: sceneKey })),
      
      setSelectedNode: (nodeKey) => 
        set((state) => ({ selectedNodeKey: nodeKey })),
      
      // 노드 관리
      addNode: (node) => set((state) => {
        const newTemplateData = { ...state.templateData };
        if (!newTemplateData[state.currentTemplate]) {
          newTemplateData[state.currentTemplate] = {};
        }
        if (!newTemplateData[state.currentTemplate][state.currentScene]) {
          newTemplateData[state.currentTemplate][state.currentScene] = {};
        }
        
        newTemplateData[state.currentTemplate][state.currentScene] = {
          ...newTemplateData[state.currentTemplate][state.currentScene],
          [node.nodeKey]: node
        };
        
        return {
          templateData: newTemplateData,
          lastNodePosition: node.position,
          selectedNodeKey: node.nodeKey
        };
      }),
      
      updateNode: (nodeKey, updates) => set((state) => {
        const newTemplateData = { ...state.templateData };
        const currentScene = newTemplateData[state.currentTemplate]?.[state.currentScene];
        const currentNode = currentScene?.[nodeKey];
        
        if (currentNode && currentScene) {
          currentScene[nodeKey] = {
            ...currentNode,
            ...updates
          };
        }
        
        return { templateData: newTemplateData };
      }),
      
      deleteNode: (nodeKey) => set((state) => {
        const newTemplateData = { ...state.templateData };
        const currentScene = newTemplateData[state.currentTemplate]?.[state.currentScene];
        
        if (currentScene) {
          delete currentScene[nodeKey];
        }
        
        return {
          templateData: newTemplateData,
          selectedNodeKey: state.selectedNodeKey === nodeKey ? undefined : state.selectedNodeKey
        };
      }),
      
      moveNode: (nodeKey, position) => set((state) => {
        const newTemplateData = { ...state.templateData };
        const currentScene = newTemplateData[state.currentTemplate]?.[state.currentScene];
        const currentNode = currentScene?.[nodeKey];
        
        if (currentNode && currentScene) {
          currentScene[nodeKey] = {
            ...currentNode,
            position
          };
        }
        
        return {
          templateData: newTemplateData,
          lastNodePosition: position
        };
      }),
      
      // 대화 내용 수정
      updateDialogue: (nodeKey, dialogue) => set((state) => {
        const newTemplateData = { ...state.templateData };
        const currentScene = newTemplateData[state.currentTemplate]?.[state.currentScene];
        const currentNode = currentScene?.[nodeKey];
        
        if (currentNode && currentScene) {
          currentScene[nodeKey] = {
            ...currentNode,
            dialogue: {
              ...currentNode.dialogue,
              ...dialogue
            }
          };
        }
        
        return { templateData: newTemplateData };
      }),
      
      // 자동 노드 생성
      createTextNode: (text = "", speaker = "") => {
        const nodeKey = get().generateNodeKey();
        const position = get().getNextNodePosition();
        
        const textDialogue: TextDialogue = {
          type: "text",
          textKey: text,
          speakerKey: speaker,
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
      
      createChoiceNode: (text = "", speaker = "") => {
        const nodeKey = get().generateNodeKey();
        const position = get().getNextNodePosition();
        
        const choiceDialogue: ChoiceDialogue = {
          type: "choice",
          textKey: text,
          speakerKey: speaker,
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
      
      // 선택지 관리
      addChoice: (nodeKey, choiceKey, choice) => set((state) => {
        const newTemplateData = { ...state.templateData };
        const currentScene = newTemplateData[state.currentTemplate]?.[state.currentScene];
        const currentNode = currentScene?.[nodeKey];
        
        if (currentNode && currentNode.dialogue.type === 'choice' && currentScene) {
          const updatedDialogue = { ...currentNode.dialogue };
          updatedDialogue.choices[choiceKey] = choice;
          
          currentScene[nodeKey] = {
            ...currentNode,
            dialogue: updatedDialogue
          };
        }
        
        return { templateData: newTemplateData };
      }),
      
      removeChoice: (nodeKey, choiceKey) => set((state) => {
        const newTemplateData = { ...state.templateData };
        const currentScene = newTemplateData[state.currentTemplate]?.[state.currentScene];
        const currentNode = currentScene?.[nodeKey];
        
        if (currentNode && currentNode.dialogue.type === 'choice' && currentScene) {
          const updatedDialogue = { ...currentNode.dialogue };
          delete updatedDialogue.choices[choiceKey];
          
          currentScene[nodeKey] = {
            ...currentNode,
            dialogue: updatedDialogue
          };
        }
        
        return { templateData: newTemplateData };
      }),
      
      // 연결 관리
      connectNodes: (fromNodeKey, toNodeKey, choiceKey) => set((state) => {
        const newTemplateData = { ...state.templateData };
        const currentScene = newTemplateData[state.currentTemplate]?.[state.currentScene];
        const fromNode = currentScene?.[fromNodeKey];
        
        if (fromNode && currentScene) {
          if (fromNode.dialogue.type === 'text') {
            // 텍스트 노드의 경우 nextNodeKey 설정
            const updatedDialogue = { ...fromNode.dialogue };
            updatedDialogue.nextNodeKey = toNodeKey;
            
            currentScene[fromNodeKey] = {
              ...fromNode,
              dialogue: updatedDialogue
            };
          } else if (fromNode.dialogue.type === 'choice' && choiceKey) {
            // 선택지 노드의 경우 특정 선택지의 nextNodeKey 설정
            const updatedDialogue = { ...fromNode.dialogue };
            if (updatedDialogue.choices[choiceKey]) {
              updatedDialogue.choices[choiceKey].nextNodeKey = toNodeKey;
            }
            
            currentScene[fromNodeKey] = {
              ...fromNode,
              dialogue: updatedDialogue
            };
          }
        }
        
        return { templateData: newTemplateData };
      }),
      
      // 템플릿/씬 관리
      createTemplate: (templateKey) => set((state) => ({
        templateData: {
          ...state.templateData,
          [templateKey]: { main: {} }
        }
      })),
      
      createScene: (templateKey, sceneKey) => set((state) => {
        const newTemplateData = { ...state.templateData };
        if (!newTemplateData[templateKey]) {
          newTemplateData[templateKey] = {};
        }
        newTemplateData[templateKey] = {
          ...newTemplateData[templateKey],
          [sceneKey]: {}
        };
        
        return { templateData: newTemplateData };
      }),
      
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
          if (!dialogue.textKey?.trim()) {
            errors.push(`노드 ${nodeKey}: textKey가 비어있습니다.`);
          }
          
          // 타입별 검증
          if (dialogue.type === 'text') {
            // 텍스트 노드는 nextNodeKey가 있어야 함 (또는 마지막 노드)
            if (dialogue.nextNodeKey && !currentScene[dialogue.nextNodeKey]) {
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
              } else if (!currentScene[choice.nextNodeKey]) {
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
      
      // 데이터 초기화/로드
      resetEditor: () => set(initialState),
      
      loadFromLocalStorage: () => {
        // persist 미들웨어가 자동으로 처리하므로 별도 구현 불필요
      }
    }),
    {
      name: 'script-weaver-editor', // localStorage key
      version: 1
    }
  )
); 