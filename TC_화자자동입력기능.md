# 테스트 케이스: 화자 자동 입력 기능 ✅ **완료**

## 📋 테스트 범위
- **기능**: 핸들 클릭으로 새 노드 생성 시 부모 노드의 화자 정보 자동 복사
- **상태**: ✅ **완료** - todo.md에서 완료 표시됨
- **대상 함수**: `createAndConnectChoiceNode()`, `createAndConnectTextNode()`
- **구현된 요구사항**: 
  - 화자가 있는 모든 노드는 자식 노드 생성 시 화자 자동 복사
  - `speakerText`와 `speakerKeyRef` 모두 복사
  - 화자가 없는 노드는 해당 없음
  - UX 향상: 연속 대사 입력 시 화자 재입력 불필요

---

## TC-SPEAKER-001: TextNode → TextNode 화자 복사

### 전제 조건
- Canvas에 TextNode 1개 존재
- 화자: "홍길동" (speakerText: "홍길동", speakerKeyRef: "npc_1")
- 내용: "안녕하세요"
- 자식 노드 없음

### 테스트 단계
1. 부모 TextNode의 우측 핸들 클릭
2. 새 TextNode 생성 확인
3. 새 노드의 화자 정보 확인

### 예상 결과
- **새 노드 speakerText**: "홍길동" (부모와 동일)
- **새 노드 speakerKeyRef**: "npc_1" (부모와 동일)
- **새 노드 contentText**: "" (빈 문자열)
- **PropertyPanel 표시**: 화자 필드에 "홍길동" 자동 입력됨

### 실제 결과
- [ ] 통과 / [ ] 실패
- 복사된 화자: "___"
- 복사된 키: "___"
- 비고: ___________

---

## TC-SPEAKER-002: ChoiceNode → TextNode 화자 복사

### 전제 조건
- Canvas에 ChoiceNode 1개 존재
- 화자: "김철수" (speakerText: "김철수", speakerKeyRef: "npc_2")
- 선택지 2개: ["좋아요", "싫어요"]
- 자식 노드 없음

### 테스트 단계
1. 첫 번째 선택지 핸들 클릭
2. 새 TextNode 생성 확인
3. 새 노드의 화자 정보 확인

### 예상 결과
- **새 노드 speakerText**: "김철수" (부모와 동일)
- **새 노드 speakerKeyRef**: "npc_2" (부모와 동일)
- **연결 상태**: 첫 번째 선택지 → 새 노드 연결
- **PropertyPanel**: 화자 필드에 "김철수" 표시

### 실제 결과
- [ ] 통과 / [ ] 실패
- 복사된 화자: "___"
- 복사된 키: "___"
- 비고: ___________

---

## TC-SPEAKER-003: ChoiceNode → ChoiceNode 화자 복사

### 전제 조건
- Canvas에 ChoiceNode 1개 존재
- 화자: "이영희" (speakerText: "이영희", speakerKeyRef: "npc_3")
- 선택지 1개: ["다음으로"]

### 테스트 단계
1. 노드 타입을 ChoiceNode로 변경하여 핸들 클릭
2. 새 ChoiceNode 생성 확인
3. 새 노드의 화자 정보 확인

### 예상 결과
- **새 노드 speakerText**: "이영희" (부모와 동일)
- **새 노드 speakerKeyRef**: "npc_3" (부모와 동일)
- **새 노드 choices**: {} (빈 객체)
- **노드 타입**: ChoiceDialogue

### 실제 결과
- [ ] 통과 / [ ] 실패
- 복사된 화자: "___"
- 복사된 키: "___"
- 비고: ___________

---

## TC-SPEAKER-004: 화자 없는 노드에서 자식 생성

### 전제 조건
- Canvas에 TextNode 1개 존재
- 화자: "" (빈 문자열, speakerKeyRef: undefined)
- 내용: "나레이션입니다"

### 테스트 단계
1. 해당 TextNode의 우측 핸들 클릭
2. 새 TextNode 생성 확인
3. 새 노드의 화자 정보 확인

### 예상 결과
- **새 노드 speakerText**: "" (빈 문자열)
- **새 노드 speakerKeyRef**: undefined
- **PropertyPanel**: 화자 필드 비어있음
- **정상 생성**: 화자 없어도 노드 정상 생성

### 실제 결과
- [ ] 통과 / [ ] 실패
- 복사된 화자: "___"
- 복사된 키: "___"
- 비고: ___________

---

## TC-SPEAKER-005: 키 참조 무결성 확인

### 전제 조건
- Canvas에 TextNode 1개 존재
- 화자: "박민수" (speakerText: "박민수", speakerKeyRef: "npc_4")
- LocalizationStore에 "npc_4" → "박민수" 매핑 존재

### 테스트 단계
1. 해당 TextNode의 우측 핸들 클릭
2. 새 TextNode 생성 확인
3. LocalizationStore에서 키 사용 개수 확인
4. PropertyPanel에서 키 표시 확인

