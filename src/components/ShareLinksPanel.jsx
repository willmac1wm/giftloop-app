import React, { useState } from 'react';
import {
  Check, Copy, Eye, MessageCircle, Printer, QrCode, Send, Share2,
} from 'lucide-react';
import { sound } from '../utils/audio';
import { buildRevealPayload, buildRevealUrl } from '../utils/reveal';
import QRCodeModal from './QRCodeModal';
import PrintCardsModal from './PrintCardsModal';

export default function ShareLinksPanel({ event, onPreviewReveal, showIntro = true }) {
  const [activeQR, setActiveQR] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!event.matches) return null;

  const revealUrl = (match) => buildRevealUrl(event, match);

  const handleCopyLink = async (match) => {
    const url = revealUrl(match);
    try {
      await navigator.clipboard.writeText(url);
    } catch (err) {
      console.error(err);
    }
    sound.playClick();
    setCopiedId(match.giver.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllLinks = async () => {
    sound.playClick();
    const text = event.matches.map((match) => {
      return `🎁 ${match.giver.name}: ${revealUrl(match)}`;
    }).join('\n\n');
    try {
      await navigator.clipboard.writeText(`🎄 Secret Santa Links - ${event.title}\n\n${text}`);
    } catch (err) {
      console.error(err);
    }
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleWhatsApp = (match) => {
    const url = revealUrl(match);
    const text = encodeURIComponent(
      `🎄 Hi ${match.giver.name}! Here is your secret Secret Santa draw link for "${event.title}":\n\n${url}\n\nTap to unwrap your match! 🤫`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleSMS = (match) => {
    const url = revealUrl(match);
    const body = encodeURIComponent(
      `Hi ${match.giver.name}! Here is your Secret Santa draw link: ${url}`
    );
    window.open(`sms:?body=${body}`, '_blank');
  };

  const handleNativeShare = async (match) => {
    const url = revealUrl(match);
    sound.playClick();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Secret Santa - ${event.title}`,
          text: `🎄 Hi ${match.giver.name}! Here is your secret Secret Santa draw link. Tap to unwrap:`,
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
    <div className="glass-panel-elevated p-6 border border-emerald-500/30 animate-fade-in space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          {showIntro && (
            <>
              <span className="badge badge-emerald mb-1">
                <Check size={12} /> Draw Completed & Locked
              </span>
              <h2 className="text-2xl font-bold font-heading text-white">
                Shareable Secret Reveal Links
              </h2>
            </>
          )}
          <p className="text-xs text-slate-300 max-w-xl">
            Each person gets only their own link. Opening it unwraps their giftee — the rest of the draw stays on this device.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyAllLinks}
            className="btn btn-secondary text-xs py-2 px-3"
          >
            {copiedAll ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copiedAll ? 'All Copied!' : 'Copy All Links'}
          </button>

          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="btn btn-gold text-xs py-2 px-3"
          >
            <Printer size={14} />
            Print Slips
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-slate-400 border-b border-white/10">
              <th className="py-2.5 px-3">Participant</th>
              <th className="py-2.5 px-3">Secret Link & Sharing</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {event.matches.map((match) => {
              const url = revealUrl(match);
              const isCopied = copiedId === match.giver.id;
              return (
                <tr key={match.giver.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-white">{match.giver.name}</div>
                    <div className="text-xs text-slate-400">
                      {match.giver.email || 'Private link only'}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2 max-w-md">
                      <input
                        type="text"
                        readOnly
                        value={url}
                        aria-label={`Reveal link for ${match.giver.name}`}
                        className="glass-input text-xs py-1.5 px-2.5 font-mono text-slate-300 w-full truncate"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyLink(match)}
                        className="btn btn-secondary text-xs py-1.5 px-2.5 shrink-0"
                        title="Copy link to clipboard"
                      >
                        {isCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        {isCopied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleNativeShare(match)}
                        className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Share"
                        aria-label={`Share ${match.giver.name}'s link`}
                      >
                        <Share2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleWhatsApp(match)}
                        className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                        title="Share via WhatsApp"
                        aria-label={`WhatsApp ${match.giver.name}`}
                      >
                        <MessageCircle size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSMS(match)}
                        className="p-2 text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors"
                        title="Share via SMS"
                        aria-label={`Text ${match.giver.name}`}
                      >
                        <Send size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setActiveQR({ participantName: match.giver.name, url });
                        }}
                        className="p-2 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                        title="Show scannable QR code"
                        aria-label={`QR code for ${match.giver.name}`}
                      >
                        <QrCode size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          onPreviewReveal(buildRevealPayload(event, match));
                        }}
                        className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="Preview reveal"
                        aria-label={`Preview ${match.giver.name}'s reveal`}
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
          getRevealUrl={revealUrl}
        />
      )}
    </div>
  );
}
