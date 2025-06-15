import { useCallback } from 'react';
import { useProjectStore } from '../store/projectStore';
import type { EditorNodeWrapper } from '../types/dialogue';

export const useNodeOperations = () => {
  const projectStore = useProjectStore();

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

  // 노드 이동
  const moveNode = useCallback((nodeKey: string, position: { x: number; y: number }) => {
    const currentSceneData = getCurrentScene();
    const node = currentSceneData[nodeKey];
    
    if (node) {
      updateCurrentScene({
        ...currentSceneData,
        [nodeKey]: {
          ...node,
          position,
        },
      });
    }
  }, [getCurrentScene, updateCurrentScene]);

  // 노드 연결
  const connectNodes = useCallback((sourceNodeKey: string, targetNodeKey: string, choiceKey?: string) => {
    const currentSceneData = getCurrentScene();
    const sourceNode = currentSceneData[sourceNodeKey];
    const targetNode = currentSceneData[targetNodeKey];
    
    if (!sourceNode || !targetNode) return;

    const updatedSourceNode = { ...sourceNode };
    
    if (sourceNode.dialogue.type === "text") {
      updatedSourceNode.dialogue = {
        ...sourceNode.dialogue,
        nextNodeKey: targetNodeKey,
      };
    } else if (sourceNode.dialogue.type === "choice" && choiceKey) {
      const updatedChoices = { ...sourceNode.dialogue.choices };
      if (updatedChoices[choiceKey]) {
        updatedChoices[choiceKey] = {
          ...updatedChoices[choiceKey],
          nextNodeKey: targetNodeKey,
        };
      }
      updatedSourceNode.dialogue = {
        ...sourceNode.dialogue,
        choices: updatedChoices,
      };
    }

    updateCurrentScene({
      ...currentSceneData,
      [sourceNodeKey]: updatedSourceNode,
    });
  }, [getCurrentScene, updateCurrentScene]);

  // 노드 삭제
  const deleteNode = useCallback((nodeKey: string) => {
    const currentSceneData = getCurrentScene();
    if (!currentSceneData[nodeKey]) return;

    const newSceneData = { ...currentSceneData };
    delete newSceneData[nodeKey];

    // 댕글링 참조 정리
    Object.values(newSceneData).forEach((nodeWrapper: any) => {
      const { dialogue } = nodeWrapper;

      // TextDialogue의 nextNodeKey 정리
      if (dialogue.type === "text" && dialogue.nextNodeKey === nodeKey) {
        dialogue.nextNodeKey = undefined;
      }

      // ChoiceDialogue의 choices 정리
      if (dialogue.type === "choice") {
        Object.values(dialogue.choices).forEach((choice: any) => {
          if (choice.nextNodeKey === nodeKey) {
            choice.nextNodeKey = "";
          }
        });
      }
    });

    updateCurrentScene(newSceneData);
  }, [getCurrentScene, updateCurrentScene]);

  // 선택된 노드들 복사 (간단한 구현)
  const copySelectedNodes = useCallback(() => {
    // 실제 구현에서는 선택된 노드들을 클립보드에 저장
    console.log("노드 복사 기능 - 구현 필요");
  }, []);

  // 노드 붙여넣기 (간단한 구현)
  const pasteNodes = useCallback((position?: { x: number; y: number }) => {
    // 실제 구현에서는 클립보드의 노드들을 붙여넣기
    console.log("노드 붙여넣기 기능 - 구현 필요", position);
  }, []);

  // 노드 복제
  const duplicateNode = useCallback((nodeKey: string): string => {
    const currentSceneData = getCurrentScene();
    const node = currentSceneData[nodeKey];
    
    if (!node) return "";

    // 새 노드 키 생성
    const existingKeys = Object.keys(currentSceneData);
    let counter = 1;
    let newNodeKey = `${nodeKey}_copy${counter}`;
    
    while (existingKeys.includes(newNodeKey)) {
      counter++;
      newNodeKey = `${nodeKey}_copy${counter}`;
    }

    // 새 노드 생성
    const newNode: EditorNodeWrapper = {
      ...node,
      nodeKey: newNodeKey,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
    };

    updateCurrentScene({
      ...currentSceneData,
      [newNodeKey]: newNode,
    });

    return newNodeKey;
  }, [getCurrentScene, updateCurrentScene]);

  // 선택된 노드들 삭제 (간단한 구현)
  const deleteSelectedNodes = useCallback(() => {
    // 실제 구현에서는 선택된 노드들을 모두 삭제
    console.log("선택된 노드들 삭제 기능 - 구현 필요");
  }, []);

  return {
    moveNode,
    connectNodes,
    deleteNode,
    copySelectedNodes,
    pasteNodes,
    duplicateNode,
    deleteSelectedNodes,
  };
}; 