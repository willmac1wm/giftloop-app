import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import SecretRevealView from './components/SecretRevealView';
import IosInstallModal from './components/IosInstallModal';
import AffiliateSettingsModal from './components/AffiliateSettingsModal';
import AccountScreen from './components/AccountScreen';
import HomeScreen from './components/HomeScreen';
import AdminScreen from './components/AdminScreen';
import WishListScreen from './components/WishListScreen';
import InviteScreen from './components/InviteScreen';
import AssignmentScreen from './components/AssignmentScreen';
import SupportScreen from './components/SupportScreen';
import MerchantScreen from './components/MerchantScreen';
import WhiteElephantTab from './components/WhiteElephantTab';
import { initialWhiteElephantEvent } from './data/mockData';
import { clearPrivateRevealNotes } from './account/privacy';
import {
  ExchangeScreen,
  EXCHANGE_STORAGE_KEY,
  loadExchange,
  blankExchange,
  sampleExchange,
} from './games/secretSanta';
import { decodeSecretPayload } from './utils/crypto';
import { sound } from './utils/audio';
import { staffAccess } from './account/staff';
import { NEXT_ACTION_LABEL, deviceNextAction, organizerMatch } from './exchange/progress';
import { buildRevealPayload } from './utils/revealLink';

function entryFromLocation() {
  try {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const token = params.get('t') || '';
    return {
      inviteCode: view === 'invite' || view === 'join' ? params.get('code') || '' : '',
      openJoin: view === 'join',
      assignmentExchangeId: view === 'assignment' ? params.get('exchange') || '' : '',
      revealPayload: view === 'reveal' && token ? decodeSecretPayload(token) : null,
    };
  } catch {
    return { inviteCode: '', openJoin: false, assignmentExchangeId: '', revealPayload: null };
  }
}

