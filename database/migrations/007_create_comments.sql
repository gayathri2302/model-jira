-- up
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'mj_comments')
BEGIN
  CREATE TABLE mj_comments (
    id         UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ticket_id  UNIQUEIDENTIFIER NOT NULL REFERENCES mj_tickets(id) ON DELETE CASCADE,
    author_id  UNIQUEIDENTIFIER NOT NULL REFERENCES mj_users(id),
    body       NVARCHAR(MAX)    NOT NULL,
    created_at DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    deleted_at DATETIME2        NULL
  );
END;

-- down
-- DROP TABLE IF EXISTS mj_comments;
