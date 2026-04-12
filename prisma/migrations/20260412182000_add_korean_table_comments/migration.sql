COMMENT ON TABLE "repo_atlas"."repository" IS '저장소 등록 정보와 기본 메타데이터를 관리하는 테이블';
COMMENT ON TABLE "repo_atlas"."analysis" IS '저장소 분석 실행 단위와 요약 결과를 관리하는 테이블';
COMMENT ON TABLE "repo_atlas"."file_index" IS '분석 시 수집된 파일 경로와 파일 메타데이터를 관리하는 테이블';
COMMENT ON TABLE "repo_atlas"."commit_summary" IS '최근 커밋 정보와 변경 흐름 요약을 저장하는 테이블';
COMMENT ON TABLE "repo_atlas"."qa" IS '사용자 질문과 생성된 답변을 저장하는 테이블';
COMMENT ON TABLE "repo_atlas"."citation" IS 'Q&A 응답에 연결된 파일 citation 정보를 저장하는 테이블';
