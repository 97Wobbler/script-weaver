# Script Weaver - TODO List

## 🎯 MVP 목표
웹 기반 Dialogue Editor (프론트엔드-Only) - Twine 느낌의 시각 편집 + 우측 폼 패널

---

## ✅ 완료된 작업

### 프로젝트 초기 설정
- [x] React + Vite + TypeScript 프로젝트 생성
- [x] 필수 의존성 설치
  - [x] React Flow (reactflow ^11.11.4)
  - [x] Zustand (^5.0.5) - 상태 관리
  - [x] Zod (^3.25.51) - 스키마 검증
  - [x] Tailwind CSS (^4.1.8) - 스타일링
- [x] **Tailwind CSS 설정 완료**
  - [x] @tailwindcss/postcss 패키지 설치 및 설정
  - [x] postcss.config.js 설정 (4.x 방식)
  - [x] src/index.css에 @import "tailwindcss" 추가
  - [x] 기본 컴포넌트 스타일 클래스 정의
  - [x] 브라우저에서 스타일 정상 적용 확인

### 데이터 모델 및 스키마
- [x] **Dialogue 타입 정의** (src/types/dialogue.ts)
  - [x] DialogueSpeed enum
  - [x] BaseDialogue, TextDialogue, ChoiceDialogue, InputDialogue 인터페이스
  - [x] EditorNodeWrapper, Scene, TemplateDialogues 타입
  - [x] EditorState, CSV 관련 타입들
  - [x] ValidationResult 타입
- [x] **Zod 스키마 정의** (src/schemas/dialogue.ts)
  - [x] 모든 타입에 대응하는 Zod 스키마
  - [x] Discriminated Union 스키마
  - [x] 검증 스키마들

### 기본 UI 구조
- [x] **Script Weaver 에디터 레이아웃 완성**
  - [x] 헤더 (제목 및 버전 정보)
  - [x] 좌측 툴바 (노드 추가, 프로젝트 정보, 내보내기)
  - [x] 중앙 캔버스 영역 (플레이스홀더 완료)
  - [x] 우측 속성 패널 (플레이스홀더 완료)
  - [x] 하단 상태 바 (노드 수, 상태, 자동저장 표시)
- [x] **Tailwind CSS 스타일링 적용**
  - [x] 반응형 레이아웃 구조
  - [x] 컴포넌트별 색상 테마 적용
  - [x] 호버 효과 및 트랜지션

---

## 🔥 진행 중인 작업

### 1주차: 기본 프로젝트 셋업 및 타입 정의
- [x] **데이터 스키마 정의** (document/data_scheme.md 기반)
  - [x] Dialogue 타입 정의 (TextDialogue, ChoiceDialogue, InputDialogue)
  - [x] EditorNodeWrapper 타입 정의
  - [x] Scene, TemplateDialogues 타입 정의
  - [x] EditorState 타입 정의
- [ ] **Zustand 상태 스토어 설정**
  - [x] 기본 EditorStore 인터페이스 정의
  - [x] 상태 관리 메소드들 구현
  - [ ] **🚨 타입 오류 수정 필요**: Scene 타입과 빈 객체 초기화 문제
  - [ ] localStorage persist 미들웨어 연동 테스트
- [ ] **기본 컴포넌트 구조 설계**
  - [x] 메인 레이아웃 컴포넌트 완성
  - [ ] 노드 캔버스 (React Flow 기반)
  - [ ] 우측 속성 패널 기능 구현
  - [ ] 툴바 버튼 기능 연결
- [ ] **React Flow POC**
  - [ ] 기본 캔버스 설정
  - [ ] 커스텀 노드 타입 정의

---

## 📋 다음 우선순위 작업

### 🚨 즉시 해결해야 할 문제 (우선순위 높음)
- [ ] **Zustand 스토어 타입 문제 해결**
  - Scene = Record<string, EditorNodeWrapper>인데 빈 객체 초기화 시 타입 오류
  - 해결 방안: 타입 단언 사용하거나 초기 상태 구조 변경
  - currentScene 접근 시 인덱싱 타입 오류 해결
- [ ] **TypeScript strict 모드 설정 검토**
  - tsconfig.json의 strict 설정 확인
  - 필요시 조정하거나 타입 가드 추가

### 🎯 다음 개발 단계 (1-2주차)
- [ ] **React Flow 캔버스 구현**
  - [ ] React Flow 컴포넌트 통합
  - [ ] 기본 캔버스 설정 (drag, zoom, pan)
  - [ ] 커스텀 노드 컴포넌트 생성
- [ ] **노드 생성 시스템 구현**
  - [ ] 툴바 버튼과 Zustand 스토어 연결
  - [ ] 텍스트 노드 생성 기능
  - [ ] 선택지 노드 생성 기능
  - [ ] 노드 자동 배치 로직 (마지막 노드 기준 Y축 + 120px)

---

## 📋 예정된 작업

