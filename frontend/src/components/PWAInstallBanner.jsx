// components/PWAInstallBanner.jsx
// Dismissible banner prompting mobile browser users to install the PWA.

import { useState, useEffect, useCallback } from 'react';

const LS_KEY = 'pwa-install-dismissed';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isAndroid() {
  return /Android/.test(navigator.userAgent);
}

function isMobile() {
  return isIOS() || isAndroid();
}

export default function PWAInstallBanner() {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(LS_KEY) === '1';
  });
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  // Listen for the native install prompt (Chrome on Android)
  useEffect(() => {
    function handler(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Determine visibility
  useEffect(() => {
    if (dismissed || isStandalone() || !isMobile()) {
      setVisible(false);
    } else {
      setVisible(true);
    }
  }, [dismissed]);

  const dismiss = useCallback(() => {
    localStorage.setItem(LS_KEY, '1');
    setDismissed(true);
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      dismiss();
    }
  }, [deferredPrompt, dismiss]);

  if (!visible) return null;

  const ios = isIOS();

  return (
    <div style={styles.banner}>
      <div style={styles.content}>
        <span style={styles.text}>
          {ios
            ? "Tap the Share button, then 'Add to Home Screen'"
            : deferredPrompt
              ? 'Install this app on your device for the best experience'
              : "Open browser menu and tap 'Add to Home Screen'"}
        </span>
        <div style={styles.actions}>
          {!ios && deferredPrompt && (
            <button style={styles.installBtn} onClick={handleInstallClick}>
              Install
            </button>
          )}
          <button style={styles.closeBtn} onClick={dismiss} aria-label="Dismiss install banner">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  banner: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10000,
    backgroundColor: '#1565c0',
    color: '#fff',
    padding: '10px 16px',
    fontSize: '14px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    maxWidth: '960px',
    margin: '0 auto',
  },
  text: {
    flex: 1,
    lineHeight: 1.4,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  installBtn: {
    background: '#fff',
    color: '#1565c0',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 14px',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    minHeight: '44px',
    minWidth: '44px',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
    lineHeight: 1,
    minHeight: '44px',
    minWidth: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
