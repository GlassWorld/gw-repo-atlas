# RepoAtlas

RepoAtlas는 GitHub 저장소를 분석해 개발자가 낯선 코드베이스를 빠르게 이해할 수 있도록 돕는 웹 애플리케이션입니다.  
저장소를 실제로 `git clone`한 뒤 파일 구조, 핵심 메타 파일, 최근 커밋 흐름을 수집하고, OpenAI Responses API를 이용해 프로젝트 요약과 Q&A 응답을 생성합니다.

## 한눈에 보기

- GitHub URL 입력 후 저장소 등록
- 서버에서 임시 디렉터리에 `git clone`
- 파일 트리, 핵심 파일, 엔트리 포인트 후보 인덱싱
- OpenAI 기반 프로젝트 요약 생성
- 최근 커밋 히스토리 요약
- 질문응답 시 관련 파일 citation 포함

## 기술 스택

- Nuxt 4 Fullstack
- TypeScript strict mode
- Prisma ORM
- PostgreSQL
- OpenAI Responses API
- Git CLI

## 주요 목표

- 신규 개발자가 저장소의 구조를 빠르게 이해할 수 있게 돕기
- 어디서부터 읽어야 하는지 추천하기
- 핵심 파일과 엔트리 포인트를 빠르게 찾기
- 질문에 대해 파일 경로 citation과 함께 답변하기
- 향후 queue, 검색, 임베딩 기반 분석으로 확장 가능한 구조 유지하기

## 프로젝트 구조

```text
.
├─ assets/css                 # 전역 스타일
├─ components                 # UI 컴포넌트
├─ layouts                    # 공통 레이아웃
├─ pages                      # Nuxt 페이지
├─ prisma                     # Prisma 스키마
├─ server
│  ├─ api                     # HTTP API 엔드포인트
│  ├─ db                      # Prisma 클라이언트
│  ├─ services                # 분석, Git, OpenAI, Q&A 서비스 계층
│  └─ utils                   # URL 파싱, 파일 트리, 공통 유틸
└─ types                      # 공용 타입
```

## 디렉터리별 역할

- [server/api](./server/api): 외부 요청을 받는 API 레이어입니다.
- [server/services](./server/services): 비즈니스 로직의 중심입니다. API에서 직접 Git이나 OpenAI를 다루지 않고 서비스 계층으로 위임합니다.
- [server/db/prisma.ts](./server/db/prisma.ts): Prisma Client 싱글턴을 관리합니다.
- [server/utils](./server/utils): GitHub URL 파싱, 언어 추론, 파일 트리 변환 같은 순수 유틸리티를 제공합니다.
- [components](./components): 분석 결과, 파일 트리, Q&A, 상태 표시용 재사용 UI입니다.
- [pages](./pages): 메인 페이지, 분석 결과 페이지, Q&A 페이지를 구성합니다.

## 핵심 흐름

### 1. 저장소 등록

사용자가 메인 페이지에서 GitHub URL을 입력하면 [server/api/repository.post.ts](./server/api/repository.post.ts)에서 저장소를 등록합니다.  
URL 파싱과 정규화는 [server/utils/repository.ts](./server/utils/repository.ts)에서 처리합니다.

### 2. 분석 실행

[server/api/analyze.post.ts](./server/api/analyze.post.ts)에서 analysis 레코드를 `PENDING` 상태로 생성하고,  
[server/services/analysis.service.ts](./server/services/analysis.service.ts)에서 실제 분석을 시작합니다.

분석 단계:

1. `RUNNING` 상태로 전환
2. Git clone 및 파일/커밋 스캔
3. OpenAI로 프로젝트 요약 생성
4. 파일 인덱스와 커밋 요약 저장
5. `SUCCESS` 또는 `FAILED` 상태 반영

### 3. Git 기반 저장소 스캔

[server/services/git.service.ts](./server/services/git.service.ts)에서 다음을 수행합니다.

