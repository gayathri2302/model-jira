import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

const NAV_ITEMS = [
  { label: 'Projects', to: '/projects' },
  { label: 'Users', to: '/users' },
];

export default function Sidebar() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    clearAuth();
    navigate('/login');
  }

  return (
    <aside className="w-60 h-screen flex flex-col bg-surface border-r border-border shrink-0 fixed left-0 top-0">
      <div className="px-4 py-4 border-b border-border">
        <span className="font-bold text-primary text-lg">model-jira</span>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block px-3 py-2 rounded text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-primary'
                  : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <div className="text-xs text-text-secondary mb-1 truncate">{user?.name}</div>
        <div className="text-xs text-text-secondary mb-2 truncate">{user?.email}</div>
        <button
          onClick={handleLogout}
          className="text-xs text-red-600 hover:underline"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
