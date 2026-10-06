import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SecretSantaTab from './components/SecretSantaTab';
import WhiteElephantTab from './components/WhiteElephantTab';
import GiftIdeasTab from './components/GiftIdeasTab';
import SecretRevealView from './components/SecretRevealView';
import IosInstallModal from './components/IosInstallModal';
import MobileBottomNav from './components/MobileBottomNav';
import AffiliateSettingsModal from './components/AffiliateSettingsModal';
import { initialSecretSantaEvent, initialWhiteElephantEvent } from './data/mockData';
import { createBlankSecretSantaEvent, normalizeLoadedEvent } from './data/eventState';
import { decodeSecretPayload } from './utils/crypto';
import { sound } from './utils/audio';

export default function App() {
  const [activeTab, setActiveTab] = useState('secret-santa'); // 'secret-santa' | 'white-elephant' | 'gift-ideas'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [snowEnabled, setSnowEnabled] = useState(true);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showAffiliateModal, setShowAffiliateModal] = useState(false);

  // Persistence for Secret Santa Event
  const [secretSantaEvent, setSecretSantaEvent] = useState(() => {
    try {
      const saved = localStorage.getItem('giftloop_secretsanta_v2');
      const parsed = saved ? JSON.parse(saved) : null;
      return normalizeLoadedEvent(parsed, initialSecretSantaEvent, createBlankSecretSantaEvent);
    } catch {
      return createBlankSecretSantaEvent();
    }
  });

  // Persistence for White Elephant Event
  const [whiteElephantEvent, setWhiteElephantEvent] = useState(() => {
    try {
      const saved = localStorage.getItem('giftloop_whiteelephant_v2');
      return saved ? JSON.parse(saved) : initialWhiteElephantEvent;
    } catch {
      return initialWhiteElephantEvent;
    }
  });

  // URL Query inspection for direct secret reveal link (e.g. ?view=reveal&t=...)
  const [urlPayload, setUrlPayload] = useState(null);
  const [previewPayload, setPreviewPayload] = useState(null);

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

  // Save events whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('giftloop_secretsanta_v2', JSON.stringify(secretSantaEvent));
    } catch (e) {
      console.error(e);
    }
  }, [secretSantaEvent]);

  useEffect(() => {
    try {
      localStorage.setItem('giftloop_whiteelephant_v2', JSON.stringify(whiteElephantEvent));
    } catch (e) {
      console.error(e);
    }
  }, [whiteElephantEvent]);

  const handleResetDemoData = () => {
    if (window.confirm('Reset all games and participants to sample holiday data?')) {
      sound.playClick();
      setSecretSantaEvent(structuredClone(initialSecretSantaEvent));
      setWhiteElephantEvent(structuredClone(initialWhiteElephantEvent));
      localStorage.removeItem('giftloop_secretsanta_v2');
      localStorage.removeItem('giftloop_whiteelephant_v2');
    }
  };

  const handleStartNewExchange = () => {
    if (!window.confirm('Start a new Secret Santa on this device? The current exchange will be replaced.')) return;
    sound.playClick();
    setSecretSantaEvent(createBlankSecretSantaEvent());
  };

  const handleLoadSampleExchange = () => {
    sound.playClick();
    setSecretSantaEvent(structuredClone(initialSecretSantaEvent));
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
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        snowEnabled={snowEnabled}
        setSnowEnabled={setSnowEnabled}
        onResetDemoData={handleResetDemoData}
        onOpenInstallModal={() => setShowInstallModal(true)}
        onOpenAffiliateModal={() => setShowAffiliateModal(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 z-10">
        {activeTab === 'secret-santa' && (
          <SecretSantaTab
            event={secretSantaEvent}
            onUpdateEvent={setSecretSantaEvent}
            onPreviewReveal={(payload) => setPreviewPayload(payload)}
            onStartNewExchange={handleStartNewExchange}
            onLoadSample={handleLoadSampleExchange}
          />
        )}

        {activeTab === 'white-elephant' && (
          <WhiteElephantTab
            event={whiteElephantEvent}
            onUpdateEvent={setWhiteElephantEvent}
          />
        )}

        {activeTab === 'gift-ideas' && (
          <GiftIdeasTab />
        )}
      </main>

      <footer className="z-10 py-6 border-t border-white/5 text-center text-xs text-slate-400 no-print hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            🎁 <strong>GiftLoop</strong> • Privacy-first Secret Santa & White Elephant
          </span>
          <span className="text-slate-400">
            Zero email tracking • All matching & tokens encrypted in browser
          </span>
        </div>
      </footer>

      {/* iOS Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenInstallModal={() => setShowInstallModal(true)}
      />

      {/* iOS Add to Home Screen Instructions Modal */}
      <IosInstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />

      {/* Affiliate Partner & Store Settings Modal */}
      <AffiliateSettingsModal
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
