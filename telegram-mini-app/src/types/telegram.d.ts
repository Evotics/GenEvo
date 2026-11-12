interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  themeParams: Record<string, string>;
  colorScheme: "light" | "dark";
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  onEvent: (event: string, handler: () => void) => void;
  offEvent: (event: string, handler: () => void) => void;
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    setText: (text: string) => void;
    onClick: (handler: () => void) => void;
    offClick: (handler: () => void) => void;
    enable: () => void;
    disable: () => void;
    setParams: (params: Record<string, string>) => void;
  };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (handler: () => void) => void;
    offClick: (handler: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
  showAlert: (message: string) => void;
  showConfirm: (message: string, callback: (ok: boolean) => void) => void;
  showPopup: (params: Record<string, unknown>, callback?: (id: string) => void) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export {};
