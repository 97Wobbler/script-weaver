# 🔄 Script Weaver 리팩터링 계획 v2.0 (실패 경험 기반 재설계)

**작성일**: 2025-06-16 14:35
**수정일**: 2025-06-19 19:30
**기반**: 첫 번째 리팩터링 실패 분석 결과
**목표**: editorStore.ts God Object 문제 해결 (현실적 접근)

---

## 📋 실패 경험에서 배운 교훈

### 🚨 첫 번째 시도의 핵심 실패 원인

1. **한 번에 너무 많은 변경**: editorStore 분리 + Hook 레이어 + 새 기능들
2. **불완전한 마이그레이션**: editorStore 제거 없이 새 시스템과 병존
3. **목표 이탈**: 코드 축소 목적이 기능 확장으로 변질
4. **검증 부족**: 각 단계별 효과 측정 및 롤백 계획 부재

### 💡 핵심 교훈

-   **단순성이 최우선**: 복잡한 아키텍처보다 단순하고 명확한 구조
-   **점진적 접근**: 작은 단위로 나누어 각각 검증하며 진행
-   **기능 고정**: 리팩터링 중 새 기능 추가 절대 금지
-   **측정 가능한 목표**: 구체적 성공 기준과 실패 시 롤백 계획

---

## 🎯 새로운 리팩터링 전략

### 핵심 원칙

1. **"One Thing at a Time"**: 한 번에 하나씩만 변경
2. **"Backward Compatible"**: 기존 기능 100% 보존
3. **"Measurable Progress"**: 각 단계마다 정량적 효과 측정
4. **"Rollback Ready"**: 언제든 이전 상태로 복원 가능

### 핵심 목표 (수정됨)

-   **주 목표**: God Object 패턴 해소 (단일 파일 2,941줄 → 적정 크기 분할)
-   **구조 목표**: 명확한 책임 분리 및 도메인별 분할
-   **품질 목표**: 이해하기 쉽고, 수정하기 쉽고, 테스트하기 쉬운 구조

---

## 📊 성공 지표

### 정량적 지표

1. **파일 크기**: 최대 파일 500줄 이하
2. **메서드 크기**: 평균 메서드 30줄 이하, 최대 50줄 이하
3. **도메인 분리**: 5개 명확한 도메인
4. **의존성**: 순환 의존성 0개
5. **타입 안전성**: TypeScript 에러 0개

### 정성적 지표

1. **이해 용이성**: 새로운 개발자가 각 도메인을 30분 내 파악 가능
2. **수정 용이성**: 기능 추가 시 1-2개 파일만 수정하면 됨
3. **테스트 용이성**: 각 도메인별 독립 테스트 작성 가능
4. **디버깅 용이성**: 문제 발생 시 관련 도메인 즉시 식별 가능

### 단계별 성공 기준

| Phase | 주요 목표       | 핵심 성공 기준        | 실패 시 조치   |
| ----- | --------------- | --------------------- | -------------- |
| **0** | 분석 & 롤백     | 깔끔한 출발점 확보    | -              |
| **1** | 메서드 정규화   | 최대 메서드 50줄 이하 | 이전 단계 복원 |
| **2** | 도메인 그룹핑   | 5개 도메인 명확 분류  | 이전 단계 복원 |
| **3** | 인터페이스 설계 | 타입 에러 0개         | 이전 단계 복원 |
| **4** | 파일 분할       | 순환 의존성 0개       | 이전 단계 복원 |
| **5** | 품질 향상       | 문서화 완료           | 선택적 적용    |

---

## 🛠️ 새로운 단계별 리팩터링 계획

### Phase 0: 코드 분석 및 롤백 (1주)

**목표**: 깔끔한 시작점 확보 및 실제 상황 파악

#### 0.1 완전 롤백

-   [x] git 관리 시스템으로 코드 롤백

#### 0.2 현재 상태 완전 분석

-   [-] editorStore.ts 내 모든 메서드 목록 및 크기 조사
-   [x] 자연스러운 도메인 경계 식별
-   [x] 실제 의존성 관계 파악 (어떤 컴포넌트가 어떤 메서드 사용)
-   [x] 메서드 간 상호 의존성 분석

