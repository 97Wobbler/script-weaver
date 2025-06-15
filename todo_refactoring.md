# 🧹 코드 정리 작업 계획 (Phase 2 완성 전 정리)

## 📋 이전 리팩터링 시도 분석 및 새로운 전략

### 🔍 이전 리팩터링 시도 요약
Script Weaver 프로젝트의 `src/store/editorStore.ts` 파일(2,940줄) 리팩터링을 시도했습니다.

**시도한 접근법:**
- [x] 점진적 메서드 분리: 개별 메서드들을 서비스 파일로 하나씩 분리
- [x] 기능별 서비스 생성: nodeService, historyService, clipboardService 등 10개 서비스 생성
- [x] 헬퍼 함수 분리: 유틸리티 함수들을 별도 파일로 이동
- [x] 상수 중앙화: 매직 넘버들을 constants.ts로 분리

**달성한 결과:**
- 2,940줄 → 1,571줄 (47% 축소)
- 12개의 서비스/유틸리티 모듈 생성

### ❌ 실패 원인 분석
1. **근본적 아키텍처 문제 미해결**: editorStore가 여전히 God Object로 남아있음
2. **지엽적 개선의 한계**: 개별 메서드 분리로는 전체 설계 개선 불가
3. **순환 의존성**: 서비스들이 editorStore를 참조하는 구조 유지
4. **일관성 부족**: 분리 기준이 명확하지 않아 책임 경계가 모호함
5. **복잡도 증가**: 기존 구조 유지하면서 패치하다 보니 오히려 복잡해짐

**결론: 점진적 개선으로는 한계가 있어 전면 재설계가 필요함**

---

## 🎯 새로운 전면 재설계 전략

### 핵심 원칙
1. **도메인 주도 설계(DDD)**: 비즈니스 도메인별로 Store 분리
2. **단일 책임 원칙(SRP)**: 각 Store는 하나의 관심사만 담당
3. **의존성 역전**: 서비스는 Store에 의존하지 않는 순수 함수
4. **계층 분리**: Store → Hook → Component 명확한 계층 구조

### 🏗️ 목표 아키텍처

```
src/
├── App.tsx                   # [기존] 메인 앱 컴포넌트 → 루트 레이아웃만 담당하도록 축소
├── main.tsx                  # [기존] 앱 진입점 → 유지
├── index.css                 # [기존] 전역 스타일 → 유지
├── App.css                   # [기존] 앱 스타일 → 유지
├── vite-env.d.ts            # [기존] Vite 타입 → 유지
├── store/
│   ├── editorStore.ts       # 점진적으로 제거 예정
│   ├── nodeStore.ts         # [신규] 노드 CRUD, 선택, 이동
│   ├── historyStore.ts      # [신규] Undo/Redo, 상태 스냅샷
│   ├── layoutStore.ts       # [신규] 정렬, 위치 계산
│   ├── uiStore.ts           # [신규] 토스트, 모달, 로딩 상태
│   ├── projectStore.ts      # [신규] 템플릿, 씬, Import/Export
│   └── localizationStore.ts # [기존→유지] 다국어 지원
├── services/                # [기존 utils/ → services/로 이름 변경]
│   ├── nodeService.ts       # [신규] 노드 비즈니스 로직
│   ├── layoutService.ts     # [기존 utils/layoutEngine.ts → 이동 및 분리]
│   ├── historyService.ts    # [신규] 히스토리 관리 로직
│   ├── validationService.ts # [신규] 데이터 검증 로직
│   ├── clipboardService.ts  # [신규] 클립보드 관련 로직
│   ├── importExportService.ts # [기존 utils/importExport.ts → 이동]
│   └── migrationService.ts  # [기존 utils/migration.ts → 이동]
├── managers/                # [신규 디렉토리] - 생명주기/상태 관리자
│   └── asyncOperationManager.ts # [기존 store/ → 이동] 비동기 작업 관리
├── hooks/                   # [신규 디렉토리]
│   ├── useNodes.ts          # [신규] 노드 관련 훅
│   ├── useHistory.ts        # [신규] 히스토리 관련 훅
│   ├── useLayout.ts         # [신규] 레이아웃 관련 훅
│   ├── useUI.ts             # [신규] UI 상태 관련 훅
│   └── useProject.ts        # [신규] 프로젝트 관련 훅
├── components/
│   ├── Canvas/              # [기존 Canvas.tsx → 디렉토리로 분할]
│   │   ├── Canvas.tsx       # 메인 캔버스 컴포넌트
│   │   ├── CanvasGrid.tsx   # 그리드 표시
│   │   ├── CanvasControls.tsx # 줌, 팬 컨트롤
│   │   └── ConnectionLine.tsx # 연결선 렌더링
│   ├── PropertyPanel/       # [기존 PropertyPanel.tsx → 디렉토리로 분할]
│   │   ├── PropertyPanel.tsx    # 메인 패널
│   │   ├── NodePropertyForm.tsx # 노드 속성 폼
│   │   ├── TemplateSelector.tsx # 템플릿 선택기
│   │   └── ExportPanel.tsx      # 내보내기 패널
│   ├── UI/                  # [신규] 공통 UI 컴포넌트
│   │   ├── Toast.tsx        # 토스트 알림
│   │   ├── Modal.tsx        # 모달 컴포넌트
│   │   ├── Button.tsx       # 버튼 컴포넌트
│   │   └── LoadingSpinner.tsx # 로딩 스피너
│   └── nodes/               # [기존] 노드 컴포넌트들
│       ├── BaseNode.tsx     # [신규] 기본 노드 컴포넌트
│       ├── TextNode.tsx     # [기존] 텍스트 노드
│       └── ChoiceNode.tsx   # [기존] 선택지 노드
├── models/                  # [신규 디렉토리] - 도메인 모델
│   ├── BaseDialogueNode.ts  # [신규] 기본 대화 노드 클래스
│   ├── TextDialogueNode.ts  # [types/dialogue.ts에서 이동]
│   └── ChoiceDialogueNode.ts # [types/dialogue.ts에서 이동]
├── factories/               # [신규 디렉토리] - 객체 생성 팩토리
│   └── nodeFactory.ts       # [신규] 노드 생성 팩토리
├── types/                   # [기존] 타입 정의
│   ├── dialogue.ts          # [기존→정리] 기본 인터페이스만 유지
│   ├── stores.ts            # [신규] Store 타입 정의
│   ├── services.ts          # [신규] Service 타입 정의
│   └── components.ts        # [신규] 컴포넌트 Props 타입
├── schemas/                 # [기존] 스키마 정의
│   └── dialogue.ts          # [기존→유지] Zod 스키마 정의
├── constants/               # [신규 디렉토리] - 상수 정의
│   ├── nodeTypes.ts         # [신규] 노드 타입 상수
│   ├── layouts.ts           # [신규] 레이아웃 관련 상수
│   └── ui.ts                # [신규] UI 관련 상수
└── assets/                  # [기존] 정적 자산 → 유지
```
---

