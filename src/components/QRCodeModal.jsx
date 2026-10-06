import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Download, ExternalLink, QrCode } from 'lucide-react';
import { sound } from '../utils/audio';

export default function QRCodeModal({ isOpen, onClose, url, participantName, eventTitle }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current && url) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 240,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }, (err) => {
        if (err) console.error(err);
      });
    }
  }, [isOpen, url]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    sound.playClick();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    sound.playClick();
    const link = document.createElement('a');
    link.download = `SecretSanta-QR-${participantName.replace(/\s+/g, '_')}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="glass-panel-elevated w-full max-w-md p-6 relative flex flex-col items-center text-center border border-white/20"
        style={{ background: 'rgba(15, 23, 42, 0.95)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          title="Close"
        >
          <X size={20} />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
          <QrCode size={26} />
        </div>

        <h3 className="text-xl font-bold font-heading text-white mb-1">
          Secret Pass for {participantName}
        </h3>
        <p className="text-sm text-slate-300 mb-5">
          {eventTitle} • Scan with any phone camera to secretly reveal assignment!
        </p>

        {/* QR Canvas Box */}
        <div className="p-4 bg-white rounded-2xl shadow-xl mb-5 border-4 border-emerald-500/40">
          <canvas ref={canvasRef} className="block rounded-lg" />
        </div>

        <p className="text-xs text-slate-400 mb-4 max-w-xs">
          🔒 Only {participantName} should scan this code. Nobody else will see their secret match!
        </p>

        <div className="flex items-center gap-2 w-full">
          <button
            onClick={handleCopy}
            className="flex-1 btn btn-secondary text-sm py-2.5"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            {copied ? 'Copied Link!' : 'Copy Link'}
          </button>

          <button
            onClick={handleDownload}
            className="btn btn-secondary text-sm py-2.5 px-3"
            title="Download QR Image"
          >
            <Download size={16} />
          </button>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary text-sm py-2.5 px-3"
            title="Open Secret Reveal View"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </div>
  );
}
