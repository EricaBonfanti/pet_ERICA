import React from "react";
import LogoIcon, { LogoText, LogoSlogan } from "@/components/Logo";

export default function AuthLayout({ title, subtitle, slogan, footer, children }) {
  return (
    <div className="min-h-screen flex flex-col bg-white relative overflow-hidden">
      {/* Fundo branco */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Logo area */}
          <div className="text-center mb-10">
            <div className="flex flex-col items-center gap-3 mb-5">
              <LogoIcon className="w-16 h-16" />
              <LogoText className="text-2xl" />
            </div>
            <h2 className="text-xl font-heading font-semibold text-foreground">{title}</h2>
            {subtitle && <p className="text-muted-foreground text-sm mt-1.5">{subtitle}</p>}
            {slogan && <LogoSlogan className="text-sm mt-1" />}
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            {children}
          </div>

          {footer && (
            <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
          )}
        </div>
      </div>

      {/* Onda suave na parte inferior */}
      <div className="absolute bottom-0 left-0 right-0 z-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
          <path d="M0 60C240 20 480 120 720 80C960 40 1200 100 1440 60V120H0V60Z" fill="#DCEAF6" opacity="0.6"/>
        </svg>
      </div>
    </div>
  );
}