### 📋 구체적인 작업 지시사항

#### 1단계: 기존 editorStore.ts 분석 및 도메인 식별 ✅
**목표**: 현재 editorStore의 책임들을 도메인별로 분류
**작업**:
- [x] 1. editorStore.ts의 모든 상태와 메서드를 나열
- [x] 2. 다음 도메인으로 분류:
   - [x] **Node Domain**: 노드 CRUD, 선택, 이동 (25개 메서드, ~1,200줄)
   - [x] **History Domain**: Undo/Redo, 상태 스냅샷 (8개 메서드, ~450줄)
   - [x] **Layout Domain**: 정렬, 위치 계산 (11개 메서드, ~800줄)
   - [x] **UI Domain**: 토스트, 모달, 로딩 상태 (1개 상태, ~50줄 + AsyncOperationManager 통합 필요)
   - [x] **Project Domain**: 템플릿, 씬, Import/Export (10개 메서드, ~300줄)
- [x] 3. 각 도메인별 예상 라인 수 계산

**📊 분석 결과 요약:**
- [./todo_refactoring_phase1_result.md](./todo_refactoring_phase1_result.md)에 정리되어 있음
- **총 상태**: 15개 (templateData, currentTemplate, selectedNodeKeys 등)
- **총 메서드**: 66개 
- **현재 총 라인 수**: 2,941줄
- **핵심 문제**: 단순 Store 분리만으로는 83% 라인 축소 불가능 → **3단계 분리 전략** 필요

#### 2단계: 3단계 분리 전략 적용 (수정됨)
**목표**: Store + Service + Hook 3단계 아키텍처로 책임 분리

**방법론**: **B. 하이브리드 접근법** (검증 완료 ✅)
- **전략**: Store 생성 → Hook 생성 → 테스트 → 다음 Store로 진행
- **장점**: 각 단계별 검증 가능, 점진적 통합, 안정성 확보
- **검증 결과**: useNodes Hook 완전 테스트 통과 (2025-06-15)
  - ✅ 노드 CRUD 기능
  - ✅ 선택 관리 (단일/다중)
  - ✅ 실시간 양방향 동기화
  - ✅ 무한 루프 방지 및 안정성 확보

