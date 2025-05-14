import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// Default timeout in milliseconds (2 minutes)
const DEFAULT_TIMEOUT = 2 * 60 * 1000;

interface IdleSessionHandlerProps {
  timeoutMs?: number;
  onTimeout?: (isIdle?: boolean) => void;
}

/**
 * Component to handle user idle state and display a confirmation dialog
 * when the user has been idle for a specified time
 */
export default function IdleSessionHandler({
  timeoutMs = DEFAULT_TIMEOUT,
  onTimeout
}: IdleSessionHandlerProps) {
  const [isIdle, setIsIdle] = useState(false);
  const [idleStartTime, setIdleStartTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const resetIdleTimer = useCallback(() => {
    if (isIdle) return; // Don't reset if already in idle mode
    
    setIdleStartTime(Date.now());
    setTimeLeft(null);
  }, [isIdle]);

  const handleUserActivity = useCallback(() => {
    resetIdleTimer();
  }, [resetIdleTimer]);

  const handleConfirmPresence = useCallback(() => {
    console.log('User confirmed presence - resuming session');
    setIsIdle(false);
    resetIdleTimer();
    
    // Focus back on the app
    window.focus();
    
    // Also inform parent component that user is active again
    if (onTimeout) {
      // Pass false to indicate the user is no longer idle
      onTimeout(false);
    }
  }, [resetIdleTimer, onTimeout]);

  // Setup activity event listeners
  useEffect(() => {
    // User activity events to monitor
    const events = [
      'mousedown', 'mousemove', 'keypress', 
      'scroll', 'touchstart', 'wheel'
    ];
    
    // Start the idle timer immediately
    resetIdleTimer();
    
    // Add event listeners for user activity
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });
    
    return () => {
      // Clean up event listeners on unmount
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [handleUserActivity, resetIdleTimer]);

  // Check for idle timeout
  useEffect(() => {
    if (isIdle) return; // Skip if already in idle state
    
    const interval = setInterval(() => {
      if (idleStartTime === null) return;
      
      const elapsed = Date.now() - idleStartTime;
      const remaining = timeoutMs - elapsed;
      
      // Update the time left (for display purposes if needed)
      setTimeLeft(remaining > 0 ? remaining : 0);
      
      // Check if idle timeout has been reached
      if (elapsed >= timeoutMs) {
        setIsIdle(true);
        if (onTimeout) onTimeout(true); // Pass true to indicate user is idle
        clearInterval(interval);
      }
    }, 1000); // Check every second
    
    return () => clearInterval(interval);
  }, [idleStartTime, isIdle, onTimeout, timeoutMs]);

  return (
    <>
      <Dialog open={isIdle} onOpenChange={(open) => {
        // Only allow closing through the confirmation button
        if (!open) {
          handleConfirmPresence();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Are you still there?</DialogTitle>
            <DialogDescription>
              Your session has been inactive for {Math.floor(timeoutMs / 60000)} minutes.
              For security reasons, financial information has been hidden.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <Button onClick={handleConfirmPresence} className="w-full">
              I'm Here
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}