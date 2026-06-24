import React from 'react';
import { motion } from 'framer-motion';

export default function Spinner({ size = 'md', label = 'Carregando...' }) {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <motion.div
        className={`${sizes[size]} border-3 border-muted border-t-primary rounded-full`}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        style={{ borderWidth: size === 'sm' ? 2 : 3 }}
      />
      {label && (
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
      )}
    </div>
  );
}