import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(() => {
    const tg = window.Telegram?.WebApp;
    if (tg?.colorScheme) return tg.colorScheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    const handler = () => setTheme(tg.colorScheme);
    tg.onEvent("themeChanged", handler);
    return () => tg.offEvent("themeChanged", handler);
  }, []);

  return theme;
}

export function haptic(style: "light" | "medium" | "heavy" = "light") {
  window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
}

export function hapticNotify(type: "success" | "warning" | "error") {
  window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
}

export function hapticSelection() {
  window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
}
