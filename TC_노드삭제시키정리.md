# 테스트 케이스: 노드 삭제 시 키 정리 ⏳ **미구현**

## 📋 테스트 범위
- **기능**: 노드 삭제 시 해당 노드에서만 사용되는 LocalizationStore 키 자동 제거
- **상태**: ⏳ **미구현** - 향후 구현 예정
- **우선순위**: 중간 (레이아웃 엔진 완료 후 진행)
- **대상 함수**: `deleteNode()`, `deleteSelectedNodes()`
- **요구사항**: 
  - 노드 삭제 성공 이후에 그 노드에서만 사용되는 키 삭제
  - 다른 노드에서도 사용 중인 키는 보존
  - Undo 시 키도 함께 복원
  
## ⚠️ **구현 필요 사항**
이 기능은 아직 구현되지 않았습니다. 다음 단계에서 구현 예정:
1. LocalizationStore에 키 사용 추적 기능 추가
2. 노드 삭제 시 키 정리 로직 구현
3. Undo/Redo와 키 복원 연동

---

## TC-CLEANUP-001: 단독 사용 키 삭제 - TextNode

### 전제 조건
- Canvas에 TextNode 1개 존재 (nodeKey: "text_1")
- 화자: "독점화자" (speakerKeyRef: "npc_unique_1")
- 내용: "독점대사" (contentKeyRef: "line_unique_1") 
- LocalizationStore에 해당 키들만 존재 (다른 노드에서 미사용)

### 테스트 단계
1. nodeKey "text_1" 삭제 실행
2. 노드 삭제 확인
3. LocalizationStore에서 키 삭제 확인
4. 콘솔 로그 확인

### 예상 결과
- **노드 삭제**: "text_1" 노드 제거 성공
- **키 삭제**: "npc_unique_1", "line_unique_1" 키 삭제
- **콘솔 로그**: "키 정리 완료: npc_unique_1, line_unique_1 삭제됨"
- **LocalizationStore**: 해당 키들 존재하지 않음

### 실제 결과
- [ ] 통과 / [ ] 실패
- 삭제된 키: [___]
- 콘솔 메시지: "___"
- 비고: ___________

---

## TC-CLEANUP-002: 공유 사용 키 보존 - 다중 노드

### 전제 조건
- Canvas에 TextNode 2개 존재 (nodeKey: "text_1", "text_2")
- 두 노드 모두 같은 화자: "공통화자" (speakerKeyRef: "npc_shared_1")
- 노드1 내용: "첫 번째 대사" (contentKeyRef: "line_1")
- 노드2 내용: "두 번째 대사" (contentKeyRef: "line_2")

### 테스트 단계
1. nodeKey "text_1" 삭제 실행
2. 노드 삭제 확인
3. LocalizationStore 키 상태 확인
4. 남은 노드의 화자 표시 확인

### 예상 결과
- **노드 삭제**: "text_1" 노드만 제거
- **키 보존**: "npc_shared_1" 키는 삭제되지 않음 (text_2에서 사용 중)
- **키 삭제**: "line_1" 키는 삭제됨 (text_1에서만 사용)
- **콘솔 로그**: "키 정리 완료: line_1 삭제됨"
- **text_2 노드**: 화자 "공통화자" 정상 표시

### 실제 결과
- [ ] 통과 / [ ] 실패
- 보존된 키: [___]
- 삭제된 키: [___]
- 비고: ___________

---

## TC-CLEANUP-003: ChoiceNode 삭제 - 선택지 키 정리

### 전제 조건
- Canvas에 ChoiceNode 1개 존재 (nodeKey: "choice_1")
- 화자: "선택화자" (speakerKeyRef: "npc_choice_1")
- 선택지 3개: 
  - "선택1" (choiceKeyRef: "choice_option_1")
  - "선택2" (choiceKeyRef: "choice_option_2") 
  - "선택3" (choiceKeyRef: "choice_option_3")
- 모든 키가 해당 노드에서만 사용됨

### 테스트 단계
1. nodeKey "choice_1" 삭제 실행
2. 노드 삭제 확인
3. LocalizationStore에서 모든 관련 키 삭제 확인
4. 콘솔 로그에서 삭제된 키 목록 확인

### 예상 결과
- **노드 삭제**: "choice_1" 노드 제거 성공
- **키 삭제**: "npc_choice_1", "choice_option_1", "choice_option_2", "choice_option_3" 모두 삭제
- **콘솔 로그**: 4개 키 삭제 메시지
- **LocalizationStore**: 해당 키들 모두 제거

### 실제 결과
- [ ] 통과 / [ ] 실패
- 삭제된 키 개수: ___개
- 삭제된 키 목록: [___]
- 비고: ___________

---

## TC-CLEANUP-004: 다중 노드 삭제 - deleteSelectedNodes

### 전제 조건
- Canvas에 노드 3개 존재: "text_1", "text_2", "choice_1"
- text_1: 독점 키 2개 ("npc_1", "line_1")
- text_2: 공유 키 1개 + 독점 키 1개 ("npc_shared", "line_2")
- choice_1: 공유 키 1개 + 독점 키 2개 ("npc_shared", "choice_a", "choice_b")

### 테스트 단계
1. text_1, text_2 선택 (Ctrl+Click)
2. deleteSelectedNodes() 실행
3. 키 정리 결과 확인
4. choice_1 노드 상태 확인

### 예상 결과
- **노드 삭제**: text_1, text_2 제거
- **독점 키 삭제**: "npc_1", "line_1", "line_2" 삭제
- **공유 키 보존**: "npc_shared" 보존 (choice_1에서 사용 중)
- **choice_1**: 화자 "npc_shared" 정상 표시
- **콘솔 로그**: 삭제된 키 목록 출력