**작업**:

**2-1. Store 레이어 (상태 관리만)**
- [x] 1. `src/store/nodeStore.ts` 생성 ✅
   - [x] 노드 상태: `nodes`, `selectedNodeKey`, `selectedNodeKeys`
   - [x] 기본 CRUD: `addNode`, `updateNode`, `deleteNode`, `getNode`
   - [x] 선택 관리: `setSelectedNode`, `toggleNodeSelection`, `clearSelection`, `selectMultipleNodes`
   - [x] 드래그 상태: `lastDraggedNodeKey`, `lastDragActionTime`
   - [x] 유틸리티: `hasNode`, `getNodeCount`, `getAllNodeKeys`, `getSelectedNodes`
   - [x] 실제 크기: 184줄 (예상 150줄 대비 123%)

- [x] 2. `src/store/historyStore.ts` 생성 ✅
   - [x] 히스토리 상태: `history`, `historyIndex`, `isUndoRedoInProgress`
   - [x] 복합 액션 관리: `currentCompoundActionId`, `compoundActionStartState`
   - [x] 기본 액션: `pushToHistory`, `undo`, `redo`, `canUndo`, `canRedo`
   - [x] 복합 액션: `startCompoundAction`, `endCompoundAction`, `cancelCompoundAction`
   - [x] 유틸리티: `getCurrentState`, `getHistorySize`, `trimHistory`, `clearHistory`
   - [x] 실제 크기: 220줄 (예상 120줄 대비 183%)

- [ ] 3. `src/store/layoutStore.ts` 생성 (다음 단계)
   - [ ] 레이아웃 상태: `lastNodePosition`, `layoutInProgress`
   - [ ] 기본 액션: `updateNodePosition`, `setLayoutInProgress`
   - [ ] 예상 크기: ~100줄
   - [ ] **진행 방법**: B 방법 적용 (Store → Hook → 테스트)

- [ ] 4. `src/store/uiStore.ts` 생성 (확장됨)
   - [ ] UI 상태: `toastMessage`, `isLoading`, `modals`, `errors`
   - [ ] UI 액션: `showToast`, `setLoading`, `openModal`, `showError`
   - [ ] AsyncOperationManager 기능 통합
   - [ ] 예상 크기: ~100줄
   - [ ] **진행 방법**: B 방법 적용 (Store → Hook → 테스트)

- [ ] 5. `src/store/projectStore.ts` 생성
   - [ ] 프로젝트 상태: `templateData`, `currentTemplate`, `currentScene`
   - [ ] 기본 액션: `setTemplate`, `setScene`, `updateTemplateData`
   - [ ] 예상 크기: ~130줄
   - [ ] **진행 방법**: B 방법 적용 (Store → Hook → 테스트)

**2-2. Service 레이어 (비즈니스 로직)**
- [ ] 1. `src/services/nodeService.ts` 생성
   - [ ] 복잡한 노드 생성 로직: `createTextNode`, `createChoiceNode`
   - [ ] 연결 관리: `connectNodes`, `disconnectNodes`, `createAndConnect*`
   - [ ] 복사/붙여넣기: `copyNodes`, `pasteNodes`, `duplicateNode`
   - [ ] 대화 수정: `updateDialogue`, `updateNodeText`, `updateChoiceText`
   - [ ] 예상 크기: ~400줄

- [ ] 2. `src/services/layoutService.ts` 생성  
   - [ ] 정렬 알고리즘: `arrangeNodes`, `calculatePositions`
   - [ ] 위치 계산: `getNextNodePosition`, `calculateChildNodePosition`
   - [ ] 기존 layoutEngine.ts 통합 및 확장
   - [ ] 예상 크기: ~300줄

- [ ] 3. `src/services/historyService.ts` 생성
   - [ ] 복합 액션 관리: `startCompoundAction`, `endCompoundAction`
   - [ ] 특수 히스토리: `pushToHistoryWithTextEdit`
   - [ ] 예상 크기: ~200줄

- [ ] 4. `src/services/projectService.ts` 생성
   - [ ] Import/Export: `exportToJSON`, `exportToCSV`, `importFromJSON`
   - [ ] 검증: `validateCurrentScene`, `validateAllData`
   - [ ] 템플릿/씬 관리: `createTemplate`, `createScene`
   - [ ] 마이그레이션: `migrateToNewArchitecture`
   - [ ] 예상 크기: ~250줄