- 임시 디렉터리에 `git clone`
- `git ls-files`로 추적 파일 목록 수집
- 핵심 파일과 엔트리 포인트 후보 판별
- 최근 커밋 로그 수집
- 핵심 파일 스니펫 추출

### 4. OpenAI 요약 생성

[server/services/openai.service.ts](./server/services/openai.service.ts)에서 Responses API를 호출해 다음 정보를 생성합니다.

- 프로젝트 한 줄 요약
- 프로젝트 상세 요약
- 추론된 기술 스택
- 엔트리 포인트 목록
- 추천 읽기 순서
- 핵심 파일 목록

### 5. 질문응답

[server/api/qa.post.ts](./server/api/qa.post.ts)에서 질문을 받고,  
[server/services/qa.service.ts](./server/services/qa.service.ts)에서 관련성이 높은 파일을 선별한 뒤 OpenAI에 전달합니다.

응답에는:

- 한국어 답변
- 관련 파일 citation
- citation 저장을 위한 DB 레코드

가 포함됩니다.

## 데이터베이스 설계

Prisma 스키마는 [prisma/schema.prisma](./prisma/schema.prisma)에 정의되어 있습니다.

주요 테이블:

- `repository`: 저장소 기본 정보
- `analysis`: 분석 실행 단위와 결과 상태
- `file_index`: 파일 경로, 언어, 엔트리 포인트 여부, 스니펫
- `commit_summary`: 최근 커밋 정보와 요약
- `qa`: 질문과 답변
- `citation`: 답변에 사용된 파일 citation

모든 테이블은 UUID 기반 primary key를 사용합니다.

## 주요 파일

- [nuxt.config.ts](./nuxt.config.ts): 런타임 설정, strict mode, 전역 구성
- [prisma/schema.prisma](./prisma/schema.prisma): 전체 도메인 모델
- [server/services/analysis.service.ts](./server/services/analysis.service.ts): 분석 오케스트레이션
- [server/services/git.service.ts](./server/services/git.service.ts): Git clone 및 파일/커밋 분석
- [server/services/openai.service.ts](./server/services/openai.service.ts): OpenAI Responses API 연동
- [server/services/qa.service.ts](./server/services/qa.service.ts): 질문응답과 citation 저장
- [pages/index.vue](./pages/index.vue): 저장소 URL 입력 메인 화면
- [pages/analysis/[id].vue](./pages/analysis/[id].vue): 분석 결과 페이지
- [pages/qa.vue](./pages/qa.vue): 질문응답 페이지

## API 명세

### `POST /api/repository`

GitHub 저장소 URL을 등록합니다.

요청:

```json
{
  "url": "https://github.com/owner/repository"
}
```

### `POST /api/analyze`

저장소 분석을 시작합니다.

요청:

```json
{
  "repositoryId": "uuid"
}
```

응답 상태는 `PENDING -> RUNNING -> SUCCESS` 또는 `FAILED` 흐름을 가집니다.

### `GET /api/analysis/:id`

분석 결과를 조회합니다.

포함 정보:

- 프로젝트 요약
- 기술 스택
- 엔트리 포인트
- 추천 읽기 순서
- 핵심 파일
- 파일 트리
- 최근 커밋 목록

### `POST /api/qa`

질문을 입력하면 답변과 citation을 반환합니다.

요청:

```json
{
  "repositoryId": "uuid",
  "analysisId": "uuid",
  "question": "이 프로젝트의 엔트리 포인트는 어디인가요?"
}
```

## 환경 변수

`.env` 파일을 생성하고 아래 값을 설정합니다.

```bash
DATABASE_URL="postgresql://gw:UQTiDCsYmD5oHYDL@168.107.12.96:5432/gw?schema=repo_atlas"
OPENAI_API_KEY="<YOUR_OPENAI_API_KEY>"
AUTH_JWT_SECRET="<YOUR_LONG_RANDOM_SECRET>"
```

