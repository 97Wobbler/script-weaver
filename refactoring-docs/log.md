# 📊 Script Weaver 리팩터링 진행 로그

**프로젝트**: editorStore.ts God Object 해소  
**시작일**: 2025-06-16  
**관련 문서**: [리팩터링 계획 v2.0](./todo_refactoring_v2.md)

---

## 📋 프로젝트 개요

### 목표

-   **주 목표**: God Object 패턴 해소 (단일 파일 2,941줄 → 적정 크기 분할)
-   **구조 목표**: 명확한 책임 분리 및 도메인별 분할
-   **품질 목표**: 이해하기 쉽고, 수정하기 쉽고, 테스트하기 쉬운 구조

### 성공 기준

-   최대 파일 500줄 이하
-   평균 메서드 30줄 이하, 최대 50줄 이하
-   5개 명확한 도메인 분리
-   순환 의존성 0개
-   TypeScript 에러 0개

---

## 기록 방법

-   작업 Phase와 태스크 제목을 먼저 기록한다. (Phase 0-1 완전 롤백, Phase 3-2 타입 정의 강화)
-   LLM이 시간 조회에 어려움이 있을 수 있으므로, terminal 코드로 현재 시간을 조회하여 작업 종료 시간을 같이 기록한다.
-   진행 내용은 1~3줄 이내로, 간단하게 작업 내용을 요약하여 작성한다.
-   추후에 참고해야 할 내용은 가감없이 기록한다.

---

## 🕒 진행 상황 타임라인

### **Phase 0-2: 현재 상태 완전 분석** (2025-06-20 08:08 ~ 08:36)

**완료 작업**: editorStore.ts 내 모든 메서드 목록 및 크기 조사, 도메인 경계 식별, 의존성 관계 파악

#### 📊 **주요 분석 결과**

**1. 파일 규모**
- **총 라인 수**: 2,941줄 (목표: 500줄 이하로 분할)
- **총 메서드 수**: 44개 (인터페이스 정의 기준)
- **God Object 확인**: 단일 파일에 모든 기능 집중된 상태

**2. 대형 메서드 목록** (50줄 이상)
```
arrangeAllNodesAsTree  : 2168~2324 (155줄) - 전체 트리 정렬
arrangeChildNodesAsTree: 2025~2165 (141줄) - 트리 정렬
arrangeAllNodes        : 2535~2655 (121줄) - 전체 레이아웃 정렬
pasteNodes             : 585~699   (115줄) - 복사/붙여넣기 로직  
calculateChildNodePosition: 1808~1920 (113줄) - 자식 위치 계산
deleteSelectedNodes    : 724~834   (110줄) - 다중 노드 삭제 로직
createAndConnectChoiceNode: 1513~1619 (107줄) - 노드 생성/연결
arrangeSelectedNodeDescendants: 2759~2866 (107줄) - 후손 노드 정렬
createAndConnectTextNode: 1620~1723 (104줄) - 노드 생성/연결
arrangeSelectedNodeChildren: 2657~2755 (99줄) - 자식 노드 정렬
deleteNode             : 904~992   (90줄)  - 단일 노드 삭제
moveNode               : 993~1072  (80줄)  - 노드 위치 이동
getNextNodePosition    : 1735~1807 (80줄)  - 위치 계산
```

**3. 자연스러운 도메인 경계 식별**
```typescript
// === PROJECT DOMAIN === (프로젝트/씬 관리)
- templateData, currentTemplate, currentScene
- createTemplate, createScene, resetEditor
- loadFromLocalStorage, migrateToNewArchitecture

// === NODE DOMAIN === (노드 CRUD 및 내용 관리)  
- selectedNodeKey, selectedNodeKeys, lastDraggedNodeKey
- addNode, updateNode, deleteNode, moveNode
- updateDialogue, updateNodeText, updateChoiceText
- createTextNode, createChoiceNode, duplicateNode
- addChoice, removeChoice, connectNodes, disconnectNodes
- createAndConnectChoiceNode, createAndConnectTextNode

// === HISTORY DOMAIN === (실행취소/재실행)
- history, historyIndex, isUndoRedoInProgress
- currentCompoundActionId, compoundActionStartState
- pushToHistory, pushToHistoryWithTextEdit
- undo, redo, canUndo, canRedo
- startCompoundAction, endCompoundAction

// === LAYOUT DOMAIN === (노드 배치 및 정렬)
- lastNodePosition
- getNextNodePosition, calculateChildNodePosition
- arrangeChildNodesAsTree, arrangeAllNodesAsTree, arrangeNodesWithDagre
- arrangeAllNodes, arrangeSelectedNodeChildren, arrangeSelectedNodeDescendants

// === UI DOMAIN === (사용자 인터페이스 상태)
- showToast, toggleNodeSelection, clearSelection
- selectMultipleNodes, copySelectedNodes, pasteNodes
- deleteSelectedNodes, moveSelectedNodes
- updateNodeKeyReference, updateChoiceKeyReference
- updateNodeVisibility, updateNodePositionAndVisibility
```

**4. 컴포넌트 의존성 관계**
```
App.tsx - 8개 메서드: 기본 상태 + Import/Export + 검증
PropertyPanel.tsx - 11개 메서드: 텍스트 편집 + 키 관리 중심
Canvas.tsx - 18개 메서드: 선택/이동/단축키 중심  
TextNode.tsx - 4개 메서드: 연결/생성 중심
ChoiceNode.tsx - 4개 메서드: 연결/생성 중심

총 5개 컴포넌트가 44개 메서드 의존
```

