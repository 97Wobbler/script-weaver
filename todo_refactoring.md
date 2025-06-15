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

#### 1단계: 기존 editorStore.ts 분석 및 도메인 식별
**목표**: 현재 editorStore의 책임들을 도메인별로 분류
**작업**:
- [ ] 1. editorStore.ts의 모든 상태와 메서드를 나열
- [ ] 2. 다음 도메인으로 분류:
   - [ ] **Node Domain**: 노드 CRUD, 선택, 이동
   - [ ] **History Domain**: Undo/Redo, 상태 스냅샷
   - [ ] **Layout Domain**: 정렬, 위치 계산
   - [ ] **UI Domain**: 토스트, 모달, 로딩 상태
   - [ ] **Project Domain**: 템플릿, 씬, Import/Export
- [ ] 3. 각 도메인별 예상 라인 수 계산

#### 2단계: 도메인별 Store 생성
**목표**: 각 도메인마다 독립적인 Zustand Store 생성
**작업**:
- [ ] 1. `src/stores/nodeStore.ts` 생성
   - [ ] 노드 상태: `nodes`, `selectedNodeKey`, `selectedNodeKeys`
   - [ ] 노드 액션: `addNode`, `updateNode`, `deleteNode`, `selectNode`
   - [ ] 예상 크기: ~200줄

- [ ] 2. `src/stores/historyStore.ts` 생성
   - [ ] 히스토리 상태: `history`, `historyIndex`, `isUndoRedoInProgress`
   - [ ] 히스토리 액션: `pushToHistory`, `undo`, `redo`
   - [ ] 예상 크기: ~150줄

- [ ] 3. `src/stores/layoutStore.ts` 생성
   - [ ] 레이아웃 상태: `lastNodePosition`, `layoutInProgress`
   - [ ] 레이아웃 액션: `arrangeNodes`, `updateNodePosition`
   - [ ] 예상 크기: ~150줄

- [ ] 4. `src/stores/uiStore.ts` 생성
   - [ ] UI 상태: `toastMessage`, `isLoading`, `modals`
   - [ ] UI 액션: `showToast`, `setLoading`, `openModal`
   - [ ] 예상 크기: ~100줄

- [ ] 5. `src/stores/projectStore.ts` 생성
   - [ ] 프로젝트 상태: `templateData`, `currentTemplate`, `currentScene`
   - [ ] 프로젝트 액션: `setTemplate`, `setScene`, `importData`
   - [ ] 예상 크기: ~100줄

#### 3단계: 서비스 레이어 정리
**목표**: Store에 의존하지 않는 순수 함수로 비즈니스 로직 분리
**작업**:
- [ ] 1. 기존 서비스들을 순수 함수로 변경
- [ ] 2. Store 참조 제거, 매개변수로 필요한 데이터만 받기
- [ ] 3. 각 서비스가 해당 도메인의 Store와만 연결되도록 설계

#### 4단계: React 훅 레이어 생성
**목표**: 컴포넌트와 Store 사이의 중간 레이어 제공
**작업**:
- [ ] 1. `src/hooks/useNodes.ts`: 노드 관련 모든 로직 캡슐화
- [ ] 2. `src/hooks/useHistory.ts`: 히스토리 관련 로직 캡슐화
- [ ] 3. `src/hooks/useLayout.ts`: 레이아웃 관련 로직 캡슐화

#### 5단계: 기존 컴포넌트 마이그레이션
**목표**: 기존 컴포넌트들이 새로운 훅을 사용하도록 변경
**작업**:
- [ ] `useEditorStore` 사용 부분을 새로운 훅들로 교체
- [ ] 점진적 마이그레이션으로 안정성 확보
- [ ] PropertyPanel.tsx 분리: UI 컴포넌트 과부하 해결
- [ ] App.tsx 분리: 루트 컴포넌트 책임 분리
- [ ] Canvas.tsx 분리: 캔버스 로직 세분화

#### 6단계: 기타 작업
- [ ] 목표 아키텍처에 맞게 파일 이름 및 디렉토리 구조 변경

## 🎯 성공 기준

- **라인 수**: 총 ~700줄 (5개 store × 140줄 평균)
- **복잡도**: 각 파일이 단일 책임만 가짐
- **테스트 용이성**: 각 도메인별 독립 테스트 가능
- **확장성**: 새 기능 추가 시 해당 도메인만 수정
- **의존성**: 순환 의존성 완전 제거

---

## ⚠️ 주의사항

1. **기존 기능 보존**: 리팩터링 과정에서 기능 손실 없도록 주의
2. **점진적 마이그레이션**: 한 번에 모든 것을 바꾸지 말고 단계별 진행
3. **타입 안전성**: TypeScript 타입 정의를 먼저 완성하고 구현
4. **테스트**: 각 단계마다 기존 기능이 정상 작동하는지 확인

---

**최종 목표**: Phase 3 폴리싱 & Post-MVP 확장 준비를 위한 코드베이스 안정화
**기대 효과**: 전체 코드베이스 ~20% 축소, 유지보수성 300% 향상, 확장성 확보