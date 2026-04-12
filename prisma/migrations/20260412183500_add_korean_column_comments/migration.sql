COMMENT ON COLUMN "repo_atlas"."repository"."id" IS '저장소 고유 식별자 UUID';
COMMENT ON COLUMN "repo_atlas"."repository"."url" IS 'GitHub 저장소 정규화 URL';
COMMENT ON COLUMN "repo_atlas"."repository"."name" IS '저장소 이름';
COMMENT ON COLUMN "repo_atlas"."repository"."owner" IS '저장소 소유자 계정명';
COMMENT ON COLUMN "repo_atlas"."repository"."branch" IS '분석 또는 등록 시점에 확인한 브랜치명';
COMMENT ON COLUMN "repo_atlas"."repository"."defaultRef" IS '기본 참조 브랜치 또는 ref 정보';
COMMENT ON COLUMN "repo_atlas"."repository"."createdAt" IS '레코드 생성 일시';
COMMENT ON COLUMN "repo_atlas"."repository"."updatedAt" IS '레코드 수정 일시';

COMMENT ON COLUMN "repo_atlas"."analysis"."id" IS '분석 고유 식별자 UUID';
COMMENT ON COLUMN "repo_atlas"."analysis"."repositoryId" IS '대상 저장소 식별자 UUID';
COMMENT ON COLUMN "repo_atlas"."analysis"."status" IS '분석 상태 값';
COMMENT ON COLUMN "repo_atlas"."analysis"."projectSummary" IS '프로젝트 상세 요약';
COMMENT ON COLUMN "repo_atlas"."analysis"."projectTagline" IS '프로젝트 한 줄 요약';
COMMENT ON COLUMN "repo_atlas"."analysis"."inferredStack" IS '추론된 기술 스택 목록 JSON';
COMMENT ON COLUMN "repo_atlas"."analysis"."entryPoints" IS '추론된 엔트리 포인트 목록 JSON';
COMMENT ON COLUMN "repo_atlas"."analysis"."recommendedReadOrder" IS '추천 읽기 순서 목록 JSON';
COMMENT ON COLUMN "repo_atlas"."analysis"."keyFiles" IS '핵심 파일 목록 JSON';
COMMENT ON COLUMN "repo_atlas"."analysis"."fileTree" IS '파일 트리 라인 목록 JSON';
COMMENT ON COLUMN "repo_atlas"."analysis"."startedAt" IS '분석 시작 일시';
COMMENT ON COLUMN "repo_atlas"."analysis"."completedAt" IS '분석 완료 일시';
COMMENT ON COLUMN "repo_atlas"."analysis"."errorMessage" IS '분석 실패 시 오류 메시지';
COMMENT ON COLUMN "repo_atlas"."analysis"."createdAt" IS '레코드 생성 일시';
COMMENT ON COLUMN "repo_atlas"."analysis"."updatedAt" IS '레코드 수정 일시';

COMMENT ON COLUMN "repo_atlas"."file_index"."id" IS '파일 인덱스 고유 식별자 UUID';
COMMENT ON COLUMN "repo_atlas"."file_index"."analysisId" IS '연결된 분석 식별자 UUID';
COMMENT ON COLUMN "repo_atlas"."file_index"."path" IS '저장소 기준 상대 파일 경로';
COMMENT ON COLUMN "repo_atlas"."file_index"."language" IS '확장자 기반 추론 언어';
COMMENT ON COLUMN "repo_atlas"."file_index"."isEntryPoint" IS '엔트리 포인트 후보 여부';
COMMENT ON COLUMN "repo_atlas"."file_index"."isKeyFile" IS '핵심 파일 여부';
COMMENT ON COLUMN "repo_atlas"."file_index"."summary" IS '파일 요약 설명';
COMMENT ON COLUMN "repo_atlas"."file_index"."snippet" IS '분석용 파일 스니펫';
COMMENT ON COLUMN "repo_atlas"."file_index"."createdAt" IS '레코드 생성 일시';

COMMENT ON COLUMN "repo_atlas"."commit_summary"."id" IS '커밋 요약 고유 식별자 UUID';
COMMENT ON COLUMN "repo_atlas"."commit_summary"."analysisId" IS '연결된 분석 식별자 UUID';
COMMENT ON COLUMN "repo_atlas"."commit_summary"."commitHash" IS '커밋 해시';
COMMENT ON COLUMN "repo_atlas"."commit_summary"."authorName" IS '커밋 작성자 이름';
COMMENT ON COLUMN "repo_atlas"."commit_summary"."authorEmail" IS '커밋 작성자 이메일';
COMMENT ON COLUMN "repo_atlas"."commit_summary"."committedAt" IS '커밋 시각';
COMMENT ON COLUMN "repo_atlas"."commit_summary"."title" IS '커밋 제목';
COMMENT ON COLUMN "repo_atlas"."commit_summary"."body" IS '커밋 본문';
COMMENT ON COLUMN "repo_atlas"."commit_summary"."changeSummary" IS '커밋 변경 요약';
COMMENT ON COLUMN "repo_atlas"."commit_summary"."createdAt" IS '레코드 생성 일시';

COMMENT ON COLUMN "repo_atlas"."qa"."id" IS '질문응답 고유 식별자 UUID';
COMMENT ON COLUMN "repo_atlas"."qa"."repositoryId" IS '대상 저장소 식별자 UUID';
COMMENT ON COLUMN "repo_atlas"."qa"."analysisId" IS '대상 분석 식별자 UUID';
COMMENT ON COLUMN "repo_atlas"."qa"."question" IS '사용자 질문 원문';
COMMENT ON COLUMN "repo_atlas"."qa"."answer" IS '생성된 답변 본문';
COMMENT ON COLUMN "repo_atlas"."qa"."createdAt" IS '레코드 생성 일시';

COMMENT ON COLUMN "repo_atlas"."citation"."id" IS 'citation 고유 식별자 UUID';
COMMENT ON COLUMN "repo_atlas"."citation"."qaId" IS '연결된 질문응답 식별자 UUID';
COMMENT ON COLUMN "repo_atlas"."citation"."fileIndexId" IS '연결된 파일 인덱스 식별자 UUID';
COMMENT ON COLUMN "repo_atlas"."citation"."reason" IS '해당 파일을 인용한 이유';
COMMENT ON COLUMN "repo_atlas"."citation"."createdAt" IS '레코드 생성 일시';
