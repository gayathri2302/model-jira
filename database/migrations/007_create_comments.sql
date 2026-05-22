-- up
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'comments')
BEGIN
  CREATE TABLE comments (
    id         UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ticket_id  UNIQUEIDENTIFIER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author_id  UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
    body       NVARCHAR(MAX)    NOT NULL,
    created_at DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    deleted_at DATETIME2        NULL
  );
END;

-- down
-- DROP TABLE IF EXISTS comments;
