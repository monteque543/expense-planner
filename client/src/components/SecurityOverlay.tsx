import React from 'react';
import { Shield, Lock } from 'lucide-react';

interface SecurityOverlayProps {
  isVisible: boolean;
}

/**
 * A security overlay that blocks content when shown
 */
export default function SecurityOverlay({ isVisible }: SecurityOverlayProps) {
  if (!isVisible) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
      aria-hidden={!isVisible}
    >
      <div className="text-center space-y-4 max-w-md px-4">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Content Hidden</h2>
        <p className="text-muted-foreground">
          Financial information is currently hidden for security. 
          Click "I'm Here" when you return to continue viewing your data.
        </p>
        <div className="pt-4 opacity-50 text-sm flex items-center justify-center gap-2">
          <Shield className="w-4 h-4" /> 
          <span>Security feature</span>
        </div>
      </div>
    </div>
  );
}