샘플은 [.env.example](./.env.example)에 포함되어 있습니다.

## 배포

GitHub Actions로 `main` 브랜치 변경을 받아 `atlas.glassworld.co.kr`에 배포할 수 있도록 프론트 배포 워크플로를 추가했습니다.

같은 서버에서 `home.glassworld.co.kr`와 함께 운영하는 것을 전제로, Atlas는 앱 컨테이너만 `127.0.0.1:3001`에 바인딩하고 외부 `80/443`과 TLS 종료는 기존 공용 Nginx가 담당합니다.

- 워크플로 파일: [.github/workflows/deploy-front.yml](./.github/workflows/deploy-front.yml)
- 배포 리소스: [deploy/frontend](./deploy/frontend)
- 대상 도메인: `atlas.glassworld.co.kr`
- 공용 Nginx용 서버 블록 예시: [deploy/frontend/nginx.atlas.conf](./deploy/frontend/nginx.atlas.conf)

필요한 GitHub Secrets:

- `FRONT_HOST`
- `FRONT_USER`
- `FRONT_SSH_KEY`
- `FRONT_PORT`
- `FRONT_APP_PATH`
- `GHCR_USERNAME`
- `GHCR_TOKEN`
- `ATLAS_DATABASE_URL`
- `ATLAS_OPENAI_API_KEY`
- `ATLAS_AUTH_JWT_SECRET`
- `ATLAS_APP_PORT` (선택, 기본값 `3001`, Atlas 내부/외부 포트 공통)
- `ATLAS_APP_BIND_IP` (선택, 기본값 `127.0.0.1`)

배포 서버에는 Docker와 Docker Compose 플러그인이 설치되어 있어야 합니다. 또한 기존 공용 Nginx 설정에 `atlas.glassworld.co.kr` 서버 블록을 추가하고, `deploy/frontend/nginx.atlas.conf` 예시처럼 `127.0.0.1:3001`로 프록시하도록 맞춰야 합니다.

## 실행 방법

```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

개발 서버 실행 후 기본 진입 페이지는 `/`입니다.

## 화면 구성

### 메인 페이지

- GitHub URL 입력
- 분석 시작

구현 위치:

- [pages/index.vue](./pages/index.vue)
- [components/RepositoryForm.vue](./components/RepositoryForm.vue)

### 분석 결과 페이지

- 프로젝트 요약
- 파일 트리
- 핵심 파일
- 추론된 기술 스택
- 추천 읽기 순서
- 최근 커밋 흐름

구현 위치:

- [pages/analysis/[id].vue](./pages/analysis/[id].vue)

### Q&A 페이지

- 질문 입력
- 답변 표시
- citation 표시

구현 위치:

- [pages/qa.vue](./pages/qa.vue)
- [components/QaPanel.vue](./components/QaPanel.vue)

## 아키텍처 원칙

- TypeScript strict mode 사용
- API 레이어와 서비스 레이어 분리
- OpenAI 호출은 별도 서비스로 분리
- Git clone 및 분석 로직은 서비스 계층에 구현
- DB 접근은 Prisma로 추상화
- 하드코딩 최소화 및 유틸 함수 분리

## 현재 구현 범위와 확장 포인트

현재 구현은 실무 확장을 고려한 MVP입니다.

- 비동기 분석은 현재 Nitro 프로세스 내부에서 처리합니다.
- 운영 환경에서는 queue worker로 분리하는 것이 적절합니다.
- 파일 검색은 현재 규칙 기반 선별입니다.
- 이후 AST 분석, 임베딩 검색, diff 요약 파이프라인으로 확장할 수 있습니다.
- commit summary는 현재 최근 커밋 로그 중심이며, 이후 patch 기반 요약으로 고도화할 수 있습니다.

## 참고 파일

- [README.md](./README.md)
- [package.json](./package.json)
- [nuxt.config.ts](./nuxt.config.ts)
- [prisma/schema.prisma](./prisma/schema.prisma)
