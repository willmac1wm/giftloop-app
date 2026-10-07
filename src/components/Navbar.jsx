import React, { useEffect, useRef, useState } from "react";
import { Gift, Menu, Volume2, VolumeX, Snowflake, RotateCcw, X } from "lucide-react";
import { sound } from "../utils/audio";
import { staffAccess } from "../account/staff";

export default function Navbar({
  soundEnabled,
  setSoundEnabled,
  snowEnabled,
  setSnowEnabled,
  reduceMotion,
  onResetDemoData,
  onOpenInstallModal,
  onOpenAffiliateModal,
  user,
  area,
  primaryLabel,
  onPrimaryAction,
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
  const headerRef = useRef(null);
  const menuButtonRef = useRef(null);
  const staff = staffAccess(user);
  const showCreateInMenu = primaryLabel !== "Create an exchange";

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

  useEffect(() => {
    if (!open) return undefined;
    const menu = headerRef.current?.querySelector("#site-menu button");
    menu?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const onPointer = (event) => {
      if (!headerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <header className="site-header" ref={headerRef}>
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
          <button type="button" className="btn btn-primary text-sm" onClick={() => go(onPrimaryAction)}>
            {primaryLabel}
          </button>
          <button
            ref={menuButtonRef}
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
          {showCreateInMenu && (
            <button type="button" onClick={() => go(onCreateExchange)}>Create another exchange</button>
          )}
          <button type="button" className={area === "wishlist" ? "is-current" : ""} onClick={() => go(onOpenWishlist)}>Wish list</button>
          <button type="button" className={area === "white-elephant" ? "is-current" : ""} onClick={() => go(onOpenWhiteElephant)}>White Elephant</button>
          <button type="button" className={area === "admin" ? "is-current" : ""} onClick={() => go(onOpenManage)}>Manage exchange</button>
          <button type="button" className={area === "account" ? "is-current" : ""} onClick={() => go(onOpenAccount)}>
            Account and support
          </button>
          <button type="button" onClick={() => go(onOpenInstallModal)}>Add to iPhone</button>
          <button type="button" onClick={toggleSound}>
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            {soundEnabled ? "Sound on" : "Sound off"}
          </button>
          <button type="button" onClick={() => setSnowEnabled(!snowEnabled)} disabled={reduceMotion}>
            <Snowflake size={14} />
            {reduceMotion ? "Snow off for reduced motion" : snowEnabled ? "Snow on" : "Snow off"}
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
          {staff === "admin" && (
            <button type="button" onClick={() => go(onOpenAffiliateModal)}>Affiliate tags</button>
          )}
        </nav>
      )}
    </header>
  );
}
