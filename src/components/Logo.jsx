import React from 'react';
import petlifyIcon from '@/assets/petlify-icon.png';
import petlifyIconWhite from '@/assets/petlify-icon-white.png';

export default function LogoIcon({ className = 'w-10 h-10', variant = 'default' }) {
  return (
    <img
      src={variant === 'white' ? petlifyIconWhite : petlifyIcon}
      alt="Petlify"
      className={`object-contain ${className}`}
    />
  );
}

export function LogoText({ className = '' }) {
  return (
    <span className={`font-heading font-bold text-[#2E75B6] tracking-tight ${className}`}>
      Petlify
    </span>
  );
}

export function LogoSlogan({ className = '' }) {
  return (
    <span className={`text-[#6BA3D6] font-medium tracking-wide ${className}`}>
      O app do seu pet
    </span>
  );
}