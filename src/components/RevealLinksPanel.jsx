import React, { useState } from 'react';
import { Check, Copy, Eye, Mail, MessageCircle, Printer, QrCode, Send, Share2 } from 'lucide-react';
import { sound } from '../utils/audio';
import { withGiverContact } from '../data/eventState';
import {
  buildRevealPayload,
  buildRevealUrl,
  copyAllText,
  emailHref,
  nativeShareText,
  smsHref,
  smsText,
  whatsAppText,
} from '../utils/revealLink';
import QRCodeModal from './QRCodeModal';
import PrintCardsModal from './PrintCardsModal';

function giverContact(event, giver) {
  const live = (event.participants || []).find((person) => person.id === giver.id) || giver;
  return {
    email: live.email || '',
    phone: live.phone || '',
  };
}

export default function RevealLinksPanel({ event, onPreviewReveal, onUpdateEvent }) {
  const [activeQR, setActiveQR] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!event.matches) return null;

  const handleCopyLink = (match) => {
    const url = buildRevealUrl(event, match);
    navigator.clipboard.writeText(url);
    sound.playClick();
    setCopiedId(match.giver.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllLinks = () => {
    sound.playClick();
    navigator.clipboard.writeText(copyAllText(event, event.matches));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const updateContact = (giverId, fields) => {
    if (!onUpdateEvent) return;
    onUpdateEvent(withGiverContact(event, giverId, fields));
  };

  const handleNativeShare = async (match) => {
    const url = buildRevealUrl(event, match);
    sound.playClick();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Secret Santa - ${event.title}`,
          text: nativeShareText(event, match.giver.name),
          url,
        });
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
      }
    } else {
      handleCopyLink(match);
    }
  };

  return (
    <div className="space-y-4">
      <p className="privacy-note" role="note">
        Each link is a guest reveal. Anyone who receives it can open it and see that person&apos;s match. Email, text, copy, QR, and print open your own apps. GiftLoop does not send these links.
      </p>

      <div className="space-y-3">
        {event.matches.map((match) => {
          const url = buildRevealUrl(event, match);
          const contact = giverContact(event, match.giver);
          const isCopied = copiedId === match.giver.id;
          const mailLink = emailHref(event, match.giver.name, contact.email, url);
          const textLink = smsHref(contact.phone, smsText(event, match.giver.name, url));
          return (
            <article key={match.giver.id} className="friend-card">
              <div className="friend-card-head">
                <h3 className="font-semibold text-white">{match.giver.name}</h3>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onPreviewReveal(buildRevealPayload(event, match));
                  }}
                  className="btn btn-secondary text-xs py-1.5 px-2.5"
                >
                  <Eye size={13} />
                  Preview
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="email"
                  value={contact.email}
                  onChange={(e) => updateContact(match.giver.id, { email: e.target.value })}
                  placeholder="Email"
                  aria-label={`Email for ${match.giver.name}`}
                  className="glass-input w-full text-sm"
                  autoComplete="off"
                />
                <input
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => updateContact(match.giver.id, { phone: e.target.value })}
                  placeholder="Mobile number"
                  aria-label={`Mobile for ${match.giver.name}`}
                  className="glass-input w-full text-sm"
                  autoComplete="off"
                />
              </div>
              {!contact.email && !contact.phone && (
                <p className="text-xs text-slate-400">
                  Add an email or mobile so Email and Text open already addressed to {match.giver.name}.
                </p>
              )}
              <details className="share-menu">
                <summary>
                  <Share2 size={15} />
                  Share {match.giver.name}&apos;s link
                </summary>
                <div className="share-menu-list">
                  <p className="privacy-note" role="note">
                    This guest link is for {match.giver.name}. Anyone who receives it can open it and see their match. The choices below open your own apps. GiftLoop does not send this link.
                  </p>
                  <a href={mailLink}><Mail size={15} /> Email — opens your mail app</a>
                  <a href={textLink}><Send size={15} /> Text — opens your messages app</a>
                  <button type="button" onClick={() => handleCopyLink(match)}>
                    {isCopied ? <Check size={15} /> : <Copy size={15} />}
                    {isCopied ? 'Link copied' : 'Copy link'}
                  </button>
                  <button type="button" onClick={() => handleNativeShare(match)}>
                    <Share2 size={15} /> Device share sheet
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const text = encodeURIComponent(whatsAppText(event, match.giver.name, url));
                      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                    }}
                  >
                    <MessageCircle size={15} /> WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setActiveQR({ participantName: match.giver.name, url });
                    }}
                  >
                    <QrCode size={15} /> QR code
                  </button>
                  <input
                    type="text"
                    readOnly
                    value={url}
                    className="glass-input text-xs py-1.5 px-2.5 font-mono text-slate-300 w-full"
                    aria-label={`Reveal link for ${match.giver.name}`}
                  />
                </div>
              </details>
            </article>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleCopyAllLinks} className="btn btn-secondary text-xs">
          {copiedAll ? <Check size={14} /> : <Copy size={14} />}
          {copiedAll ? 'All links copied' : 'Copy all links'}
        </button>
        <button type="button" onClick={() => setShowPrintModal(true)} className="btn btn-secondary text-xs">
          <Printer size={14} />
          Print
        </button>
      </div>

      {activeQR && (
        <QRCodeModal
          isOpen={true}
          onClose={() => setActiveQR(null)}
          participantName={activeQR.participantName}
          url={activeQR.url}
          eventTitle={event.title}
        />
      )}

      {showPrintModal && (
        <PrintCardsModal
          isOpen={true}
          onClose={() => setShowPrintModal(false)}
          event={event}
          matches={event.matches}
          getRevealUrl={(match) => buildRevealUrl(event, match)}
        />
      )}
    </div>
  );
}
