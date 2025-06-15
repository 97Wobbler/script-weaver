import { useCallback } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useNodeCreation } from './useNodeCreation';

export const useNodeConnections = () => {
  const projectStore = useProjectStore();
  const { createTextNode, createChoiceNode } = useNodeCreation();

  // 현재 씬 데이터 가져오기
  const getCurrentScene = useCallback(() => {
    return projectStore.templateData[projectStore.currentTemplate]?.[projectStore.currentScene] || {};
  }, [projectStore]);

  // 현재 씬 데이터 업데이트
  const updateCurrentScene = useCallback((newSceneData: any) => {
    const currentTemplate = projectStore.currentTemplate;
    const currentScene = projectStore.currentScene;
    
    projectStore.updateTemplateData({
      ...projectStore.templateData,
      [currentTemplate]: {
        ...projectStore.templateData[currentTemplate],
        [currentScene]: newSceneData,
      },
    });
  }, [projectStore]);

  // 노드 연결 해제
  const disconnectNodes = useCallback((nodeKey: string, choiceKey?: string) => {
    const currentSceneData = getCurrentScene();
    const node = currentSceneData[nodeKey];
    
    if (!node) return;

    const updatedNode = { ...node };
    
    if (node.dialogue.type === "text") {
      updatedNode.dialogue = {
        ...node.dialogue,
        nextNodeKey: undefined,
      };
    } else if (node.dialogue.type === "choice" && choiceKey) {
      const updatedChoices = { ...node.dialogue.choices };
      if (updatedChoices[choiceKey]) {
        updatedChoices[choiceKey] = {
          ...updatedChoices[choiceKey],
          nextNodeKey: "",
        };
      }
      updatedNode.dialogue = {
        ...node.dialogue,
        choices: updatedChoices,
      };
    }

    updateCurrentScene({
      ...currentSceneData,
      [nodeKey]: updatedNode,
    });
  }, [getCurrentScene, updateCurrentScene]);

  // 텍스트 노드 생성 및 연결
  const createAndConnectTextNode = useCallback((fromNodeKey: string, nodeType: "text" | "choice" = "text"): string => {
    const currentSceneData = getCurrentScene();
    const fromNode = currentSceneData[fromNodeKey];
    
    if (!fromNode) return "";

    // 새 노드 생성
    const newNodeKey = nodeType === "choice" ? createChoiceNode() : createTextNode();
    
    // 연결 설정
    const updatedFromNode = { ...fromNode };
    
    if (fromNode.dialogue.type === "text") {
      updatedFromNode.dialogue = {
        ...fromNode.dialogue,
        nextNodeKey: newNodeKey,
      };
    }

    // 업데이트된 fromNode 저장
    const updatedSceneData = getCurrentScene(); // 새 노드가 추가된 후의 씬 데이터
    updateCurrentScene({
      ...updatedSceneData,
      [fromNodeKey]: updatedFromNode,
    });

    return newNodeKey;
  }, [getCurrentScene, updateCurrentScene, createTextNode, createChoiceNode]);

  // 선택지 노드 생성 및 연결
  const createAndConnectChoiceNode = useCallback((fromNodeKey: string, choiceKey: string, nodeType: "text" | "choice" = "text"): string => {
    const currentSceneData = getCurrentScene();
    const fromNode = currentSceneData[fromNodeKey];
    
    if (!fromNode || fromNode.dialogue.type !== "choice") return "";

    // 새 노드 생성
    const newNodeKey = nodeType === "choice" ? createChoiceNode() : createTextNode();
    
    // 선택지 연결 설정
    const updatedChoices = { ...fromNode.dialogue.choices };
    if (updatedChoices[choiceKey]) {
      updatedChoices[choiceKey] = {
        ...updatedChoices[choiceKey],
        nextNodeKey: newNodeKey,
      };
    }

    const updatedFromNode = {
      ...fromNode,
      dialogue: {
        ...fromNode.dialogue,
        choices: updatedChoices,
      },
    };

    // 업데이트된 fromNode 저장
    const updatedSceneData = getCurrentScene(); // 새 노드가 추가된 후의 씬 데이터
    updateCurrentScene({
      ...updatedSceneData,
      [fromNodeKey]: updatedFromNode,
    });

    return newNodeKey;
  }, [getCurrentScene, updateCurrentScene, createTextNode, createChoiceNode]);

  return {
    disconnectNodes,
    createAndConnectTextNode,
    createAndConnectChoiceNode,
  };
}; 