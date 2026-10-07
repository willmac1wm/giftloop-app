import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SecretRevealView from './components/SecretRevealView';
import IosInstallModal from './components/IosInstallModal';
import AffiliateSettingsModal from './components/AffiliateSettingsModal';
import DealBanner from './components/DealBanner';
import AccountScreen from './components/AccountScreen';
import AdminScreen from './components/AdminScreen';
import WishListScreen from './components/WishListScreen';
import {
  ExchangeScreen,
  EXCHANGE_STORAGE_KEY,
  loadExchange,
  blankExchange,
  sampleExchange,
} from './games/secretSanta';
import { decodeSecretPayload } from './utils/crypto';
import { sound } from './utils/audio';

export default function App() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [snowEnabled, setSnowEnabled] = useState(true);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showAffiliateModal, setShowAffiliateModal] = useState(false);
  const [user, setUser] = useState(null);
  const [area, setArea] = useState('exchange');
  const [afterAccount, setAfterAccount] = useState('exchange');
  const [recovery, setRecovery] = useState(false);

  const [exchange, setExchange] = useState(() => {
    try {
      const saved = localStorage.getItem(EXCHANGE_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      return loadExchange(parsed);
    } catch {
      return blankExchange();
    }
  });

  // URL Query inspection for direct secret reveal link (e.g. ?view=reveal&t=...)
  const [urlPayload, setUrlPayload] = useState(null);
  const [previewPayload, setPreviewPayload] = useState(null);

  useEffect(() => {
    let unsubscribe = () => {};
    let cancel = false;
    (async () => {
      try {
        const identity = await import('@netlify/identity');
        const callback = await identity.handleAuthCallback();
        if (cancel) return;
        if (callback?.type === 'recovery') {
          setRecovery(true);
          setArea('account');
        }
        setUser(await identity.getUser());
        unsubscribe = identity.onAuthChange((_event, next) => setUser(next));
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      cancel = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      const token = params.get('t');
      if (view === 'reveal' && token) {
        const decoded = decodeSecretPayload(token);
        if (decoded) {
          setUrlPayload(decoded);
        }
      }
    } catch (err) {
      console.error('Error parsing URL params:', err);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(EXCHANGE_STORAGE_KEY, JSON.stringify(exchange));
    } catch (e) {
      console.error(e);
    }
  }, [exchange]);

  const handleResetDemoData = () => {
    if (window.confirm('Reset this Secret Santa to the sample group?')) {
      sound.playClick();
      setExchange(sampleExchange());
      localStorage.removeItem(EXCHANGE_STORAGE_KEY);
    }
  };

  const handleStartNewExchange = () => {
    if (!window.confirm('Start a new Secret Santa on this device? The current exchange will be replaced.')) return;
    sound.playClick();
    setExchange(blankExchange());
  };

  const handleLoadSampleExchange = () => {
    sound.playClick();
    setExchange(sampleExchange());
  };

  // If user opened a direct secret link via URL:
  if (urlPayload) {
    return (
      <div className="min-h-screen text-slate-100 relative">
        {snowEnabled && <Snowfall />}
        <SecretRevealView payload={urlPayload} />
      </div>
    );
  }

  // If organizer is previewing a reveal:
  if (previewPayload) {
    return (
      <div className="min-h-screen text-slate-100 relative">
        {snowEnabled && <Snowfall />}
        <SecretRevealView
          payload={previewPayload}
          onBackToOrganizer={() => setPreviewPayload(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-100 relative flex flex-col">
      {snowEnabled && <Snowfall />}

      <Navbar
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        snowEnabled={snowEnabled}
        setSnowEnabled={setSnowEnabled}
        onResetDemoData={handleResetDemoData}
        onOpenInstallModal={() => setShowInstallModal(true)}
        onOpenAffiliateModal={() => setShowAffiliateModal(true)}
        user={user}
        area={area}
        onOpenAccount={() => {
          setAfterAccount(area === 'account' ? 'exchange' : area);
          setArea('account');
        }}
        onOpenAdmin={() => setArea('admin')}
        onOpenWishlist={() => setArea('wishlist')}
        onOpenExchange={() => setArea('exchange')}
      />

      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 z-10">
        <DealBanner />
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 z-10">
        {area === 'account' && (
          <AccountScreen
            user={user}
            recovery={recovery}
            onSignedIn={(next) => {
              setUser(next);
              setRecovery(false);
              setArea(afterAccount === 'account' ? 'exchange' : afterAccount);
            }}
            onSignedOut={() => {
              setUser(null);
              setArea('account');
            }}
            onBack={() => setArea('exchange')}
          />
        )}
        {area === 'admin' && (
          <AdminScreen
            user={user}
            onNeedAccount={() => {
              setAfterAccount('admin');
              setArea('account');
            }}
          />
        )}
        {area === 'wishlist' && (
          <WishListScreen
            user={user}
            onNeedAccount={() => {
              setAfterAccount('wishlist');
              setArea('account');
            }}
          />
        )}
        {area === 'exchange' && (
          <ExchangeScreen
            event={exchange}
            onUpdateEvent={setExchange}
            onPreviewReveal={(payload) => setPreviewPayload(payload)}
            onStartNewExchange={handleStartNewExchange}
            onLoadSample={handleLoadSampleExchange}
          />
        )}
      </main>

      <footer className="z-10 py-6 border-t border-white/5 text-center text-xs text-slate-400 no-print hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            🎁 <strong>GiftLoop</strong> • Secret Santa
          </span>
          <span className="text-slate-400">
            Names stay on this device • Reveal links open in mail and messages
          </span>
        </div>
      </footer>

      {/* iOS Add to Home Screen Instructions Modal */}
      <IosInstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />

      {/* Affiliate Partner & Store Settings Modal */}
      <AffiliateSettingsModal
        key={showAffiliateModal ? 'affiliate-open' : 'affiliate-closed'}
        isOpen={showAffiliateModal}
        onClose={() => setShowAffiliateModal(false)}
      />
    </div>
  );
}

// Background snow particles
function Snowfall() {
  const snowflakes = Array.from({ length: 28 });
  return (
    <div className="snow-container" aria-hidden="true">
      {snowflakes.map((_, i) => {
        const left = (i * 3.7) % 100;
        const duration = 7 + (i % 8) * 1.5;
        const delay = (i % 5) * 1.2;
        const size = 10 + (i % 12);
        const opacity = 0.2 + (i % 5) * 0.12;

        return (
          <div
            key={i}
            className="snowflake"
            style={{
              left: `${left}%`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
              fontSize: `${size}px`,
              opacity,
            }}
          >
            ❄
          </div>
        );
      })}
    </div>
  );
}
