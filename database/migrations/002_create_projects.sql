-- up
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'mj_projects')
BEGIN
  CREATE TABLE mj_projects (
    id           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    project_key  NVARCHAR(10)     NOT NULL,
    project_name NVARCHAR(120)    NOT NULL,
    description  NVARCHAR(MAX)    NULL,
    owner_id     UNIQUEIDENTIFIER NOT NULL REFERENCES mj_users(id),
    created_at   DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    updated_at   DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    deleted_at   DATETIME2        NULL,
    CONSTRAINT UQ_mj_projects_key UNIQUE (project_key)
  );
END;

-- down
-- DROP TABLE IF EXISTS mj_projects;
