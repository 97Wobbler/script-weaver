import type { Scene, EditorNodeWrapper } from "../types/dialogue";
import { useLocalizationStore } from "../store/localizationStore";

/**
 * 키 정리 유틸리티 함수들
 * 
 * 노드 삭제 후 사용되지 않는 로컬라이제이션 키들을 정리하는 기능을 제공합니다.
 */

/**
 * 전체 씬을 스캔하여 미사용 키들을 정리합니다.
 * 이 방식이 더 안전하고 정확합니다.
 * 
 * @param currentScene - 현재 씬 데이터
 */
export function cleanupUnusedKeysAfterDeletion(currentScene: Scene | null): void {
  if (!currentScene) {
    return;
  }

  const localizationStore = useLocalizationStore.getState();
  const allKeysInStore = localizationStore.getAllKeys();
  const keysToDelete: string[] = [];
  
  // 각 키에 대해 현재 씬에서 실제 사용 여부 확인
  allKeysInStore.forEach((key) => {
    let isUsed = false;
    
    // 현재 씬의 모든 노드를 직접 스캔
    Object.values(currentScene).forEach((item) => {
      // 타입 가드: EditorNodeWrapper인지 확인
      const nodeWrapper = item as EditorNodeWrapper;
      if (!nodeWrapper || !nodeWrapper.dialogue) return;
      
      const dialogue = nodeWrapper.dialogue;
      
      // 화자 키 확인
      if (dialogue.speakerKeyRef === key) {
        isUsed = true;
        return;
      }
      
      // 텍스트 키 확인  
      if (dialogue.textKeyRef === key) {
        isUsed = true;
        return;
      }
      
      // 선택지 키 확인
      if (dialogue.type === "choice" && dialogue.choices) {
        Object.values(dialogue.choices).forEach((choice) => {
          if (choice && choice.textKeyRef === key) {
            isUsed = true;
            return;
          }
        });
      }
    });
    
    if (!isUsed) {
      keysToDelete.push(key);
    }
  });

  // 미사용 키 삭제 실행
  if (keysToDelete.length > 0) {
    keysToDelete.forEach((key) => {
      localizationStore.deleteKey(key);
    });
  }
} 