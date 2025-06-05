# Script Weaver - TODO List

## 🎯 MVP 목표
웹 기반 Dialogue Editor (프론트엔드-Only) - Twine 느낌의 시각 편집 + 우측 폼 패널

---

## ✅ 완료된 작업

### 1-2주차: 기본 시스템 구축 ✅ **완료!**
- [x] **프로젝트 환경 설정**: React + Vite + TypeScript, Tailwind CSS 4.x, React Flow, Zustand
- [x] **데이터 모델**: Dialogue 타입, Zod 스키마, EditorStore 상태 관리
- [x] **기본 UI**: 에디터 레이아웃, Canvas, 툴바, 속성 패널, 상태바
- [x] **노드 시스템**: TextNode/ChoiceNode 생성, 편집, 위치 저장, localStorage 지속성
- [x] **속성 패널**: 실시간 편집, 선택지 관리, 노드 선택 연동
- [x] **연결 시스템**: React Flow Handle 기반 드래그 연결, 핸들 위치 정렬, 연결 해제

---

## 🎯 현재 진행 상황

### 📋 다음 최우선 순위 작업
- [ ] **Import/Export 기능 구현** 🎯 **3주차 목표**
  - [ ] JSON 형식 내보내기/가져오기
  - [ ] CSV 형식 내보내기 (dialogue.csv + localization.csv)
  - [ ] 파일 업로드 UI 및 파싱 로직
- [ ] **검증 시스템 구현**
  - [ ] Zod 스키마 기반 실시간 유효성 검사
  - [ ] dangling nextNodeKey 감지
  - [ ] Export 버튼 활성화/비활성화 조건

---

## 📋 예정된 작업

### 3주차: Import/Export 및 검증 시스템 🎯 **현재 진행**
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
- ✅ **2주차 목표 완료**: 노드 생성, 편집, 연결 시스템 모든 기능 완성
- ✅ **주요 기능**: 드래그 연결, 실시간 편집, 속성 패널, localStorage 지속성
- 🎯 **3주차 목표**: Import/Export 기능 및 검증 시스템 구현

### 주요 제약사항 (MVP)
- 템플릿당 100개 노드 제한
- TextDialogue, ChoiceDialogue만 생성 지원 (InputDialogue는 타입만)
- 순환 참조 허용 (루프 구조 지원)
- 서버 없는 SPA, localStorage만 사용

### 주요 해결 완료 이슈
- ✅ **모든 핵심 기능 완성**: 타입 시스템, 상태 관리, UI/UX, 노드 연결 시스템

### Acceptance Criteria 체크리스트
- [x] AC-01: 새 텍스트 노드 추가 → JSON 저장 동일 내용 존재 ✅ **완료**
- [ ] AC-02: 선택지별 "+" 버튼으로 해당 선택지의 nextNodeKey로 새 노드 자동 연결
- [ ] AC-03: nextNodeKey 비어있으면 Export 버튼 비활성화
- [x] AC-04: 브라우저 새로고침 후 Canvas 레이아웃 복원 ✅ **완료**
- [ ] AC-05: JSON/CSV Export → Import 후 데이터 무손실 