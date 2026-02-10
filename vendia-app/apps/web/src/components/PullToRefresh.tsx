import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const { t } = useTranslation();
  const [startY, setStartY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const THRESHOLD = 60;
  const MAX_PULL = 120;

  const getScrollParent = (node: HTMLElement | null): HTMLElement | Window => {
    if (!node) return window;
    
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    const isScrollable = overflowY !== 'visible' && overflowY !== 'hidden';
    
    if (isScrollable && node.scrollHeight > node.clientHeight) {
      return node;
    }
    
    return getScrollParent(node.parentElement);
  };

  const getScrollTop = (node: HTMLElement | Window) => {
    if (node === window) return window.scrollY;
    return (node as HTMLElement).scrollTop;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing || !containerRef.current) return;
    
    const scrollParent = getScrollParent(containerRef.current);
    const scrollTop = getScrollTop(scrollParent);
    
    // Only allow pull if we are at the top
    if (scrollTop <= 1) { // Use <= 1 to account for minor subpixel differences
      setStartY(e.touches[0].clientY);
    } else {
      setStartY(0);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === 0 || isRefreshing) return;

    // Check scrollTop again
    const scrollParent = getScrollParent(containerRef.current!);
    const scrollTop = getScrollTop(scrollParent);
    
    if (scrollTop > 1) {
        setStartY(0);
        setPullDistance(0);
        return;
    }

    const y = e.touches[0].clientY;
    const diff = y - startY;

    // Only allow pull down
    if (diff > 0) {
      const newDistance = Math.min(diff * 0.4, MAX_PULL); // 0.4 resistance factor
      setPullDistance(newDistance);
    }
  };

  const handleTouchEnd = async () => {
    if (startY === 0 || isRefreshing) return;

    if (pullDistance > THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD); // Snap to loading position
      try {
        await onRefresh();
      } finally {
        // Add a small delay for better UX
        setTimeout(() => {
            setIsRefreshing(false);
            setPullDistance(0);
            setStartY(0);
        }, 500);
      }
    } else {
      // Reset if threshold not met
      setPullDistance(0);
      setStartY(0);
    }
  };

  return (
    <div 
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ 
        minHeight: '100%', 
        overscrollBehaviorY: 'contain' // Prevents browser native pull-to-refresh
      }}
    >
      {/* Pull Indicator / Loading Spinner */}
      <div 
        style={{ 
          height: pullDistance, 
          overflow: 'hidden', 
          transition: isRefreshing ? 'height 0.2s' : pullDistance === 0 ? 'height 0.3s' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          opacity: Math.min(pullDistance / THRESHOLD, 1)
        }}
      >
        <div className="text-center py-2 text-muted">
          {isRefreshing ? (
            <div className="d-flex align-items-center gap-2">
                <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                <small>{t('common.refreshing')}</small>
            </div>
          ) : (
            <div style={{ transform: `rotate(${pullDistance > THRESHOLD ? 180 : 0}deg)`, transition: 'transform 0.2s' }}>
              <i className="bi bi-arrow-down-circle fs-4 text-primary"></i>
            </div>
          )}
        </div>
      </div>
      
      {children}
    </div>
  );
};
