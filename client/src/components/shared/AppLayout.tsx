import { Outlet } from 'react-router-dom';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 bg-surface border-r border-border shrink-0" />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
