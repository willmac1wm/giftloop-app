import React, { useState } from 'react';
import { Check, Copy, Eye, MessageCircle, Printer, QrCode, Send, Share2 } from 'lucide-react';
import { sound } from '../utils/audio';
import {
  buildRevealPayload,
  buildRevealUrl,
  copyAllText,
  nativeShareText,
  smsText,
  whatsAppText,
} from '../utils/revealLink';
import QRCodeModal from './QRCodeModal';
import PrintCardsModal from './PrintCardsModal';

export default function RevealLinksPanel({ event, onPreviewReveal }) {
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

  const handleWhatsApp = (match) => {
    const url = buildRevealUrl(event, match);
    const text = encodeURIComponent(whatsAppText(event, match.giver.name, url));
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleSMS = (match) => {
    const url = buildRevealUrl(event, match);
    const body = encodeURIComponent(smsText(event, match.giver.name, url));
    window.open(`sms:?body=${body}`, '_blank');
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
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      }
    } else {
      handleCopyLink(match);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <p className="text-xs text-slate-300 max-w-xl">
          Each person gets a private link. Opening it shows only their match. Nothing is emailed.
        </p>
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
              const url = buildRevealUrl(event, match);
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
                        className="glass-input text-xs py-1.5 px-2.5 font-mono text-slate-300 w-full truncate"
                        aria-label={`Reveal link for ${match.giver.name}`}
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
                        title="Open share sheet"
                      >
                        <Share2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleWhatsApp(match)}
                        className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                        title="Share via WhatsApp"
                      >
                        <MessageCircle size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSMS(match)}
                        className="p-2 text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors"
                        title="Share via SMS"
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
                        title="Preview reveal view"
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
          getRevealUrl={(match) => buildRevealUrl(event, match)}
        />
      )}
    </div>
  );
}
