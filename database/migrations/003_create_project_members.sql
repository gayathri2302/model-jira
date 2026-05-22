-- up
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'project_members')
BEGIN
  CREATE TABLE project_members (
    id         UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    project_id UNIQUEIDENTIFIER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id    UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
    role       NVARCHAR(20)     NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member','viewer')),
    joined_at  DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_project_members UNIQUE (project_id, user_id)
  );
END;

-- down
-- DROP TABLE IF EXISTS project_members;
