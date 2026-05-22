-- up
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'projects')
BEGIN
  CREATE TABLE projects (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    key         NVARCHAR(10)     NOT NULL,
    name        NVARCHAR(120)    NOT NULL,
    description NVARCHAR(MAX)    NULL,
    owner_id    UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
    created_at  DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    updated_at  DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    deleted_at  DATETIME2        NULL,
    CONSTRAINT UQ_projects_key UNIQUE (key)
  );
END;

-- down
-- DROP TABLE IF EXISTS projects;
