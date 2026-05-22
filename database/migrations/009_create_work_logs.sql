-- up
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'work_logs')
BEGIN
  CREATE TABLE work_logs (
    id             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ticket_id      UNIQUEIDENTIFIER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id        UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
    minutes_logged INT              NOT NULL CHECK (minutes_logged > 0),
    log_date       DATE             NOT NULL DEFAULT CAST(GETUTCDATE() AS DATE),
    note           NVARCHAR(500)    NULL,
    created_at     DATETIME2        NOT NULL DEFAULT GETUTCDATE()
  );
END;

-- down
-- DROP TABLE IF EXISTS work_logs;
