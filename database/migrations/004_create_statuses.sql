-- up
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'mj_statuses')
BEGIN
  CREATE TABLE mj_statuses (
    id         UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    project_id UNIQUEIDENTIFIER NOT NULL REFERENCES mj_projects(id) ON DELETE CASCADE,
    name       NVARCHAR(80)     NOT NULL,
    color      NVARCHAR(7)      NOT NULL DEFAULT '#DFE1E6',
    position   INT              NOT NULL DEFAULT 0,
    category   NVARCHAR(20)     NOT NULL DEFAULT 'todo' CHECK (category IN ('todo','in_progress','done')),
    created_at DATETIME2        NOT NULL DEFAULT GETUTCDATE()
  );
END;

-- down
-- DROP TABLE IF EXISTS mj_statuses;
