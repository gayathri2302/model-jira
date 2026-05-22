-- up
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'epics')
BEGIN
  CREATE TABLE epics (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    project_id  UNIQUEIDENTIFIER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title       NVARCHAR(255)    NOT NULL,
    description NVARCHAR(MAX)    NULL,
    color       NVARCHAR(7)      NOT NULL DEFAULT '#0052CC',
    start_date  DATE             NULL,
    end_date    DATE             NULL,
    created_at  DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    updated_at  DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    deleted_at  DATETIME2        NULL
  );
END;

-- down
-- DROP TABLE IF EXISTS epics;
