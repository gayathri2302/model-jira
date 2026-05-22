-- up
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'mj_work_logs')
BEGIN
  CREATE TABLE mj_work_logs (
    id             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ticket_id      UNIQUEIDENTIFIER NOT NULL REFERENCES mj_tickets(id) ON DELETE CASCADE,
    user_id        UNIQUEIDENTIFIER NOT NULL REFERENCES mj_users(id),
    minutes_logged INT              NOT NULL CHECK (minutes_logged > 0),
    log_date       DATE             NOT NULL DEFAULT CAST(GETUTCDATE() AS DATE),
    note           NVARCHAR(500)    NULL,
    created_at     DATETIME2        NOT NULL DEFAULT GETUTCDATE()
  );
END;

-- down
-- DROP TABLE IF EXISTS mj_work_logs;
