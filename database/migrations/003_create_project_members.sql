-- up
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'mj_project_members')
BEGIN
  CREATE TABLE mj_project_members (
    id         UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    project_id UNIQUEIDENTIFIER NOT NULL REFERENCES mj_projects(id) ON DELETE CASCADE,
    user_id    UNIQUEIDENTIFIER NOT NULL REFERENCES mj_users(id),
    role       NVARCHAR(20)     NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member','viewer')),
    joined_at  DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_mj_project_members UNIQUE (project_id, user_id)
  );
END;

-- down
-- DROP TABLE IF EXISTS mj_project_members;