export default function App() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [snowEnabled, setSnowEnabled] = useState(true);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showAffiliateModal, setShowAffiliateModal] = useState(false);
  const [savedFocus, setSavedFocus] = useState(null);
  const [reduceMotion, setReduceMotion] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ));
  const [user, setUser] = useState(null);
  const [area, setArea] = useState(() => {
    const start = entryFromLocation();
    if (start.inviteCode) return 'invite';
    if (start.assignmentExchangeId) return 'assignment';
    return 'home';
  });
  const [afterAccount, setAfterAccount] = useState('home');
  const [manageExchangeId, setManageExchangeId] = useState('');
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
  const [urlPayload, setUrlPayload] = useState(() => entryFromLocation().revealPayload);
  const [previewPayload, setPreviewPayload] = useState(null);
  const [inviteCode, setInviteCode] = useState(() => entryFromLocation().inviteCode);
  const [openJoin, setOpenJoin] = useState(() => entryFromLocation().openJoin);
  const [assignmentExchangeId, setAssignmentExchangeId] = useState(() => entryFromLocation().assignmentExchangeId);
  const [whiteElephant, setWhiteElephant] = useState(() => {
    try {
      const saved = localStorage.getItem('giftloop_whiteelephant_v2');
      return saved ? JSON.parse(saved) : structuredClone(initialWhiteElephantEvent);
    } catch {
      return structuredClone(initialWhiteElephantEvent);
    }
  });

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
          const start = entryFromLocation();
          if (start.inviteCode) setAfterAccount('invite');
          else if (start.assignmentExchangeId) setAfterAccount('assignment');
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
      if (view === 'invite' || view === 'join') {
        setInviteCode(params.get('code') || '');
        setOpenJoin(view === 'join');
      }
      if (view === 'assignment') setAssignmentExchangeId(params.get('exchange') || '');
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

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduceMotion(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  const rememberSaved = useCallback((next) => {
    setSavedFocus((current) => {
      if (!next && !current) return current;
      if (next && current && next.id === current.id && next.drawn === current.drawn) return current;
      return next;
    });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('giftloop_whiteelephant_v2', JSON.stringify(whiteElephant));
    } catch (e) {
      console.error(e);
    }
  }, [whiteElephant]);

  const handleResetDemoData = () => {
    if (window.confirm('Reset this Secret Santa to the sample group?')) {
      sound.playClick();
      setExchange(sampleExchange());
      localStorage.removeItem(EXCHANGE_STORAGE_KEY);
    }
  };

  const deviceKind = deviceNextAction(exchange);
  const headerKind = deviceKind === 'create' && savedFocus
    ? (savedFocus.drawn ? 'reveal' : 'continue')
    : deviceKind;

  const openSaved = (id, drawn) => {
    sound.playClick();
    if (drawn) {
      setAssignmentExchangeId(id);
      setAfterAccount('assignment');
      setArea('assignment');
      return;
    }
    setManageExchangeId(id);
    setArea('admin');
  };

  const runPrimary = () => {
    if (deviceKind === 'reveal') {
      const match = organizerMatch(exchange);
      sound.playClick();
      setArea('exchange');
      if (match) setPreviewPayload(buildRevealPayload(exchange, match));
      return;
    }
    if (deviceKind === 'continue') {
      sound.playClick();
      setArea('exchange');
      return;
    }
    if (savedFocus) {
      openSaved(savedFocus.id, savedFocus.drawn);
      return;
    }
    openCreate();
  };

  const openCreate = () => {
    const inProgress = exchange.wizardStep && exchange.wizardStep !== 'start';
    if (inProgress && !window.confirm('Start a new exchange on this device? The current one will be replaced.')) return;
    if (inProgress) setExchange(blankExchange());
    sound.playClick();
    setArea('exchange');
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

  const leaveAccount = () => {
    if (afterAccount === 'invite' && inviteCode) {
      setArea('invite');
      return;
    }
    if (afterAccount === 'assignment' && assignmentExchangeId) {
      setArea('assignment');
      return;
    }
    const next = afterAccount === 'account' || afterAccount === 'invite' || afterAccount === 'assignment' ? 'home' : afterAccount;
    setArea(next);
  };

  const accountBackLabel = afterAccount === 'invite'
    ? 'Back to the invitation'
    : afterAccount === 'assignment'
      ? 'Back to your recipient'
      : 'Back home';

  // If user opened a direct secret link via URL:
  if (urlPayload) {
    return (
      <div className="min-h-screen text-slate-100 relative">
        {snowEnabled && !reduceMotion && <Snowfall />}
        <SecretRevealView payload={urlPayload} />
      </div>
    );
  }

  // If organizer is previewing a reveal:
  if (previewPayload) {
    return (
      <div className="min-h-screen text-slate-100 relative">
        {snowEnabled && !reduceMotion && <Snowfall />}
        <SecretRevealView
          payload={previewPayload}
          onBackToOrganizer={() => setPreviewPayload(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-100 relative flex flex-col">
      {snowEnabled && !reduceMotion && <Snowfall />}

      <Navbar
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        snowEnabled={snowEnabled}
        setSnowEnabled={setSnowEnabled}
        reduceMotion={reduceMotion}
        onResetDemoData={handleResetDemoData}
        onOpenInstallModal={() => setShowInstallModal(true)}
        onOpenAffiliateModal={() => setShowAffiliateModal(true)}
        user={user}
        area={area}
        primaryLabel={NEXT_ACTION_LABEL[headerKind]}
        onPrimaryAction={runPrimary}
        onOpenHome={() => setArea('home')}
        onCreateExchange={openCreate}
        onOpenAccount={() => {
          setAfterAccount(area === 'account' ? 'home' : area);
          setArea('account');
        }}
        onOpenManage={() => setArea('admin')}
        onOpenWishlist={() => setArea('wishlist')}
        onOpenWhiteElephant={() => setArea('white-elephant')}
        onOpenSupport={() => setArea('support')}
        onOpenMerchants={() => setArea('merchants')}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 z-10">
        {area === 'invite' && inviteCode && (
          <InviteScreen
            code={inviteCode}
            openJoin={openJoin}
            user={user}
            onNeedAccount={() => {
              setAfterAccount('invite');
              setArea('account');
            }}
            onDone={() => {
              setInviteCode('');
              setArea('wishlist');
            }}
          />
        )}
        {area === 'assignment' && assignmentExchangeId && (
          <AssignmentScreen
            key={`${user?.id || 'signed-out'}:${assignmentExchangeId}`}
            exchangeId={assignmentExchangeId}
            user={user}
            onNeedAccount={() => {
              setAfterAccount('assignment');
              setArea('account');
            }}
            onOpenWishlist={() => {
              setManageExchangeId(assignmentExchangeId);
              setArea('wishlist');
            }}
          />
        )}
        {area === 'account' && (
          <AccountScreen
            user={user}
            recovery={recovery}
            backLabel={accountBackLabel}
            onSignedIn={(next) => {
              setUser(next);
              setRecovery(false);
              leaveAccount();
            }}
            onSignedOut={() => {
              clearPrivateRevealNotes();
              setUser(null);
              setAssignmentExchangeId('');
              setArea('account');
            }}
            onBack={leaveAccount}
            staff={staffAccess(user)}
            onOpenSupport={() => setArea('support')}
            onOpenMerchants={() => setArea('merchants')}
            onOpenAffiliate={staffAccess(user) === 'admin' ? () => setShowAffiliateModal(true) : null}
          />
        )}
        {area === 'home' && (
          <HomeScreen
            exchange={exchange}
            user={user}
            onCreate={openCreate}
            onContinue={() => setArea('exchange')}
            onReveal={runPrimary}
            onOpenManage={(id) => openSaved(id, false)}
            onRevealSaved={(id) => openSaved(id, true)}
            onSavedFocus={rememberSaved}
          />
        )}
        {area === 'admin' && (
          <AdminScreen
            key={`${user?.id || 'signed-out'}:${manageExchangeId}`}
            user={user}
            initialExchangeId={manageExchangeId}
            onNeedAccount={() => {
              setAfterAccount('admin');
              setArea('account');
            }}
            onOpenWishlist={(id) => {
              setManageExchangeId(id);
              setArea('wishlist');
            }}
            onOpenRecipient={(id) => openSaved(id, true)}
          />
        )}
        {area === 'wishlist' && (
          <WishListScreen
            key={user?.id || 'signed-out'}
            user={user}
            exchangeId={manageExchangeId}
            onNeedAccount={() => {
              setAfterAccount('wishlist');
              setArea('account');
            }}
          />
        )}
        {area === 'white-elephant' && (
          <WhiteElephantTab event={whiteElephant} onUpdateEvent={setWhiteElephant} />
        )}
        {area === 'support' && (
          <SupportScreen
            key={user?.id || 'signed-out'}
            user={user}
            onNeedAccount={() => {
              setAfterAccount('support');
              setArea('account');
            }}
            staff={staffAccess(user)}
          />
        )}
        {area === 'merchants' && (
          <MerchantScreen
            key={user?.id || 'signed-out'}
            user={user}
            onNeedAccount={() => {
              setAfterAccount('merchants');
              setArea('account');
            }}
            onOpenAffiliate={staffAccess(user) === 'admin' ? () => setShowAffiliateModal(true) : null}
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
        <div className="max-w-3xl mx-auto px-4">
          GiftLoop · Christmas Secret Santa
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
