ALTER TABLE repo_atlas.repository
ADD COLUMN git_credential_id UUID NULL;

ALTER TABLE repo_atlas.repository
ADD CONSTRAINT repository_git_credential_id_fkey
FOREIGN KEY (git_credential_id)
REFERENCES repo_atlas.git_domain_credential(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

COMMENT ON COLUMN repo_atlas.repository.git_credential_id IS '선택한 Git 자격증명 식별자 UUID';
