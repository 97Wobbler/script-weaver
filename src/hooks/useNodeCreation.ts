import { useCallback } from 'react';
import { useProjectStore } from '../store/projectStore';
import type { EditorNodeWrapper, TextDialogue, ChoiceDialogue } from '../types/dialogue';

export const useNodeCreation = () => {
  const projectStore = useProjectStore();

  // 노드 키 생성
  const generateNodeKey = useCallback((): string => {
    const currentScene = projectStore.templateData[projectStore.currentTemplate]?.[projectStore.currentScene] || {};
    const existingKeys = Object.keys(currentScene);
    let counter = 1;
    let nodeKey = `node${counter}`;
    
    while (existingKeys.includes(nodeKey)) {
      counter++;
      nodeKey = `node${counter}`;
    }
    
    return nodeKey;
  }, [projectStore]);

  // 다음 노드 위치 계산
  const getNextNodePosition = useCallback(() => {
    return { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 };
  }, []);

  // 텍스트 노드 생성
  const createTextNode = useCallback((contentText?: string, speakerText?: string): string => {
    const nodeKey = generateNodeKey();
    const position = getNextNodePosition();
    
    const dialogue: TextDialogue = {
      type: "text",
      speakerText: speakerText || "",
      contentText: contentText || "",
    };

    const node: EditorNodeWrapper = {
      nodeKey,
      dialogue,
      position,
    };

    // projectStore에 노드 추가
    const currentTemplate = projectStore.currentTemplate;
    const currentScene = projectStore.currentScene;
    const currentSceneData = projectStore.templateData[currentTemplate]?.[currentScene] || {};
    
    projectStore.updateTemplateData({
      ...projectStore.templateData,
      [currentTemplate]: {
        ...projectStore.templateData[currentTemplate],
        [currentScene]: {
          ...currentSceneData,
          [nodeKey]: node,
        },
      },
    });

    return nodeKey;
  }, [projectStore, generateNodeKey, getNextNodePosition]);

  // 선택지 노드 생성
  const createChoiceNode = useCallback((contentText?: string, speakerText?: string): string => {
    const nodeKey = generateNodeKey();
    const position = getNextNodePosition();
    
    const dialogue: ChoiceDialogue = {
      type: "choice",
      speakerText: speakerText || "",
      contentText: contentText || "",
      choices: {
        choice1: { choiceText: "선택지 1", nextNodeKey: "" },
        choice2: { choiceText: "선택지 2", nextNodeKey: "" },
      },
    };

    const node: EditorNodeWrapper = {
      nodeKey,
      dialogue,
      position,
    };

    // projectStore에 노드 추가
    const currentTemplate = projectStore.currentTemplate;
    const currentScene = projectStore.currentScene;
    const currentSceneData = projectStore.templateData[currentTemplate]?.[currentScene] || {};
    
    projectStore.updateTemplateData({
      ...projectStore.templateData,
      [currentTemplate]: {
        ...projectStore.templateData[currentTemplate],
        [currentScene]: {
          ...currentSceneData,
          [nodeKey]: node,
        },
      },
    });

    return nodeKey;
  }, [projectStore, generateNodeKey, getNextNodePosition]);

  // 새 노드 생성 가능 여부 확인
  const canCreateNewNode = useCallback((): boolean => {
    const currentScene = projectStore.templateData[projectStore.currentTemplate]?.[projectStore.currentScene] || {};
    return Object.keys(currentScene).length < 1000; // 최대 노드 수 제한
  }, [projectStore]);

  // 데이터 검증
  const validateAllData = useCallback(() => {
    const currentScene = projectStore.templateData[projectStore.currentTemplate]?.[projectStore.currentScene] || {};
    const nodeCount = Object.keys(currentScene).length;
    
    return {
      isValid: nodeCount > 0,
      errors: nodeCount === 0 ? [{ nodeKey: "", field: "nodes", message: "노드가 없습니다" }] : [],
      warnings: [],
    };
  }, [projectStore]);

  return {
    createTextNode,
    createChoiceNode,
    canCreateNewNode,
    validateAllData,
  };
}; 