import React from 'react';
import { motion } from 'framer-motion';

export default function StatsCard({ title, value, icon: Icon, trend }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {title}
          </p>
          <p className="text-2xl font-heading font-bold text-slate-800 mt-1">{value}</p>
          {trend && (
            <p className="text-xs text-[#2E75B6] font-medium mt-1">{trend}</p>
          )}
        </div>
        <div className="p-2.5 rounded-xl bg-[#DCEAF6]">
          <Icon className="w-5 h-5 text-[#2E75B6]" strokeWidth={1.75} />
        </div>
      </div>
    </motion.div>
  );
}