**2-3. Hook 레이어 (컴포넌트 인터페이스)**
- [x] 1. `src/hooks/useNodes.ts`: Store + Service 조합 인터페이스 ✅
   - [x] nodeStore와 editorStore 통합 인터페이스 제공
   - [x] 양방향 동기화 기능 (syncFromEditor, syncToEditor)
   - [x] 통합 CRUD 및 선택 관리 API
   - [x] 실제 크기: 174줄 (예상 100줄 대비 174%)
   - [x] **검증 완료**: TestNodes 컴포넌트로 모든 기능 테스트 통과
- [ ] 2. `src/hooks/useHistory.ts`: 히스토리 관련 통합 인터페이스 (~80줄)
   - [ ] **진행 방법**: B 방법 적용 (historyStore 완성 후 Hook 생성 → 테스트)
- [ ] 3. `src/hooks/useLayout.ts`: 레이아웃 관련 통합 인터페이스 (~100줄)
   - [ ] **진행 방법**: B 방법 적용 (layoutStore 완성 후 Hook 생성 → 테스트)
- [ ] 4. `src/hooks/useProject.ts`: 프로젝트 관련 통합 인터페이스 (~80줄)
   - [ ] **진행 방법**: B 방법 적용 (projectStore 완성 후 Hook 생성 → 테스트)

#### 3단계: 의존성 해결 및 점진적 마이그레이션
**목표**: 순환 의존성 제거 및 안전한 전환
**작업**:
- [ ] 1. 의존성 계층 설계: Hook → Service → Store (단방향)
- [ ] 2. 복잡한 메서드 분해 (예: `arrangeAllNodes` → layoutService + historyService + nodeService 조합)
- [ ] 3. 기존 editorStore와 병행 운영하며 점진적 컴포넌트 마이그레이션
- [ ] 4. 타입 안전성 확보

#### 4단계: 기존 컴포넌트 마이그레이션
**목표**: 기존 컴포넌트들이 새로운 Hook을 사용하도록 변경
**작업**:
- [ ] `useEditorStore` 사용 부분을 새로운 훅들로 교체
- [ ] 점진적 마이그레이션으로 안정성 확보
- [ ] PropertyPanel.tsx 분리: UI 컴포넌트 과부하 해결
- [ ] App.tsx 분리: 루트 컴포넌트 책임 분리
- [ ] Canvas.tsx 분리: 캔버스 로직 세분화

#### 5단계: 정리 및 최적화
- [ ] 기존 editorStore.ts 완전 제거
- [ ] 목표 아키텍처에 맞게 파일 이름 및 디렉토리 구조 최종 정리
- [ ] 성능 최적화 및 타입 정의 완성

## 🎯 성공 기준

### **라인 수 목표 (현실적 추정)**
- **Store 레이어**: 총 ~600줄 (nodeStore 150 + historyStore 120 + layoutStore 100 + uiStore 100 + projectStore 130)
- **Service 레이어**: 총 ~1,150줄 (nodeService 400 + layoutService 300 + historyService 200 + projectService 250)
- **Hook 레이어**: 총 ~360줄 (4개 hook × 90줄 평균)
- **전체 합계**: ~2,110줄 (기존 2,941줄 대비 **28% 축소**)

### **품질 목표**
- **복잡도**: 각 파일이 단일 책임만 가짐 (평균 파일 크기 150줄 이하)
- **테스트 용이성**: 각 도메인별 독립 테스트 가능 (Service 레이어 순수 함수화)
- **확장성**: 새 기능 추가 시 해당 도메인만 수정 (계층별 책임 분리)
- **의존성**: 순환 의존성 완전 제거 (Hook → Service → Store 단방향)
- **유지보수성**: 코드 가독성 및 수정 용이성 대폭 향상

---

## ⚠️ 주의사항

1. **기존 기능 보존**: 리팩터링 과정에서 기능 손실 없도록 주의
2. **점진적 마이그레이션**: 한 번에 모든 것을 바꾸지 말고 단계별 진행
3. **타입 안전성**: TypeScript 타입 정의를 먼저 완성하고 구현
4. **테스트**: 각 단계마다 기존 기능이 정상 작동하는지 확인

---

**최종 목표**: Phase 3 폴리싱 & Post-MVP 확장 준비를 위한 코드베이스 안정화

**기대 효과**: 
- **코드 축소**: editorStore 2,941줄 → 3계층 분리 2,110줄 (28% 축소)
- **유지보수성**: 단일 책임 원칙 적용으로 버그 수정 및 기능 추가 용이성 대폭 향상
- **확장성**: 도메인별 독립적 확장 가능, 새 기능 추가 시 영향 범위 최소화
- **테스트**: 순수 함수 기반 Service 레이어로 단위 테스트 작성 용이성 확보
- **협업**: 도메인별 분리로 여러 개발자 동시 작업 시 충돌 최소화