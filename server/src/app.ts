import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.config';
import { errorMiddleware } from './middleware/error.middleware';

// Route imports (populated in Phase 4)
import authRouter from './routes/auth.router';
import usersRouter from './routes/users.router';
import projectsRouter from './routes/projects.router';
import statusesRouter from './routes/statuses.router';
import epicsRouter from './routes/epics.router';
import ticketsRouter from './routes/tickets.router';
import commentsRouter from './routes/comments.router';
import attachmentsRouter from './routes/attachments.router';
import workLogsRouter from './routes/workLogs.router';
import activityRouter from './routes/activity.router';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/statuses', statusesRouter);
app.use('/api/epics', epicsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/attachments', attachmentsRouter);
app.use('/api/work-logs', workLogsRouter);
app.use('/api/activity', activityRouter);

app.use(errorMiddleware);

export default app;