### 실제 결과
- [ ] 통과 / [ ] 실패
- 삭제된 키: [___]
- 보존된 키: [___]
- 비고: ___________

---

## TC-CLEANUP-005: Undo 기능 - 키 복원

### 전제 조건
- Canvas에 TextNode 1개 존재 (nodeKey: "text_1")
- 독점 키 2개: "npc_undo_1", "line_undo_1"
- Undo 히스토리 존재

### 테스트 단계
1. 노드 삭제 실행 (키도 함께 삭제됨)
2. 삭제 완료 확인
3. Ctrl+Z로 Undo 실행
4. 노드 및 키 복원 확인

### 예상 결과
- **삭제 후**: 노드 및 키 모두 제거
- **Undo 후**: 
  - 노드 "text_1" 복원
  - 키 "npc_undo_1", "line_undo_1" 복원
  - LocalizationStore에 키 다시 존재
  - PropertyPanel에서 정상 표시

### 실제 결과
- [ ] 통과 / [ ] 실패
- 복원된 노드: ___
- 복원된 키: [___]
- 비고: ___________

---

## TC-CLEANUP-006: Edge Case - 빈 키 참조 처리

### 전제 조건
- Canvas에 TextNode 1개 존재
- speakerKeyRef: undefined, contentKeyRef: undefined
- speakerText: "", contentText: "직접 입력 텍스트"

### 테스트 단계
1. 해당 노드 삭제 실행
2. 키 정리 로직 실행 확인
3. 오류 발생 여부 확인

### 예상 결과
- **노드 삭제**: 정상 삭제
- **키 정리**: 삭제할 키가 없음 (undefined 키 무시)
- **콘솔 로그**: "키 정리 완료: 삭제할 키 없음" 또는 유사 메시지
- **오류 없음**: 에러 발생하지 않음

### 실제 결과
- [ ] 통과 / [ ] 실패
- 콘솔 메시지: "___"
- 오류 발생: [ ] 예 / [ ] 아니오
- 비고: ___________

---

## TC-CLEANUP-007: 복잡한 시나리오 - 연결된 노드들 삭제

### 전제 조건
- Canvas에 연결된 노드 체인: A → B → C
- 각 노드마다 고유 키 + 일부 공유 키 존재
- A: "npc_shared" (공유), "line_a" (독점)
- B: "npc_shared" (공유), "line_b" (독점)  
- C: "npc_unique" (독점), "line_c" (독점)

### 테스트 단계
1. 노드 B만 삭제
2. 키 정리 결과 확인
3. A, C 노드 상태 확인
4. 연결 상태 확인

### 예상 결과
- **노드 삭제**: B 노드만 제거
- **키 삭제**: "line_b" 삭제
- **키 보존**: "npc_shared" 보존 (A에서 사용), "npc_unique", "line_c" 보존 (C에서 사용)
- **연결 상태**: A → C 연결 해제 (B가 중간 연결점이었음)

### 실제 결과
- [ ] 통과 / [ ] 실패
- 삭제된 키: [___]
- 보존된 키: [___]
- 연결 상태: ___
- 비고: ___________

---

## 🔍 테스트 실행 방법

### 수동 테스트
1. 브라우저에서 애플리케이션 실행
2. 개발자 도구 Console 탭 열기
3. 각 TC별로 노드 생성 및 삭제 실행
4. LocalizationStore 상태 및 콘솔 로그 확인

### 자동화 가능 영역
```javascript
// 콘솔에서 LocalizationStore 상태 확인 헬퍼 함수
function checkLocalizationStore() {
  const store = useLocalizationStore.getState();
  console.log("Current LocalizationStore:", store.keyValueMap);
  return store.keyValueMap;
}

// 특정 키 존재 여부 확인
function checkKeyExists(keyRef) {
  const store = useLocalizationStore.getState();
  const exists = store.keyValueMap.hasOwnProperty(keyRef);
  console.log(`Key "${keyRef}" exists: ${exists}`);
  return exists;
}

// 노드에서 사용하는 모든 키 추출
function getNodeKeys(nodeKey) {
  const editorStore = useEditorStore.getState();
  const currentScene = editorStore.templateData[editorStore.currentTemplate]?.[editorStore.currentScene];
  const node = currentScene?.[nodeKey];
  
  if (!node) return [];
  
  const keys = [];
  const dialogue = node.dialogue;
  
  if (dialogue.speakerKeyRef) keys.push(dialogue.speakerKeyRef);
  if (dialogue.contentKeyRef) keys.push(dialogue.contentKeyRef);
  
  if (dialogue.type === 'choice' && dialogue.choices) {
    Object.values(dialogue.choices).forEach(choice => {
      if (choice.choiceKeyRef) keys.push(choice.choiceKeyRef);
    });
  }
  
  console.log(`Node ${nodeKey} keys:`, keys);
  return keys;
}
```

---

## 📊 테스트 결과 요약

| TC ID | 테스트 케이스 | 상태 | 비고 |
|-------|--------------|------|------|
| TC-CLEANUP-001 | 단독 키 삭제 | ⬜ | |
| TC-CLEANUP-002 | 공유 키 보존 | ⬜ | |
| TC-CLEANUP-003 | ChoiceNode 키 정리 | ⬜ | |
| TC-CLEANUP-004 | 다중 노드 삭제 | ⬜ | |
| TC-CLEANUP-005 | Undo 키 복원 | ⬜ | |
| TC-CLEANUP-006 | 빈 키 참조 처리 | ⬜ | |
| TC-CLEANUP-007 | 복잡한 시나리오 | ⬜ | |

**총 테스트**: 7개  
**통과**: ___개  
**실패**: ___개  
**통과율**: ___% 