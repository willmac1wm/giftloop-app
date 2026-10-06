import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Users, Gift, Flame, Snowflake, RotateCcw, Play, CheckCircle2, 
  AlertTriangle, Shuffle, Plus, Trash2, ArrowRight, History, Sparkles, Trophy
} from 'lucide-react';
import { sound } from '../utils/audio';
import { shuffleArray } from '../utils/shuffle';

const GIFT_ICONS = ['🎁', '☕', '🌶️', '🎮', '🕯️', '🧣', '🍺', '🍫', '📻', '🧦', '🪴', '📚'];

export default function WhiteElephantTab({ event, onUpdateEvent }) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [showUnwrapModal, setShowUnwrapModal] = useState(false);
  const [unwrapGiftName, setUnwrapGiftName] = useState('');
  const [unwrapGiftIcon, setUnwrapGiftIcon] = useState('🎁');
  const [unwrapGiftNotes, setUnwrapGiftNotes] = useState('');
  const [activeRobbedPlayer, setActiveRobbedPlayer] = useState(null); // When a player gets robbed and needs to act

  const {
    title = 'White Elephant Gala',
    maxStealsPerGift = 3,
    roundOneRedemption = true,
    players = [],
    currentTurn = 1,
    gameStage = 'setup', // 'setup' | 'in_progress' | 'completed'
    gifts = [],
    logs = [],
  } = event;

  // Find whose turn it currently is
  const currentPlayer = activeRobbedPlayer || players.find((p) => p.order === currentTurn);
  const isFinalRound = currentTurn > players.length;

  const handleAddPlayer = (e) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    sound.playClick();
    const newPlayer = {
      id: 'we_' + Date.now(),
      name: newPlayerName.trim(),
      order: players.length + 1,
    };
    onUpdateEvent({
      ...event,
      players: [...players, newPlayer],
    });
    setNewPlayerName('');
  };

  const handleRemovePlayer = (id) => {
    sound.playClick();
    const updated = players
      .filter((p) => p.id !== id)
      .map((p, idx) => ({ ...p, order: idx + 1 }));
    onUpdateEvent({
      ...event,
      players: updated,
    });
  };

  const handleShuffleOrder = () => {
    sound.playChime();
    const shuffledNames = shuffleArray(players);
    const reordered = shuffledNames.map((p, idx) => ({
      ...p,
      order: idx + 1,
    }));
    onUpdateEvent({
      ...event,
      players: reordered,
    });
  };

  const handleStartGame = () => {
    if (players.length < 2) return;
    sound.playChime();
    onUpdateEvent({
      ...event,
      gameStage: 'in_progress',
      currentTurn: 1,
      gifts: [],
      logs: [{
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Game started! Turn order set for ${players.length} players.`,
      }],
    });
  };

  const handleOpenUnwrapModal = () => {
    sound.playClick();
    setUnwrapGiftName('');
    setUnwrapGiftIcon(GIFT_ICONS[Math.floor(Math.random() * GIFT_ICONS.length)]);
    setUnwrapGiftNotes('');
    setShowUnwrapModal(true);
  };

  const handleConfirmUnwrap = (e) => {
    e.preventDefault();
    if (!unwrapGiftName.trim() || !currentPlayer) return;

    sound.playUnwrap();
    setShowUnwrapModal(false);

    const newGift = {
      id: 'gift_' + Date.now(),
      name: unwrapGiftName.trim(),
      icon: unwrapGiftIcon,
      notes: unwrapGiftNotes.trim(),
      originalOpener: currentPlayer.name,
      currentHolder: currentPlayer.name,
      stealsCount: 0,
      history: [currentPlayer.name],
    };

    const newLogs = [
      {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `🎁 ${currentPlayer.name} unwrapped "${newGift.name}"!`,
      },
      ...logs,
    ];

    let nextTurn = currentTurn;
    let nextRobbedPlayer = null;
    let nextStage = gameStage;

    if (activeRobbedPlayer) {
      // Robbed player unwrapped a new gift -> turn resolves back to normal schedule
      nextRobbedPlayer = null;
      nextTurn = currentTurn + 1;
    } else {
      nextTurn = currentTurn + 1;
    }

    if (nextTurn > players.length) {
      if (roundOneRedemption) {
        // Player 1 gets final steal chance if they didn't already
        nextStage = 'completed';
      } else {
        nextStage = 'completed';
      }
    }

    onUpdateEvent({
      ...event,
      gifts: [...gifts, newGift],
      currentTurn: nextTurn,
      gameStage: nextStage,
      logs: newLogs,
    });
    setActiveRobbedPlayer(nextRobbedPlayer);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#10b981', '#fbbf24', '#f43f5e'],
    });
  };

  const handleStealGift = (gift) => {
    if (!currentPlayer) return;
    if (gift.currentHolder === currentPlayer.name) return;
    if (gift.stealsCount >= maxStealsPerGift) return;

    const previousHolder = gift.currentHolder;
    const nextStealsCount = gift.stealsCount + 1;
    const isNowFrozen = nextStealsCount >= maxStealsPerGift;

    if (isNowFrozen) {
      sound.playFreeze();
    } else {
      sound.playSteal();
    }

    const updatedGifts = gifts.map((g) => {
      if (g.id === gift.id) {
        return {
          ...g,
          currentHolder: currentPlayer.name,
          stealsCount: nextStealsCount,
          history: [...g.history, currentPlayer.name],
        };
      }
      return g;
    });

    const actionText = isNowFrozen
      ? `❄️ ${currentPlayer.name} STOLE "${gift.name}" from ${previousHolder}! It is now FROZEN!`
      : `🔥 ${currentPlayer.name} STOLE "${gift.name}" from ${previousHolder}! (${nextStealsCount}/${maxStealsPerGift} steals)`;

    const newLogs = [
      {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: actionText,
      },
      ...logs,
    ];

    // The robbed person now needs to either steal another gift or unwrap a new one!
    const robbedObj = players.find((p) => p.name === previousHolder) || { name: previousHolder };
    setActiveRobbedPlayer(robbedObj);

    onUpdateEvent({
      ...event,
      gifts: updatedGifts,
      logs: newLogs,
    });
  };

  const handleFinishGame = () => {
    sound.playChime();
    onUpdateEvent({
      ...event,
      gameStage: 'completed',
    });
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#f59e0b', '#10b981', '#f43f5e', '#38bdf8'],
    });
  };

  const handleResetGame = () => {
    sound.playClick();
    onUpdateEvent({
      ...event,
      gameStage: 'setup',
      currentTurn: 1,
      gifts: [],
      logs: [],
    });
    setActiveRobbedPlayer(null);
  };

  return (
    <div className="space-y-6">
      {/* Game Header & Rules */}
      <div className="glass-panel p-5 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="badge badge-gold mb-1">
            <Flame size={12} /> Interactive Steal Arena
          </span>
          <h2 className="text-2xl font-bold font-heading text-white">
            {title}
          </h2>
          <p className="text-xs text-slate-300">
            Max {maxStealsPerGift} steals per gift before frozen • Real-time steal & turn tracker
          </p>
        </div>

        <div className="flex items-center gap-3">
          {gameStage !== 'setup' && (
            <button
              onClick={handleResetGame}
              className="btn btn-secondary text-xs py-2 px-3"
            >
              <RotateCcw size={14} /> Reset Game
            </button>
          )}

          {gameStage === 'in_progress' && (
            <button
              onClick={handleFinishGame}
              className="btn btn-gold text-xs py-2 px-3.5"
            >
              <Trophy size={14} /> Complete Game
            </button>
          )}
        </div>
      </div>

      {/* STAGE 1: SETUP PHASE */}
      {gameStage === 'setup' && (
        <div className="glass-panel-elevated p-6 border border-white/20 space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div>
              <h3 className="text-lg font-bold font-heading text-white flex items-center gap-2">
                <Users size={20} className="text-amber-400" />
                Player Draft & Turn Order ({players.length} Players)
              </h3>
              <p className="text-xs text-slate-400">
                Randomize the player order below or manually arrange who goes first.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShuffleOrder}
                className="btn btn-secondary text-xs py-2 px-3"
              >
                <Shuffle size={14} className="text-amber-400" />
                Shuffle Order
              </button>

              <button
                onClick={handleStartGame}
                disabled={players.length < 2}
                className="btn btn-primary text-xs py-2 px-4 shadow-lg shadow-emerald-500/20 disabled:opacity-40"
              >
                <Play size={14} /> Start Game
              </button>
            </div>
          </div>

          {/* Quick Add Player Input */}
          <form onSubmit={handleAddPlayer} className="flex gap-2 max-w-md">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Enter player name..."
              className="glass-input flex-1 text-sm"
            />
            <button type="submit" className="btn btn-secondary text-xs py-2 px-3.5 shrink-0">
              <Plus size={15} /> Add
            </button>
          </form>

          {/* Reordered Players Grid */}
          {players.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-slate-400">
              No players yet. Add your group here, or load the sample party from the header.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {players.map((p, idx) => (
              <div
                key={p.id}
                className="p-3.5 rounded-xl bg-slate-800/40 border border-white/5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 font-bold font-heading flex items-center justify-center text-sm border border-amber-500/30">
                    #{idx + 1}
                  </div>
                  <span className="font-semibold text-white text-sm">{p.name}</span>
                </div>
                <button
                  onClick={() => handleRemovePlayer(p.id)}
                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          {/* Rules Config bar */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4">
              <label className="text-slate-300">
                Max Steals per Gift before Frozen:
                <select
                  value={maxStealsPerGift}
                  onChange={(e) => onUpdateEvent({ ...event, maxStealsPerGift: Number(e.target.value) })}
                  className="glass-input text-xs py-1 px-2 ml-2"
                >
                  <option value={2}>2 Steals</option>
                  <option value={3}>3 Steals (Standard)</option>
                  <option value={4}>4 Steals</option>
                  <option value={99}>Unlimited</option>
                </select>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={roundOneRedemption}
                  onChange={(e) => onUpdateEvent({ ...event, roundOneRedemption: e.target.checked })}
                  className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span>Player #1 Final Redemption Round (Can steal at end)</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 2: IN PROGRESS ARENA */}
      {gameStage === 'in_progress' && (
        <div className="space-y-6 animate-fade-in">
          {/* Active Turn Controller Card */}
          <div className="glass-panel-elevated p-6 border-2 border-amber-500/40 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {activeRobbedPlayer ? (
                    <span className="badge badge-ruby animate-pulse">
                      <Flame size={12} /> Gift Stolen! Action Required
                    </span>
                  ) : (
                    <span className="badge badge-gold">
                      Turn {currentTurn} of {players.length}
                    </span>
                  )}
                </div>

                <h3 className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
                  {currentPlayer ? currentPlayer.name : 'Everyone has taken a turn!'}
                </h3>
                <p className="text-sm text-slate-300 mt-1 max-w-lg">
                  {activeRobbedPlayer
                    ? `${currentPlayer.name}'s gift was just stolen! They may steal any eligible unlocked gift, or unwrap a fresh mystery gift.`
                    : `${currentPlayer ? currentPlayer.name : 'Next player'} can choose to unwrap a brand new wrapped gift or STEAL an open gift below!`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleOpenUnwrapModal}
                  className="btn btn-primary text-sm py-3 px-5 shadow-lg shadow-emerald-500/30"
                >
                  <Gift size={18} />
                  Unwrap New Gift
                </button>
              </div>
            </div>
          </div>

          {/* Gifts on the Table Arena */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold font-heading text-white flex items-center gap-2">
                <Gift size={20} className="text-emerald-400" />
                Gifts in Play ({gifts.length})
              </h3>
              <span className="text-xs text-slate-400">
                Click "Steal" on any eligible gift to claim it
              </span>
            </div>

            {gifts.length === 0 ? (
              <div className="glass-panel p-10 text-center text-slate-400 text-sm border-dashed">
                🎁 No gifts unwrapped yet! {currentPlayer?.name} can click "Unwrap New Gift" to kick off the game!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {gifts.map((g) => {
                  const isFrozen = g.stealsCount >= maxStealsPerGift;
                  const isHeldByCurrent = currentPlayer && g.currentHolder === currentPlayer.name;
                  const canSteal = !isFrozen && !isHeldByCurrent && currentPlayer;

                  return (
                    <div
                      key={g.id}
                      className={`glass-panel p-5 border transition-all flex flex-col justify-between relative overflow-hidden ${
                        isFrozen
                          ? 'border-sky-400/50 bg-sky-950/20 shadow-lg shadow-sky-500/10'
                          : 'border-white/10 hover:border-white/25'
                      }`}
                    >
                      {isFrozen && (
                        <div className="absolute top-2 right-2">
                          <span className="badge badge-frozen">
                            <Snowflake size={12} /> FROZEN ({maxStealsPerGift}/{maxStealsPerGift})
                          </span>
                        </div>
                      )}

                      <div>
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-12 h-12 rounded-2xl bg-white/10 text-2xl flex items-center justify-center border border-white/15">
                            {g.icon}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-base font-heading">
                              {g.name}
                            </h4>
                            <p className="text-xs text-slate-400">
                              Opened by {g.originalOpener}
                            </p>
                          </div>
                        </div>

                        {g.notes && (
                          <p className="text-xs text-slate-300 italic mb-3">
                            "{g.notes}"
                          </p>
                        )}

                        <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1.5 mb-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Current Holder:</span>
                            <span className="font-bold text-emerald-400">{g.currentHolder}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Steals Used:</span>
                            <span className={`font-semibold ${isFrozen ? 'text-sky-400' : 'text-amber-400'}`}>
                              {g.stealsCount} / {maxStealsPerGift}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <button
                          onClick={() => handleStealGift(g)}
                          disabled={!canSteal}
                          className={`btn w-full text-xs py-2.5 transition-all ${
                            isFrozen
                              ? 'btn-secondary opacity-40 cursor-not-allowed'
                              : isHeldByCurrent
                              ? 'btn-secondary opacity-50 cursor-not-allowed'
                              : 'btn-ruby shadow-md shadow-rose-500/20'
                          }`}
                        >
                          {isFrozen ? (
                            <>
                              <Snowflake size={14} /> Frozen (Cannot Steal)
                            </>
                          ) : isHeldByCurrent ? (
                            'You Hold This Gift'
                          ) : (
                            <>
                              <Flame size={14} /> Steal Gift from {g.currentHolder}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Real-time Activity Log */}
          <div className="glass-panel p-5 border border-white/10">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-3">
              <History size={14} /> Live Game Action Feed
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-1.5 text-xs font-mono">
              {logs.map((log, idx) => (
                <div key={idx} className="text-slate-300 flex items-center gap-2">
                  <span className="text-slate-500">[{log.time}]</span>
                  <span>{log.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3: GAME COMPLETED */}
      {gameStage === 'completed' && (
        <div className="glass-panel-elevated p-8 text-center border-2 border-emerald-500/40 animate-fade-in space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-xl">
            <Trophy size={36} />
          </div>

          <div>
            <span className="badge badge-emerald mb-2">Game Complete</span>
            <h3 className="text-3xl font-extrabold font-heading text-white">
              White Elephant Exchange Final Results! 🎄
            </h3>
            <p className="text-sm text-slate-300 max-w-md mx-auto mt-1">
              All turns and steals are concluded. Here is what everyone is taking home:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-left">
            {gifts.map((g) => (
              <div key={g.id} className="p-4 rounded-xl bg-slate-900/80 border border-white/10 flex items-center gap-3">
                <span className="text-3xl">{g.icon}</span>
                <div>
                  <h4 className="font-bold text-white text-sm">{g.name}</h4>
                  <p className="text-xs text-emerald-400 font-semibold">
                    Winner: {g.currentHolder}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Steals: {g.stealsCount}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-center gap-3">
            <button onClick={handleResetGame} className="btn btn-secondary text-xs">
              <RotateCcw size={14} /> Play Again
            </button>
          </div>
        </div>
      )}

      {/* Unwrap New Gift Modal */}
      {showUnwrapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div 
            className="glass-panel-elevated w-full max-w-md p-6 relative border border-white/20"
            style={{ background: 'rgba(15, 23, 42, 0.95)' }}
          >
            <h3 className="text-lg font-bold font-heading text-white mb-1 flex items-center gap-2">
              <Gift size={20} className="text-emerald-400" />
              Unwrap New Mystery Gift
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Opening for <strong>{currentPlayer?.name}</strong>
            </p>

            <form onSubmit={handleConfirmUnwrap} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Gift Title / Item Name *</label>
                <input
                  type="text"
                  required
                  value={unwrapGiftName}
                  onChange={(e) => setUnwrapGiftName(e.target.value)}
                  placeholder="e.g. Electric Kettle, Giant Burrito Blanket..."
                  className="glass-input w-full text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Pick an Icon</label>
                <div className="flex flex-wrap gap-2">
                  {GIFT_ICONS.map((icon) => (
                    <button
                      type="button"
                      key={icon}
                      onClick={() => setUnwrapGiftIcon(icon)}
                      className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border transition-all ${
                        unwrapGiftIcon === icon
                          ? 'border-emerald-400 bg-emerald-500/20 scale-110'
                          : 'border-white/10 bg-slate-800/40 hover:bg-white/10'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Fun description / gag note (Optional)</label>
                <input
                  type="text"
                  value={unwrapGiftNotes}
                  onChange={(e) => setUnwrapGiftNotes(e.target.value)}
                  placeholder="e.g. Includes batteries; someone fought hard for this!"
                  className="glass-input w-full text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUnwrapModal(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-xs">
                  Reveal & Place on Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
