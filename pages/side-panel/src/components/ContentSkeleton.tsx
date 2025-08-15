import React from 'react';
import { motion } from 'framer-motion';

const ContentSkeleton: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="px-6 md:px-8 lg:px-10 xl:px-12"
    >
      {/* Skeleton for thumbnail */}
      <div className="relative group mb-12 md:mb-16">
        <div className="relative rounded-3xl overflow-hidden bg-philonet-panel/20 h-[200px] md:h-[280px] lg:h-[320px] border border-philonet-border/10">
          {/* Animated shimmer effect */}
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        </div>
      </div>

      {/* Skeleton for title section */}
      <div className="mb-12 md:mb-16">
        <div className="flex items-start gap-4 md:gap-6">
          <div className="flex-1">
            {/* Title skeleton lines */}
            <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
              <div className="relative overflow-hidden h-8 md:h-12 lg:h-14 xl:h-16 bg-philonet-panel/30 rounded-lg w-[90%]">
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/8 to-transparent"></div>
              </div>
              <div className="relative overflow-hidden h-6 md:h-8 lg:h-10 bg-philonet-panel/30 rounded-lg w-[70%]">
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/8 to-transparent"></div>
              </div>
            </div>
            
            {/* Category skeleton */}
            <div className="mb-4">
              <div className="relative overflow-hidden inline-flex items-center px-3 py-1.5 bg-philonet-panel/30 rounded-full w-24 h-7">
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/8 to-transparent"></div>
              </div>
            </div>
          </div>
          
          {/* Action buttons skeleton */}
          <div className="flex items-center gap-3 mt-2 md:mt-4">
            <div className="relative overflow-hidden px-3 py-2 md:px-4 md:py-2.5 rounded-xl bg-philonet-panel/30 w-16 md:w-20 h-8 md:h-10">
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/8 to-transparent"></div>
            </div>
            <div className="relative overflow-hidden w-10 h-10 md:w-12 md:h-12 rounded-full bg-philonet-panel/30">
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/8 to-transparent"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Skeleton for description */}
      <div className="relative mb-12 md:mb-16">
        <div className="relative rounded-3xl bg-philonet-panel/20 border border-philonet-border/10 px-8 md:px-10 lg:px-12 py-8 md:py-10 lg:py-12">
          <div className="space-y-4 md:space-y-5">
            {/* First letter + text placeholder */}
            <div className="flex items-start gap-4">
              <div className="relative overflow-hidden w-12 h-12 md:w-16 md:h-16 bg-philonet-panel/40 rounded-sm flex-shrink-0">
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="relative overflow-hidden h-4 md:h-5 lg:h-6 bg-philonet-panel/30 rounded w-[95%]">
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/8 to-transparent"></div>
                </div>
                <div className="relative overflow-hidden h-4 md:h-5 lg:h-6 bg-philonet-panel/30 rounded w-[85%]">
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/8 to-transparent"></div>
                </div>
              </div>
            </div>
            
            {/* Additional text lines */}
            <div className="space-y-3">
              {[90, 80, 75].map((width, index) => (
                <div key={index} className={`relative overflow-hidden h-4 md:h-5 lg:h-6 bg-philonet-panel/30 rounded`} style={{ width: `${width}%` }}>
                  <div 
                    className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/8 to-transparent"
                    style={{ animationDelay: `${index * 0.2}s` }}
                  ></div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Accent line skeleton */}
          <div className="absolute left-0 top-8 bottom-8 w-1.5 bg-philonet-panel/40 rounded-r-full overflow-hidden">
            <div className="absolute inset-0 -translate-y-full animate-pulse bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
          </div>
        </div>
      </div>

      {/* Skeleton for content sections */}
      <div className="space-y-8 md:space-y-12">
        {[1, 2, 3].map((section) => (
          <div key={section} className="space-y-4">
            {/* Section title */}
            <div className="relative overflow-hidden h-6 md:h-8 bg-philonet-panel/30 rounded w-[60%]">
              <div 
                className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/8 to-transparent"
                style={{ animationDelay: `${section * 0.3}s` }}
              ></div>
            </div>
            
            {/* Section content */}
            <div className="space-y-3">
              {[1, 2, 3, 4].map((line) => (
                <div 
                  key={line} 
                  className="relative overflow-hidden h-4 bg-philonet-panel/30 rounded"
                  style={{ width: `${Math.random() * 30 + 70}%` }}
                >
                  <div 
                    className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/8 to-transparent"
                    style={{ animationDelay: `${(section * 4 + line) * 0.1}s` }}
                  ></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default ContentSkeleton;
