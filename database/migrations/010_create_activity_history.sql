-- up
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'activity_history')
BEGIN
  CREATE TABLE activity_history (
    id         UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ticket_id  UNIQUEIDENTIFIER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id    UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
    action     NVARCHAR(50)     NOT NULL,
    field_name NVARCHAR(80)     NULL,
    old_value  NVARCHAR(MAX)    NULL,
    new_value  NVARCHAR(MAX)    NULL,
    created_at DATETIME2        NOT NULL DEFAULT GETUTCDATE()
  );

  CREATE INDEX IX_activity_ticket_id ON activity_history(ticket_id);
END;

-- down
-- DROP TABLE IF EXISTS activity_history;
