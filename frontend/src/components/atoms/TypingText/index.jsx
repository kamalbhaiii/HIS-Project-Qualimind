import React from 'react';
import PropTypes from 'prop-types';

/**
 * Typing effect for terminal output.
 * - "text" is the full text to type.
 * - Emits onDone when finished.
 */
export default function TypingText({
  text,
  speedMs = 14,
  startDelayMs = 250,
  onDone,
  disabled = false,
}) {
  const [idx, setIdx] = React.useState(0);

  const timeoutRef = React.useRef(null);
  const intervalRef = React.useRef(null);
  const doneTimeoutRef = React.useRef(null);

  // Reset index whenever text changes
  React.useEffect(() => {
    setIdx(0);
  }, [text]);

  React.useEffect(() => {
    // Clear any previous timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (doneTimeoutRef.current) clearTimeout(doneTimeoutRef.current);

    timeoutRef.current = null;
    intervalRef.current = null;
    doneTimeoutRef.current = null;

    const fullLen = text?.length ?? 0;

    // If disabled: show full text immediately
    if (disabled) {
      setIdx(fullLen);
      // call onDone asynchronously to avoid setState-in-render edge cases
      doneTimeoutRef.current = setTimeout(() => onDone?.(), 0);
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (doneTimeoutRef.current) clearTimeout(doneTimeoutRef.current);
      };
    }

    // Nothing to type
    if (!text || fullLen === 0) {
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (doneTimeoutRef.current) clearTimeout(doneTimeoutRef.current);
      };
    }

    // Start after delay
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        setIdx((prev) => {
          const next = Math.min(prev + 1, fullLen);

          if (next >= fullLen) {
            // Stop typing immediately when done
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }

            // Fire onDone once
            if (!doneTimeoutRef.current) {
              doneTimeoutRef.current = setTimeout(() => onDone?.(), 150);
            }
          }

          return next;
        });
      }, speedMs);
    }, startDelayMs);

    // Cleanup for unmount / prop change
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (doneTimeoutRef.current) clearTimeout(doneTimeoutRef.current);
      timeoutRef.current = null;
      intervalRef.current = null;
      doneTimeoutRef.current = null;
    };
  }, [text, speedMs, startDelayMs, onDone, disabled]);

  const visible = text?.slice(0, idx) ?? '';
  const done = idx >= (text?.length ?? 0);

  return (
    <span style={{ whiteSpace: 'pre-wrap' }}>
      {visible}
      {!done && <span style={{ opacity: 0.8 }}>▋</span>}
    </span>
  );
}

TypingText.propTypes = {
  text: PropTypes.string,
  speedMs: PropTypes.number,
  startDelayMs: PropTypes.number,
  onDone: PropTypes.func,
  disabled: PropTypes.bool,
};
