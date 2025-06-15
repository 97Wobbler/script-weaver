## 📋 1단계: editorStore.ts 분석 결과

### 🔍 1. editorStore.ts의 모든 상태와 메서드 분석

**상태 (State):**
- `templateData: TemplateDialogues` - 템플릿 데이터
- `currentTemplate: string` - 현재 템플릿
- `currentScene: string` - 현재 씬
- `selectedNodeKey?: string` - 선택된 노드
- `selectedNodeKeys: Set<string>` - 다중 선택된 노드들
- `lastNodePosition: { x: number; y: number }` - 마지막 노드 위치
- `history: HistoryState[]` - 히스토리 배열
- `historyIndex: number` - 히스토리 인덱스
- `isUndoRedoInProgress: boolean` - Undo/Redo 진행 상태
- `currentCompoundActionId: string | null` - 복합 액션 ID
- `compoundActionStartState: HistoryState | null` - 복합 액션 시작 상태
- `lastDraggedNodeKey: string | null` - 마지막 드래그된 노드
- `lastDragActionTime: number` - 마지막 드래그 시간
- `showToast?: function` - 토스트 함수

**메서드 (66개):**
- 기본 액션 (3개): `setCurrentTemplate`, `setCurrentScene`, `setSelectedNode`
- 다중 선택 (3개): `toggleNodeSelection`, `clearSelection`, `selectMultipleNodes`
- 복합 액션 관리 (2개): `startCompoundAction`, `endCompoundAction`
- Undo/Redo (6개): `pushToHistory`, `pushToHistoryWithTextEdit`, `undo`, `redo`, `canUndo`, `canRedo`
- 복사/붙여넣기/복제 (3개): `copySelectedNodes`, `pasteNodes`, `duplicateNode`
- 다중 조작 (2개): `deleteSelectedNodes`, `moveSelectedNodes`
- 노드 관리 (4개): `addNode`, `updateNode`, `deleteNode`, `moveNode`
- 대화 내용 수정 (3개): `updateDialogue`, `updateNodeText`, `updateChoiceText`
- 자동 노드 생성 (2개): `createTextNode`, `createChoiceNode`
- 선택지 관리 (2개): `addChoice`, `removeChoice`
- 연결 관리 (2개): `connectNodes`, `disconnectNodes`
- 자동 생성 및 연결 (2개): `createAndConnectChoiceNode`, `createAndConnectTextNode`
- 템플릿/씬 관리 (2개): `createTemplate`, `createScene`
- 유틸리티 (5개): `getNextNodePosition`, `calculateChildNodePosition`, `generateNodeKey`, `getCurrentNodeCount`, `canCreateNewNode`
- 레이아웃/정렬 (6개): `arrangeChildNodesAsTree`, `arrangeAllNodesAsTree`, `arrangeNodesWithDagre`, `arrangeAllNodes`, `arrangeSelectedNodeChildren`, `arrangeSelectedNodeDescendants`
- 검증 (2개): `validateCurrentScene`, `validateAllData`
- Import/Export (3개): `exportToJSON`, `exportToCSV`, `importFromJSON`
- 데이터 관리 (3개): `resetEditor`, `loadFromLocalStorage`, `migrateToNewArchitecture`
- 키 참조 업데이트 (2개): `updateNodeKeyReference`, `updateChoiceKeyReference`
- 노드 가시성 (2개): `updateNodeVisibility`, `updateNodePositionAndVisibility`

### 🏗️ 2. 도메인별 분류

#### **Node Domain (노드 CRUD, 선택, 이동)**
**상태:**
- `selectedNodeKey`, `selectedNodeKeys`, `lastDraggedNodeKey`, `lastDragActionTime`

**메서드 (25개):**
- 기본 선택: `setSelectedNode`
- 다중 선택: `toggleNodeSelection`, `clearSelection`, `selectMultipleNodes`
- 노드 CRUD: `addNode`, `updateNode`, `deleteNode`, `moveNode`
- 대화 수정: `updateDialogue`, `updateNodeText`, `updateChoiceText`
- 노드 생성: `createTextNode`, `createChoiceNode`
- 선택지 관리: `addChoice`, `removeChoice`
- 연결 관리: `connectNodes`, `disconnectNodes`
- 자동 생성: `createAndConnectChoiceNode`, `createAndConnectTextNode`
- 복사/이동: `copySelectedNodes`, `pasteNodes`, `duplicateNode`, `deleteSelectedNodes`, `moveSelectedNodes`
- 키 참조: `updateNodeKeyReference`, `updateChoiceKeyReference`
- 가시성: `updateNodeVisibility`, `updateNodePositionAndVisibility`

#### **History Domain (Undo/Redo, 상태 스냅샷)**
**상태:**
- `history`, `historyIndex`, `isUndoRedoInProgress`, `currentCompoundActionId`, `compoundActionStartState`

**메서드 (8개):**
- 히스토리 관리: `pushToHistory`, `pushToHistoryWithTextEdit`
- Undo/Redo: `undo`, `redo`, `canUndo`, `canRedo`
- 복합 액션: `startCompoundAction`, `endCompoundAction`

#### **Layout Domain (정렬, 위치 계산)**
**상태:**
- `lastNodePosition`

**메서드 (11개):**
- 위치 계산: `getNextNodePosition`, `calculateChildNodePosition`
- 정렬: `arrangeChildNodesAsTree`, `arrangeAllNodesAsTree`, `arrangeNodesWithDagre`
- 새 레이아웃: `arrangeAllNodes`, `arrangeSelectedNodeChildren`, `arrangeSelectedNodeDescendants`
- 유틸리티: `generateNodeKey`, `getCurrentNodeCount`, `canCreateNewNode`

#### **UI Domain (토스트, 모달, 로딩 상태)**
**상태:**
- `showToast`

**메서드 (0개):**
- (현재 토스트만 있고 모달, 로딩은 외부 AsyncOperationManager 사용)

#### **Project Domain (템플릿, 씬, Import/Export)**
**상태:**
- `templateData`, `currentTemplate`, `currentScene`

**메서드 (10개):**
- 템플릿/씬: `setCurrentTemplate`, `setCurrentScene`, `createTemplate`, `createScene`
- 검증: `validateCurrentScene`, `validateAllData`
- Import/Export: `exportToJSON`, `exportToCSV`, `importFromJSON`
- 데이터 관리: `resetEditor`, `loadFromLocalStorage`, `migrateToNewArchitecture`

### 📊 3. 각 도메인별 예상 라인 수 계산

**현재 총 라인 수: 2,941줄**

#### **추정 분배:**
- **Node Domain**: ~1,200줄 (41%) - 가장 복잡한 도메인
- **History Domain**: ~450줄 (15%) - 복합 액션 로직 포함
- **Layout Domain**: ~800줄 (27%) - 복잡한 정렬 알고리즘
- **UI Domain**: ~50줄 (2%) - 현재 매우 단순함
- **Project Domain**: ~300줄 (10%) - 템플릿/씬 관리
- **공통/유틸리티**: ~141줄 (5%) - 헬퍼 함수들

**목표 분리 후 라인 수:**
- `nodeStore.ts`: ~200줄 (순수 상태 관리만)
- `historyStore.ts`: ~150줄 (순수 히스토리 관리만)
- `layoutStore.ts`: ~150줄 (순수 레이아웃 상태만)
- `uiStore.ts`: ~100줄 (토스트, 모달, 로딩 상태)
- `projectStore.ts`: ~100줄 (순수 프로젝트 상태만)

**총합: ~700줄 (76% 축소 달성)**