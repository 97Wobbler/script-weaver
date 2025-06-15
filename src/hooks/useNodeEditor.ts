import { useCallback } from 'react';
import { useProjectStore } from '../store/projectStore';
import type { Dialogue } from '../types/dialogue';

export const useNodeEditor = () => {
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

  // 노드 텍스트 업데이트
  const updateNodeText = useCallback((nodeKey: string, speakerText?: string, contentText?: string) => {
    const currentSceneData = getCurrentScene();
    const node = currentSceneData[nodeKey];
    
    if (!node) return;

    const updates: any = {};
    if (speakerText !== undefined) updates.speakerText = speakerText;
    if (contentText !== undefined) updates.contentText = contentText;

    updateCurrentScene({
      ...currentSceneData,
      [nodeKey]: {
        ...node,
        dialogue: {
          ...node.dialogue,
          ...updates,
        },
      },
    });
  }, [getCurrentScene, updateCurrentScene]);

  // 선택지 텍스트 업데이트
  const updateChoiceText = useCallback((nodeKey: string, choiceKey: string, choiceText: string) => {
    const currentSceneData = getCurrentScene();
    const node = currentSceneData[nodeKey];
    
    if (!node || node.dialogue.type !== "choice") return;

    const updatedChoices = { ...node.dialogue.choices };
    if (updatedChoices[choiceKey]) {
      updatedChoices[choiceKey] = {
        ...updatedChoices[choiceKey],
        choiceText: choiceText,
      };
    }

    updateCurrentScene({
      ...currentSceneData,
      [nodeKey]: {
        ...node,
        dialogue: {
          ...node.dialogue,
          choices: updatedChoices,
        },
      },
    });
  }, [getCurrentScene, updateCurrentScene]);

  // 선택지 추가
  const addChoice = useCallback((nodeKey: string, choiceKey: string, choiceText: string, nextNodeKey?: string) => {
    const currentSceneData = getCurrentScene();
    const node = currentSceneData[nodeKey];
    
    if (!node || node.dialogue.type !== "choice") return;

    const updatedChoices = {
      ...node.dialogue.choices,
      [choiceKey]: { choiceText, nextNodeKey: nextNodeKey || "" },
    };

    updateCurrentScene({
      ...currentSceneData,
      [nodeKey]: {
        ...node,
        dialogue: {
          ...node.dialogue,
          choices: updatedChoices,
        },
      },
    });
  }, [getCurrentScene, updateCurrentScene]);

  // 선택지 제거
  const removeChoice = useCallback((nodeKey: string, choiceKey: string) => {
    const currentSceneData = getCurrentScene();
    const node = currentSceneData[nodeKey];
    
    if (!node || node.dialogue.type !== "choice") return;

    const updatedChoices = { ...node.dialogue.choices };
    delete updatedChoices[choiceKey];

    updateCurrentScene({
      ...currentSceneData,
      [nodeKey]: {
        ...node,
        dialogue: {
          ...node.dialogue,
          choices: updatedChoices,
        },
      },
    });
  }, [getCurrentScene, updateCurrentScene]);

  // 대화 업데이트
  const updateDialogue = useCallback((nodeKey: string, dialogue: Partial<Dialogue>) => {
    const currentSceneData = getCurrentScene();
    const node = currentSceneData[nodeKey];
    
    if (!node) return;

    updateCurrentScene({
      ...currentSceneData,
      [nodeKey]: {
        ...node,
        dialogue: {
          ...node.dialogue,
          ...dialogue,
        },
      },
    });
  }, [getCurrentScene, updateCurrentScene]);

  // 노드 키 참조 업데이트
  const updateNodeKeyReference = useCallback((nodeKey: string, keyType: "speaker" | "text", newKeyRef: string) => {
    const currentSceneData = getCurrentScene();
    const node = currentSceneData[nodeKey];
    
    if (!node) return;

    const updates: any = {};
    if (keyType === "speaker") {
      updates.speakerKeyRef = newKeyRef;
    } else if (keyType === "text") {
      updates.textKeyRef = newKeyRef;
    }

    updateCurrentScene({
      ...currentSceneData,
      [nodeKey]: {
        ...node,
        dialogue: {
          ...node.dialogue,
          ...updates,
        },
      },
    });
  }, [getCurrentScene, updateCurrentScene]);

  // 선택지 키 참조 업데이트
  const updateChoiceKeyReference = useCallback((nodeKey: string, choiceKey: string, newKeyRef: string) => {
    const currentSceneData = getCurrentScene();
    const node = currentSceneData[nodeKey];
    
    if (!node || node.dialogue.type !== "choice") return;

    const updatedChoices = { ...node.dialogue.choices };
    if (updatedChoices[choiceKey]) {
      updatedChoices[choiceKey] = {
        ...updatedChoices[choiceKey],
        textKeyRef: newKeyRef,
      };
    }

    updateCurrentScene({
      ...currentSceneData,
      [nodeKey]: {
        ...node,
        dialogue: {
          ...node.dialogue,
          choices: updatedChoices,
        },
      },
    });
  }, [getCurrentScene, updateCurrentScene]);

  return {
    updateNodeText,
    updateChoiceText,
    addChoice,
    removeChoice,
    updateDialogue,
    updateNodeKeyReference,
    updateChoiceKeyReference,
  };
}; 