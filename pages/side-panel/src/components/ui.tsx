import React from "react";
import { motion } from "framer-motion";
import { cn } from '@extension/ui';

// Basic UI Components
export const Button = ({ className = "", children, ...props }: any) => (
  <motion.button
    {...props}
    whileTap={{ scale: 0.95 }}
    whileHover={{ scale: 1.02 }}
    transition={{ type: "spring", stiffness: 400, damping: 17 }}
    className={cn(
      "inline-flex items-center justify-center select-none outline-none transition-all duration-200",
      "rounded-2xl border border-philonet-border-light bg-transparent text-white font-light tracking-philonet-wide",
      "hover:text-philonet-blue-500 hover:border-philonet-blue-500 hover:shadow-lg hover:shadow-philonet-blue-500/20",
      "active:shadow-inner focus-visible:ring-0",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
      className
    )}
  >
    {children}
  </motion.button>
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, any>(({ className = "", rows = 1, style = {}, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    {...props}
    style={{
      // Subtle scrollbar styling
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(75, 85, 99, 0.3) transparent',
      // Completely remove all outlines
      outline: 'none',
      border: 'none',
      boxShadow: 'none',
      ...style,
    }}
    className={cn(
      "w-full bg-transparent text-white resize-none border-none",
      "placeholder:text-philonet-text-subtle font-light tracking-philonet-tight leading-6",
      "focus:outline-none focus:ring-0 focus:border-transparent focus:shadow-none",
      "focus-visible:outline-none focus-visible:ring-0 focus-visible:border-transparent",
      "active:outline-none active:ring-0 active:border-transparent",
      "transition-all duration-200",
      // Custom webkit scrollbar styling for Chrome/Safari
      "[&::-webkit-scrollbar]:w-1",
      "[&::-webkit-scrollbar]:h-1",
      "[&::-webkit-scrollbar-track]:bg-transparent",
      "[&::-webkit-scrollbar-thumb]:bg-gray-600/20",
      "[&::-webkit-scrollbar-thumb]:rounded-full",
      "[&::-webkit-scrollbar-thumb:hover]:bg-gray-500/30",
      className
    )}
  />
));

export const ScrollArea = React.forwardRef<HTMLDivElement, any>(({ className = "", children, ...props }, ref) => (
  <div 
    ref={ref} 
    {...props} 
    className={cn("overflow-x-auto overflow-y-auto philonet-scrollbar", className)}
    style={{
      scrollbarWidth: 'thin',
      scrollbarColor: '#374151 #1f2937'
    }}
  >
    {children}
  </div>
));

// Loading ring component
export function LoaderRing({ value, total, size = 36, stroke = 2, color = "#3b82f6" }: any) {
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const pct = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
  
  return (
    <div className="relative select-none" style={{ width: size, height: size }} aria-label={`Progress ${value}/${total}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0" aria-hidden="true">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#262626" strokeWidth={stroke} />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: pct, rotate: -90, opacity: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-[10px] tabular-nums text-philonet-blue-400 font-medium">
        {value}/{total}
      </div>
    </div>
  );
}
