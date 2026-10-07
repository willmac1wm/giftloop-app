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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <p className="text-sm text-slate-300 max-w-xl">
          Email and text are the way to send each private link. Your own mail and messages apps send them. Gift Loop never sees the message.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleCopyAllLinks} className="btn btn-secondary text-xs py-2 px-3">
            {copiedAll ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copiedAll ? 'All Copied!' : 'Copy All Links'}
          </button>
          <button type="button" onClick={() => setShowPrintModal(true)} className="btn btn-gold text-xs py-2 px-3">
            <Printer size={14} />
            Print Slips
          </button>
        </div>
      </div>

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
              <div className="flex flex-wrap gap-2">
                <a className="btn btn-primary text-sm" href={mailLink}>
                  <Mail size={15} />
                  Email link
                </a>
                <a className="btn btn-text text-sm" href={textLink}>
                  <Send size={15} />
                  Text link
                </a>
              </div>
              {!contact.email && !contact.phone && (
                <p className="text-xs text-slate-400">
                  Add an email or mobile so the button opens already addressed to {match.giver.name}.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={() => handleCopyLink(match)} className="btn btn-secondary text-xs py-1.5 px-2.5">
                  {isCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  {isCopied ? 'Copied' : 'Copy link'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary text-xs py-1.5 px-2.5"
                  onClick={() => {
                    const text = encodeURIComponent(whatsAppText(event, match.giver.name, url));
                    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                  }}
                >
                  <MessageCircle size={13} />
                  WhatsApp
                </button>
                <button
                  type="button"
                  className="btn btn-secondary text-xs py-1.5 px-2.5"
                  onClick={() => handleNativeShare(match)}
                >
                  <Share2 size={13} />
                  Share
                </button>
                <button
                  type="button"
                  className="btn btn-secondary text-xs py-1.5 px-2.5"
                  onClick={() => {
                    sound.playClick();
                    setActiveQR({ participantName: match.giver.name, url });
                  }}
                >
                  <QrCode size={13} />
                  QR
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={url}
                className="glass-input text-xs py-1.5 px-2.5 font-mono text-slate-300 w-full"
                aria-label={`Reveal link for ${match.giver.name}`}
              />
            </article>
          );
        })}
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
