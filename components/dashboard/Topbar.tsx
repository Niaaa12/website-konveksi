"use client";

import { Bell, ChevronDown, Menu, Moon, Search, Sun } from "lucide-react";
import { useState } from "react";

interface TopbarProps {
    onMenuClick: () => void;
    title: string;
    subtitle?: string;
}

export function TopBar({ onMenuClick, title, subtitle}: TopbarProps){
    const [showNotif, setShowNotif] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    

    const toggleDark = () => {
      setDarkMode(!darkMode);
      document.documentElement.classList.toggle("dark");
    };

    return (
      <header className="sticky top-0 z-10 flex h-16 items-center border-b border-border bg-background/95 backdrop-blur px-4 lg:px-6 gap-4">
        {/* Mobile menu */}
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 hover:bg-accent lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-foreground truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>

        {/* Search */}
        <div className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 w-56">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Dark mode */}
        <button
          onClick={toggleDark}
          className="rounded-lg p-2 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          {darkMode ? (
            <Sun className="h-4.5 w-4.5" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        {/* Notifikasi */}
        <div className="relative">
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="relative rounded-lg p-2 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell className="h-4 w-4" />
          </button>

          {showNotif && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowNotif(false)}
              />
              <div className="absolute right-0 top-full mt-2 z-20 w-80 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-sm font-semibold">Notifikasi</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile */}
        <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
            AS
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
        </button>
      </header>
    );
}