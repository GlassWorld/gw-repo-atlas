# OpenAI 활용

RepoAtlas에서 OpenAI는 `저장소 접근`이나 `Git clone` 자체가 아니라, `분석 결과 생성`과 `질문응답 생성`에 사용됩니다.

## 어디에 쓰이나

### 1. 기본 분석 생성

저장소를 clone하고 파일/커밋 정보를 수집한 뒤, OpenAI로 아래 항목을 생성합니다.

- 프로젝트 한 줄 요약
- 프로젝트 상세 요약
- 추론된 기술 스택
- 엔트리 포인트 후보
- 저장소 건강도 점수

관련 코드:

- [server/services/analysis.service.ts](../server/services/analysis.service.ts)
- [server/services/openai.service.ts](../server/services/openai.service.ts)

분석 흐름 요약:

1. API가 `analysis_job`에 기본 분석 작업을 등록합니다.
2. 워커가 `analysis.service.ts`를 통해 저장소를 clone하고 파일 트리, 주요 파일, 최근 커밋을 수집합니다.
3. 수집한 파일트리와 스니펫으로 프로젝트 종류를 감지합니다.
4. 감지된 종류에 맞는 헬스 스코어 기준을 만든 뒤 `generateProjectSummary()`로 전달합니다.
5. `openai.service.ts`가 Responses API를 호출해 구조화된 JSON을 생성합니다.
6. 결과를 `analysis` 테이블과 `file_index`, `commit_summary`에 저장합니다.

분석용 스니펫은 슬롯 기반으로 선별합니다.

- 필수 슬롯: `README.md`, 주요 매니페스트(`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`), 엔트리포인트
- 환경/설정 슬롯: CI/CD, 테스트 하네스, 코드 품질 도구, AI 코딩 도구, `.env.example`
- 코드 슬롯: 남은 여유분 안에서 크기와 경로 기준으로 최대 2개

건강도 점수는 아래 항목을 기준으로 생성합니다.

- 문서화
- 테스트 하네스
- CI/CD
- AI 코딩 도구 설정
- 코드 품질 도구 설정

단, 각 항목에서 실제로 확인하는 대상 파일과 설정은 프로젝트 종류에 따라 달라집니다. 예를 들어 Nuxt 프로젝트는 `package.json`, `vitest.config.*`, `eslint.config.*`, `nuxt.config.*`를 중심으로 보고, Java Gradle 프로젝트는 `build.gradle(.kts)`, `src/test`, JUnit, Jacoco, Checkstyle, SpotBugs 등을 중심으로 봅니다. Python 프로젝트는 `pyproject.toml`, `pytest.ini`, `tox.ini`, `ruff`, `black`, `mypy` 설정을 주요 기준으로 사용합니다.

상세 기준:

- [프로젝트 헬스 스코어링](./프로젝트-헬스-스코어링.md)

### 2. 항목별 상세 분석 생성

기본 분석이 완료된 뒤 사용자가 분석 항목을 실행하면 OpenAI로 해당 항목의 상세 리포트를 생성합니다.

현재 항목:

- 저장소 건강도
- 구조 시그널
- 커밋 흐름

항목별 분석 흐름 요약:

1. `POST /api/analysis/:id/items`가 항목 요청을 받습니다.
2. `analysis_artifact`에 항목 실행 상태를 만들거나 재설정합니다.
3. `analysis_job`에 항목 분석 작업을 등록합니다.
4. 워커가 `generateAnalysisItemReport()`를 호출합니다.
5. 결과 요약과 상세 JSON을 `analysis_artifact`에 저장합니다.

### 3. 질문응답 생성

사용자가 분석된 저장소에 대해 질문하면, 관련성이 높은 파일을 먼저 추려서 OpenAI에 전달한 뒤 답변과 citation 후보를 생성합니다.

관련 코드:

- [server/services/qa.service.ts](../server/services/qa.service.ts)
- [server/services/openai.service.ts](../server/services/openai.service.ts)

질문응답 흐름 요약:

1. `qa.service.ts`가 질문과 파일 경로/요약을 비교해 관련 파일 후보를 점수화합니다.
2. 상위 파일 몇 개를 `answerRepositoryQuestion()`에 전달합니다.
3. `openai.service.ts`가 한국어 답변과 citation 경로 목록을 JSON으로 반환합니다.
4. 결과를 `qa`, `citation` 테이블에 저장합니다.

## OpenAI가 쓰이지 않는 부분

다음 영역은 OpenAI가 아니라 애플리케이션 로직과 Git CLI로 처리합니다.

- 저장소 URL 검증
- Git 연결 정보 저장
- 토큰 기반 저장소 접근 테스트
- `git clone`
- 파일 목록 수집
- 최근 커밋 수집
- 대시보드 통계 집계
- 분석 작업 큐 등록과 상태 전환
- 프로젝트 종류 감지 규칙 생성

관련 코드:

- [server/services/git.service.ts](../server/services/git.service.ts)
- [server/services/git-credential.service.ts](../server/services/git-credential.service.ts)
- [server/utils/project-health.ts](../server/utils/project-health.ts)

## 사용하는 API

OpenAI 호출은 Responses API 기반으로 구현되어 있습니다.

관련 코드:

- [server/services/openai.service.ts](../server/services/openai.service.ts)

현재 특징:

- 모델 호출은 `responses.create()`를 사용합니다.
- 응답은 자유 텍스트가 아니라 JSON 형태를 기대합니다.
- JSON 파싱 실패 시 기본 fallback 값을 사용합니다.
- 기본 분석과 항목별 분석 모두 한국어 응답을 요청합니다.

## 환경 변수

OpenAI 기능을 사용하려면 아래 환경 변수가 필요합니다.

- `OPENAI_API_KEY`

관련 설정 위치:

- [server/services/openai.service.ts](../server/services/openai.service.ts)
- [README.md](../README.md)

## 확인 포인트

OpenAI가 실제로 동작하는지 확인하려면 아래를 보면 됩니다.

- 분석 실행 후 `projectTagline`, `projectSummary`, `inferredStack` 값이 채워지는지
- 헬스 스코어에 `projectKind`와 `appliedRules`가 저장되는지
- 항목 분석 실행 후 `analysis_artifact.result`가 채워지는지
- Q&A 실행 후 답변과 citation이 생성되는지

관련 조회 화면:

- [pages/analysis/[id]/index.vue](../pages/analysis/[id]/index.vue)
- [pages/qa.vue](../pages/qa.vue)