### 2주차: 노드 추가/편집 및 우측 패널
- [ ] **우측 속성 패널 기능화**
  - [ ] 노드 선택 시 패널 열기
  - [ ] 실시간 편집 및 미리보기 반영
  - [ ] speaker, text, choices 필드 편집
- [ ] **노드 연결 시스템**
  - [ ] 선택지별 개별 연결 (각 선택지 오른쪽 "+" 버튼)
  - [ ] nextNodeKey 자동 연결

### 3주차: Import/Export 및 검증 시스템
- [ ] **Export 기능**
  - [ ] JSON 형식 내보내기
  - [ ] CSV 형식 내보내기 (dialogue.csv + localization.csv)
  - [ ] 사용자 포맷 선택 UI
- [ ] **Import 기능**
  - [ ] JSON 파일 업로드 및 파싱
  - [ ] CSV 파일 업로드 및 파싱
- [ ] **검증 시스템 (Zod)**
  - [ ] 스키마 정의 및 검증
  - [ ] 실시간 유효성 검사
  - [ ] 오류 모달 및 상세 메시지
- [ ] **localStorage 자동 저장**
  - [ ] debounce(1s) 자동 저장
  - [ ] 브라우저 새로고침 시 복원

### 4주차: 유효성 UI 및 자동 키 추천
- [ ] **자동 Key 추천 시스템**
  - [ ] speakerKey: `npc_{id}` 형식
  - [ ] textKey: `{templateKey}_{sceneKey}_line_{id}` 형식
  - [ ] 선택지 textKey: `{templateKey}_{sceneKey}_choice_{id}` 형식
  - [ ] 패널에서 인라인 수정 가능
- [ ] **유효성 검사 UI**
  - [ ] dangling nextNodeKey 감지
  - [ ] 중복 key 경고
  - [ ] Export 버튼 활성화/비활성화
- [ ] **레이아웃 저장**
  - [ ] 노드 x-y 좌표 JSON 포함
  - [ ] 재로드 시 동일 레이아웃 복원

### 5주차: 폴리싱 & QA
- [ ] **UI/UX 개선**
  - [ ] 반응형 디자인
  - [ ] 키보드 접근성
  - [ ] 애니메이션 및 트랜지션
- [ ] **성능 최적화**
  - [ ] 100개 노드 제한 구현
  - [ ] 렌더링 최적화
- [ ] **QA 및 테스트**
  - [ ] Acceptance Criteria 검증
  - [ ] 브라우저 호환성 테스트
- [ ] **배포 준비**
  - [ ] GitHub Pages 설정
  - [ ] 빌드 최적화

---

## 🔮 향후 확장 계획 (Post-MVP)

### G-01: 한글 원문·key 동시 입력/수정용 로컬라이징 전용 탭
### G-02: 플로우 시뮬레이터 (플레이 모드)
### G-03: 콜백 키 CRUD 페이지 + 검색
### G-04: 커스텀 메타데이터(감정, 카메라, SFX) 확장
### G-05: 버전 관리(Git)·다중 사용자 협업
### G-06: InputDialogue 노드 생성 및 런타임 속성 지원
### G-07: 순환 참조 감지 및 경고 시스템

---

## 📝 메모 및 참고사항

### 기술 스택 확정
- ✅ React + Vite + TypeScript
- ✅ React Flow (노드 시각화)
- ✅ Zustand (상태 관리)
- ✅ Tailwind CSS 4.x (스타일링) - 성공적으로 설정 완료
- ✅ Zod (스키마 검증)

### 현재 프로젝트 상태
- ✅ **기본 UI 완성**: http://localhost:5174에서 Script Weaver 에디터 확인 가능
- ✅ **Tailwind CSS 정상 작동**: 모든 스타일이 올바르게 적용됨
- 🔥 **다음 단계**: React Flow 캔버스 통합 및 Zustand 타입 오류 해결

### 주요 제약사항 (MVP)
- 템플릿당 100개 노드 제한
- TextDialogue, ChoiceDialogue만 생성 지원 (InputDialogue는 타입만)
- 순환 참조 허용 (루프 구조 지원)
- 서버 없는 SPA, localStorage만 사용

### 현재 알려진 기술적 이슈
- **Zustand Store 타입 오류**: Scene 타입과 빈 객체 초기화 불일치 (다음 우선순위)
- **TypeScript Strict 모드**: Record 타입 인덱싱 시 any 타입 오류

### Acceptance Criteria 체크리스트
- [ ] AC-01: 새 텍스트 노드 추가 → JSON 저장 동일 내용 존재
- [ ] AC-02: 선택지별 "+" 버튼으로 해당 선택지의 nextNodeKey로 새 노드 자동 연결
- [ ] AC-03: nextNodeKey 비어있으면 Export 버튼 비활성화
- [ ] AC-04: 브라우저 새로고침 후 Canvas 레이아웃 복원
- [ ] AC-05: JSON/CSV Export → Import 후 데이터 무손실 