-- up
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'users')
BEGIN
  CREATE TABLE users (
    id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    name          NVARCHAR(120)    NOT NULL,
    email         NVARCHAR(255)    NOT NULL,
    password_hash NVARCHAR(255)    NOT NULL,
    role          NVARCHAR(20)     NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member','viewer')),
    avatar_url    NVARCHAR(500)    NULL,
    created_at    DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    updated_at    DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    deleted_at    DATETIME2        NULL,
    CONSTRAINT UQ_users_email UNIQUE (email)
  );
END;

-- down
-- DROP TABLE IF EXISTS users;