**성공 기준**:

-   [x] editorStore.ts만 남고 모든 기능 정상 동작
-   [x] 깔끔한 출발점 확보

**분석 결과**:

-   2,941줄, 44개 메서드, 5개 명확한 도메인 확인
-   13개 대형 메서드(50줄+) 식별, 최대 155줄 메서드(arrangeAllNodesAsTree) 존재
-   컴포넌트별 의존성 매핑 완료 (상세 내용은 log.md 참조)

---

### Phase 1: 메서드 크기 정규화 (2주)

**목표**: 큰 메서드들을 이해하기 쉬운 크기로 분할 (파일 분할 X)

#### 1.1 메서드 크기 측정 및 분류

-   [x] [log.md](./log.md)에 분석된 메서드 크기 및 분류 등의 정보 확인
-   [x] 확인한 정보에 따라, 리팩토링 순서 결정

#### 1.2 대형 메서드 분할

**분할 전략**

0. **커밋 단위**: 메서드 단위로 작업 후 커밋, 사용자에게 검토 요청 후 다음 메서드 작업 시작
1. **단일 책임**: 각 메서드가 하나의 일만 담당하도록
2. **명명 규칙**: 메서드명으로 기능을 명확히 표현
3. **헬퍼 패턴**: 복잡한 로직은 private 헬퍼 메서드로 추출
4. **최대 크기**: 모든 public 메서드는 최대 50줄 이하로 분할

**주요 대상 정리** (log.md 기준 50줄+ 메서드, 라인 수 순)

-   [x] 메서드 분할 순서 명시
-   [ ] 한 메서드 단위로 작업 - 커밋 - 사용자 확인 반복
    -   [x] arrangeAllNodesAsTree (155줄) - 전체 트리 정렬 ✅ **완료 (39줄로 분할)**
    -   [x] arrangeChildNodesAsTree (141줄) - 트리 정렬 ✅ **완료 (19줄로 분할)**
    -   [x] arrangeAllNodes (121줄) - 전체 레이아웃 정렬 ✅ **완료 (22줄로 분할)**
    -   [x] pasteNodes (115줄) - 복사/붙여넣기 로직 ✅ **완료 (32줄로 분할)**
    -   [ ] calculateChildNodePosition (113줄) - 자식 위치 계산
    -   [ ] deleteSelectedNodes (110줄) - 다중 노드 삭제 로직
    -   [ ] createAndConnectChoiceNode (107줄) - 노드 생성/연결
    -   [ ] arrangeSelectedNodeDescendants (107줄) - 후손 노드 정렬
    -   [ ] createAndConnectTextNode (104줄) - 노드 생성/연결
    -   [ ] arrangeSelectedNodeChildren (99줄) - 자식 노드 정렬
    -   [ ] deleteNode (90줄) - 단일 노드 삭제
    -   [ ] moveNode (80줄) - 노드 위치 이동
    -   [ ] getNextNodePosition (80줄) - 위치 계산
-   [ ] 분할한 메서드 중에서, 공통 로직 추출 가능한 것들 찾아서 단순화

**성공 기준**:

-   모든 public 메서드 50줄 이하
-   메서드별 단일 책임 명확화
-   기능 100% 보존

**진행 상황**: **4/13 완료** (30.8%)

---

### Phase 2: 상태 및 메서드 도메인 그룹핑 (1주)

**목표**: 관련 있는 상태와 메서드들을 논리적으로 그룹화

#### 2.1 상태 그룹 정의

```typescript
// editorStore.ts 내에서 논리적 그룹핑 (주석으로 구분)
interface EditorState {
    // === PROJECT DOMAIN ===
    templateData: TemplateDialogues;
    currentTemplate: string;
    currentScene: string;

    // === NODE DOMAIN ===
    selectedNodeKey?: string;
    selectedNodeKeys: Set<string>;
    lastDraggedNodeKey: string | null;
    lastDragActionTime: number;

    // === HISTORY DOMAIN ===
    history: HistoryState[];
    historyIndex: number;
    isUndoRedoInProgress: boolean;
    currentCompoundActionId: string | null;
    compoundActionStartState: HistoryState | null;

    // === LAYOUT DOMAIN ===
    lastNodePosition: { x: number; y: number };

    // === UI DOMAIN ===
    showToast?: function;
}
```

