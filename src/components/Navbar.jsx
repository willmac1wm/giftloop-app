import React, { useState } from "react";
import { Gift, Menu, Volume2, VolumeX, Snowflake, RotateCcw, Smartphone, Tag, X } from "lucide-react";
import { sound } from "../utils/audio";
import { staffAccess } from "../account/staff";

export default function Navbar({
  soundEnabled,
  setSoundEnabled,
  snowEnabled,
  setSnowEnabled,
  onResetDemoData,
  onOpenInstallModal,
  onOpenAffiliateModal,
  user,
  area,
  onOpenHome,
  onCreateExchange,
  onOpenAccount,
  onOpenManage,
  onOpenWishlist,
  onOpenWhiteElephant,
  onOpenSupport,
  onOpenMerchants,
}) {
  const [open, setOpen] = useState(false);
  const staff = staffAccess(user);

  const toggleSound = () => {
    const next = !soundEnabled;
    sound.enabled = next;
    setSoundEnabled(next);
    if (next) sound.playClick();
  };

  const go = (action) => {
    sound.playClick();
    setOpen(false);
    action();
  };

  return (
    <header className="site-header">
      <div className="site-header-bar">
        <button type="button" className="brand-button" onClick={() => go(onOpenHome)}>
          <span className="brand-mark" aria-hidden="true">
            <Gift size={20} />
          </span>
          <span>
            <span className="brand-name">GiftLoop</span>
            <span className="brand-tag">Christmas Secret Santa</span>
          </span>
        </button>

        <div className="site-header-actions">
          <button type="button" className="btn btn-primary text-sm" onClick={() => go(onCreateExchange)}>
            Create an exchange
          </button>
          <button
            type="button"
            className="btn btn-secondary text-sm"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={16} /> : <Menu size={16} />}
            Menu
          </button>
        </div>
      </div>

      {open && (
        <nav id="site-menu" className="site-menu" aria-label="More options">
          <button type="button" className={area === "home" ? "is-current" : ""} onClick={() => go(onOpenHome)}>Home</button>
          <button type="button" className={area === "wishlist" ? "is-current" : ""} onClick={() => go(onOpenWishlist)}>Wish list</button>
          <button type="button" className={area === "white-elephant" ? "is-current" : ""} onClick={() => go(onOpenWhiteElephant)}>White Elephant</button>
          <button type="button" className={area === "admin" ? "is-current" : ""} onClick={() => go(onOpenManage)}>Manage exchange</button>
          <button type="button" className={area === "account" ? "is-current" : ""} onClick={() => go(onOpenAccount)}>
            {user?.email ? "Account" : "Sign in"}
          </button>
          <button type="button" onClick={() => go(onOpenAffiliateModal)}>Affiliate tags</button>
          <button type="button" onClick={() => go(onOpenInstallModal)}>Add to iPhone</button>
          <button type="button" onClick={toggleSound}>
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            {soundEnabled ? "Sound on" : "Sound off"}
          </button>
          <button type="button" onClick={() => setSnowEnabled(!snowEnabled)}>
            <Snowflake size={14} />
            {snowEnabled ? "Snow on" : "Snow off"}
          </button>
          <button type="button" onClick={() => go(onResetDemoData)}>
            <RotateCcw size={14} />
            Load sample group
          </button>
          {staff && (
            <button type="button" className={area === "support" ? "is-current" : ""} onClick={() => go(onOpenSupport)}>
              Support tools
            </button>
          )}
          {staff === "admin" && (
            <button type="button" className={area === "merchants" ? "is-current" : ""} onClick={() => go(onOpenMerchants)}>
              Platform merchants
            </button>
          )}
          <p className="site-menu-note">
            <Smartphone size={14} /> <Tag size={14} /> Affiliate tags and the iPhone shortcut stay in this menu.
          </p>
        </nav>
      )}
    </header>
  );
}
