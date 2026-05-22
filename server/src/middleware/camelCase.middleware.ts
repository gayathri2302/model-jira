import type { Request, Response, NextFunction } from 'express';

function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function transformKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(transformKeys);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        toCamel(k),
        transformKeys(v),
      ]),
    );
  }
  return obj;
}

export function camelCaseResponse(_req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    return originalJson(transformKeys(body));
  };
  next();
}