#### 2.2 메서드 그룹핑

-   [ ] 각 도메인별 메서드 목록 정리
-   [ ] 도메인 간 의존성 파악
-   [ ] 분할 경계 최종 확정

**성공 기준**:

-   5개 도메인으로 명확히 분류
-   도메인 간 의존성 최소화
-   그룹별 응집도 최대화

---

### Phase 3: 인터페이스 설계 (1주)

**목표**: 도메인별 인터페이스 정의 (구현은 여전히 단일 클래스)

#### 3.1 도메인 인터페이스 정의

```typescript
// editorStore.ts 내에 인터페이스 정의
interface ProjectActions {
    // 프로젝트 관련 메서드들
}

interface NodeActions {
    // 노드 관련 메서드들
}

interface HistoryActions {
    // 히스토리 관련 메서드들
}

interface LayoutActions {
    // 레이아웃 관련 메서드들
}

interface UIActions {
    // UI 관련 메서드들
}
```

#### 3.2 타입 정의 강화

-   [ ] 각 도메인별 상태 타입 정의
-   [ ] 메서드 시그니처 명확화
-   [ ] 반환 타입 및 에러 처리 명시

**성공 기준**:

-   모든 메서드 타입 정의 완료
-   인터페이스 기반 코드 구조
-   TypeScript 에러 0개

---

### Phase 4: 물리적 파일 분할 (2주)

**목표**: 단일 파일을 도메인별 파일로 분할

#### 4.1 파일 분할 전략

```
src/store/
├── editorStore.ts              # 메인 스토어 (통합 인터페이스, ~200줄)
├── domains/
│   ├── projectDomain.ts        # 프로젝트 관련
│   ├── nodeDomain.ts          # 노드 관련
│   ├── historyDomain.ts       # 히스토리 관련
│   ├── layoutDomain.ts        # 레이아웃 관련
│   └── uiDomain.ts            # UI 관련
├── types/
│   └── editorTypes.ts         # 공통 타입 정의
└── (기존 파일들)
    ├── localizationStore.ts    # 유지
    └── asyncOperationManager.ts # 유지
```

#### 4.2 단계별 분할 진행

**Week 1**: 기반 구조

-   [ ] `types/editorTypes.ts` 생성
-   [ ] `domains/` 폴더 생성
-   [ ] 가장 독립적인 도메인부터 분리 (UI → Layout → History → Node → Project 순서)

**Week 2**: 통합 및 검증

-   [ ] editorStore.ts에서 각 도메인 통합
-   [ ] 모든 기능 정상 동작 확인
-   [ ] 성능 영향 측정

**성공 기준**:

-   각 파일이 단일 책임을 가짐
-   파일 간 순환 의존성 없음
-   기능 100% 보존
-   빌드 시간 영향 최소

---

### Phase 5: 코드 품질 향상 (1주)

**목표**: 리팩터링 마무리 및 품질 개선

#### 5.1 코드 정리

-   [ ] 중복 코드 제거
-   [ ] 사용하지 않는 import 정리
-   [ ] 일관된 코드 스타일 적용

#### 5.2 문서화

-   [ ] 각 도메인별 책임 명시
-   [ ] 핵심 메서드 JSDoc 추가
-   [ ] 사용 예시 작성

#### 5.3 검증 강화

-   [ ] 각 도메인별 기본 테스트 작성
-   [ ] 통합 테스트 추가
-   [ ] 리팩터링 전후 성능 비교

**성공 기준**:

-   코드 일관성 확보
-   핵심 기능 문서화 완료
-   기본적인 테스트 커버리지 확보

---

**다음 단계**: Phase 0 - 실제 코드 분석 시작
**예상 완료**: 2025년 7월 말 (약 6주)
**최종 검토**: 2025년 8월 초

**진행 상황**: [리팩터링 진행 로그](./refactoring_progress_log.md) 참조
