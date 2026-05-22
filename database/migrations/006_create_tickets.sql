-- up
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tickets')
BEGIN
  CREATE TABLE tickets (
    id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ticket_number NVARCHAR(20)     NOT NULL,
    project_id    UNIQUEIDENTIFIER NOT NULL REFERENCES projects(id),
    title         NVARCHAR(255)    NOT NULL,
    description   NVARCHAR(MAX)    NULL,
    type          NVARCHAR(10)     NOT NULL DEFAULT 'task' CHECK (type IN ('task','bug','story')),
    priority      NVARCHAR(10)     NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
    status_id     UNIQUEIDENTIFIER NOT NULL REFERENCES statuses(id),
    epic_id       UNIQUEIDENTIFIER NULL REFERENCES epics(id),
    assignee_id   UNIQUEIDENTIFIER NULL REFERENCES users(id),
    reporter_id   UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
    story_points  INT              NULL,
    due_date      DATE             NULL,
    created_at    DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    updated_at    DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    deleted_at    DATETIME2        NULL,
    CONSTRAINT UQ_ticket_number UNIQUE (ticket_number)
  );

  CREATE INDEX IX_tickets_project_id ON tickets(project_id) WHERE deleted_at IS NULL;
  CREATE INDEX IX_tickets_status_id  ON tickets(status_id);
  CREATE INDEX IX_tickets_assignee_id ON tickets(assignee_id);
END;

-- down
-- DROP TABLE IF EXISTS tickets;