### 예상 결과
- **새 노드**: 동일한 키 참조 (npc_4)
- **키 사용 개수**: 2개 (부모 + 새 노드)
- **PropertyPanel**: "2개 사용 중" 표시
- **텍스트 일관성**: 두 노드 모두 "박민수" 표시

### 실제 결과
- [ ] 통과 / [ ] 실패
- 키 사용 개수: ___개
- PropertyPanel 표시: "___"
- 비고: ___________

---

## TC-SPEAKER-006: 연속 생성에서 화자 전파

### 전제 조건
- Canvas에 TextNode 1개 존재
- 화자: "주인공" (speakerText: "주인공", speakerKeyRef: "npc_5")

### 테스트 단계
1. 첫 번째 자식 노드 생성 (A → B)
2. 두 번째 자식 노드 생성 (B → C)
3. 세 번째 자식 노드 생성 (C → D)
4. 모든 노드의 화자 정보 확인

### 예상 결과
- **노드 A**: 화자 "주인공"
- **노드 B**: 화자 "주인공" (A에서 복사)
- **노드 C**: 화자 "주인공" (B에서 복사)
- **노드 D**: 화자 "주인공" (C에서 복사)
- **연결 체인**: A → B → C → D

### 실제 결과
- [ ] 통과 / [ ] 실패
- 노드 B 화자: "___"
- 노드 C 화자: "___"
- 노드 D 화자: "___"
- 비고: ___________

---

## TC-SPEAKER-007: ChoiceNode 다중 선택지에서 화자 복사

### 전제 조건
- Canvas에 ChoiceNode 1개 존재
- 화자: "상점주인" (speakerText: "상점주인", speakerKeyRef: "npc_6")
- 선택지 3개: ["구매", "판매", "나가기"]

### 테스트 단계
1. "구매" 선택지 핸들 클릭 → 노드 A 생성
2. "판매" 선택지 핸들 클릭 → 노드 B 생성  
3. "나가기" 선택지 핸들 클릭 → 노드 C 생성
4. 모든 새 노드의 화자 확인

### 예상 결과
- **노드 A 화자**: "상점주인"
- **노드 B 화자**: "상점주인"
- **노드 C 화자**: "상점주인"
- **키 사용 개수**: 4개 (부모 + 자식 3개)
- **연결 독립성**: 각 선택지별로 독립적 연결

### 실제 결과
- [ ] 통과 / [ ] 실패
- 노드 A 화자: "___"
- 노드 B 화자: "___"
- 노드 C 화자: "___"
- 비고: ___________

---

## 🔍 테스트 실행 방법

### 수동 테스트
1. 브라우저에서 애플리케이션 실행
2. 각 TC별로 노드 생성 및 화자 설정
3. 핸들 클릭 후 새 노드의 PropertyPanel 확인
4. LocalizationStore 키 사용 개수 확인

### 자동화 가능 영역
```javascript
// 콘솔에서 화자 정보 확인 헬퍼 함수
function checkNodeSpeaker(nodeKey) {
  const editorStore = useEditorStore.getState();
  const currentScene = editorStore.templateData[editorStore.currentTemplate]?.[editorStore.currentScene];
  const node = currentScene?.[nodeKey];
  
  if (node) {
    console.log(`Node ${nodeKey}:`);
    console.log(`  speakerText: "${node.dialogue.speakerText}"`);
    console.log(`  speakerKeyRef: "${node.dialogue.speakerKeyRef}"`);
    return {
      speakerText: node.dialogue.speakerText,
      speakerKeyRef: node.dialogue.speakerKeyRef
    };
  }
  return null;
}

// LocalizationStore 키 사용 개수 확인
function checkKeyUsage(keyRef) {
  const localizationStore = useLocalizationStore.getState();
  const count = localizationStore.getKeyUsageCount(keyRef);
  console.log(`Key "${keyRef}" usage count: ${count}`);
  return count;
}
```

---

## 📊 테스트 결과 요약

| TC ID | 테스트 케이스 | 상태 | 비고 |
|-------|--------------|------|------|
| TC-SPEAKER-001 | TextNode → TextNode | ⬜ | |
| TC-SPEAKER-002 | ChoiceNode → TextNode | ⬜ | |
| TC-SPEAKER-003 | ChoiceNode → ChoiceNode | ⬜ | |
| TC-SPEAKER-004 | 화자 없는 노드 | ⬜ | |
| TC-SPEAKER-005 | 키 참조 무결성 | ⬜ | |
| TC-SPEAKER-006 | 연속 생성 전파 | ⬜ | |
| TC-SPEAKER-007 | 다중 선택지 복사 | ⬜ | |

**총 테스트**: 7개  
**통과**: ___개  
**실패**: ___개  
**통과율**: ___% 