**5. 메서드 간 상호 의존성**
- **높은 결합도**: Layout 메서드들이 Node 메서드들을 내부에서 직접 호출
- **순환 참조**: History와 다른 도메인 간 양방향 의존성
- **공통 상태 접근**: 모든 메서드가 templateData에 직접 접근

#### 🎯 **핵심 문제점**

1. **메서드 크기 초과**: 13개 메서드가 80줄 이상 (목표: 50줄 이하)
2. **단일 책임 위반**: 레이아웃 메서드 내부에 히스토리/검증 로직 혼재  
3. **높은 결합도**: 도메인 간 직접 호출로 분리 어려움
4. **공통 상태**: templateData 중심의 모든 도메인 의존성

#### 📋 **다음 단계 준비**

**Phase 1 대상 메서드** (50줄 이상 우선 분할):
1. arrangeAllNodesAsTree (155줄) - 최우선
2. arrangeChildNodesAsTree (141줄)  
3. arrangeAllNodes (121줄)
4. pasteNodes (115줄)
5. calculateChildNodePosition (113줄)
6. deleteSelectedNodes (110줄)
7. createAndConnectChoiceNode (107줄)
8. arrangeSelectedNodeDescendants (107줄)
9. createAndConnectTextNode (104줄)
10. arrangeSelectedNodeChildren (99줄)
11. deleteNode (90줄)
12. moveNode (80줄)
13. getNextNodePosition (80줄)

**예상 분할 후 파일 수**: 5-7개 도메인 파일 + 1개 통합 파일
**목표 달성 가능성**: 높음 (명확한 도메인 경계 존재)

### **Phase 1-2: 대형 메서드 분할** (2025-06-20 10:32 ~ 10:34)

**완료 작업**: `arrangeChildNodesAsTree` 메서드 분할 (2/13 완료)

#### 📊 **분할 결과**

**대상 메서드**: `arrangeChildNodesAsTree` (2029~2168줄, 141줄)
**분할 결과**: 1개 새 헬퍼 + 기존 헬퍼 재사용으로 분할 성공
- **메인 메서드**: `arrangeChildNodesAsTree` (19줄) ✅ 목표 달성 (50줄 이하)
- **새 헬퍼**: `_updateChildNodePositions` (44줄) ✅ 루트 노드 고정 버전
- **재사용 헬퍼**: `_buildNodeRelationMaps`, `_buildNodeLevelMap` 활용

#### 🎯 **분할 전략**

1. **헬퍼 재사용**: 기존에 만든 `_buildNodeRelationMaps`, `_buildNodeLevelMap` 활용
2. **차별화 로직 분리**: 루트 노드 고정 로직을 `_updateChildNodePositions`로 추출  
3. **코드 중복 제거**: 141줄에서 80줄 제거 (57% 감소)
4. **메인 로직 단순화**: 4단계 명확한 흐름으로 가독성 향상

#### ✅ **성공 기준 달성**

- **메서드 크기**: 141줄 → 19줄 (86% 감소)
- **코드 재사용**: 기존 헬퍼 2개 재활용으로 중복 제거
- **단일 책임**: 루트 노드 고정 로직만 독립 추출
- **기능 보존**: 기존 기능 100% 보존 확인

#### 📋 **다음 대상**

**Phase 1-2 계속**: `arrangeAllNodes` (121줄) - 3순위 분할 대상

**예상 완료**: 13개 메서드 분할 중 2개 완료 (진행률: 15.4%)

---

### **Phase 1-2: 대형 메서드 분할** (2025-06-20 10:25 ~ 10:28)

**완료 작업**: `arrangeAllNodesAsTree` 메서드 분할 (1/13 완료)

#### 📊 **분할 결과**

**대상 메서드**: `arrangeAllNodesAsTree` (2168~2324줄, 155줄)
**분할 결과**: 4개 메서드로 분할 성공
- **메인 메서드**: `arrangeAllNodesAsTree` (39줄) ✅ 목표 달성 (50줄 이하)
- **헬퍼 1**: `_buildNodeRelationMaps` (30줄) ✅
- **헬퍼 2**: `_buildNodeLevelMap` (38줄) ✅  
- **헬퍼 3**: `_updateLevelNodePositions` (43줄) ✅

#### 🎯 **분할 전략**

1. **노드 관계 매핑 분리**: 자식-부모 관계 매핑 로직을 독립 함수로 추출
2. **BFS 레벨 계산 분리**: 노드 레벨 매핑 알고리즘을 별도 함수로 분리
3. **위치 업데이트 분리**: DOM 조작 및 상태 업데이트 로직을 독립 함수로 추출
4. **메인 로직 단순화**: 고수준 로직만 남겨 가독성 향상

#### ✅ **성공 기준 달성**

- **메서드 크기**: 155줄 → 39줄 (75% 감소)
- **단일 책임**: 각 헬퍼 메서드가 명확한 단일 책임 보유
- **가독성**: 메인 메서드에서 6단계 흐름으로 알고리즘 구조 명확화
- **기능 보존**: 기존 기능 100% 보존 확인
