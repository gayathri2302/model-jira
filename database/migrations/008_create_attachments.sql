-- up
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'mj_attachments')
BEGIN
  CREATE TABLE mj_attachments (
    id             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ticket_id      UNIQUEIDENTIFIER NOT NULL REFERENCES mj_tickets(id) ON DELETE CASCADE,
    uploaded_by_id UNIQUEIDENTIFIER NOT NULL REFERENCES mj_users(id),
    file_name      NVARCHAR(255)    NOT NULL,
    file_size      BIGINT           NOT NULL,
    mime_type      NVARCHAR(100)    NOT NULL,
    blob_url       NVARCHAR(1000)   NOT NULL,
    blob_name      NVARCHAR(500)    NOT NULL,
    created_at     DATETIME2        NOT NULL DEFAULT GETUTCDATE()
  );
END;

-- down
-- DROP TABLE IF EXISTS mj_attachments;
