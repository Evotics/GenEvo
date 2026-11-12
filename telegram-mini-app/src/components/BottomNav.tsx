import type { Page } from "../types";
import { haptic } from "../hooks/useTheme";

interface Props {
  current: Page;
  isAdmin: boolean;
  onNavigate: (page: Page) => void;
}

const NAV_ITEMS: { page: Page; icon: string; label: string; adminOnly?: boolean }[] = [
  { page: "home", icon: "🏠", label: "Home" },
  { page: "generate", icon: "📊", label: "Generate" },
  { page: "redeem", icon: "🔑", label: "Redeem" },
  { page: "balance", icon: "💳", label: "Balance" },
  { page: "admin", icon: "⚙️", label: "Admin", adminOnly: true },
];

export function BottomNav({ current, isAdmin, onNavigate }: Props) {
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <button
          key={item.page}
          className={`nav-item ${current === item.page ? "active" : ""}`}
          onClick={() => {
            haptic("light");
            onNavigate(item.page);
          }}
        >
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
