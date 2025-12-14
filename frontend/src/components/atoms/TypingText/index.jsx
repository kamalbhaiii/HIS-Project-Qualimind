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

  React.useEffect(() => {
    setIdx(0);
  }, [text]);

  React.useEffect(() => {
    if (disabled) {
      setIdx(text?.length ?? 0);
      onDone?.();
      return;
    }

    if (!text) return;

    let t1 = null;
    let t2 = null;

    t1 = setTimeout(() => {
      const tick = () => {
        setIdx((prev) => {
          const next = Math.min(prev + 1, text.length);
          if (next >= text.length) {
            t2 = setTimeout(() => onDone?.(), 150);
          }
          return next;
        });
      };

      const interval = setInterval(() => {
        tick();
      }, speedMs);

      return () => clearInterval(interval);
    }, startDelayMs);

    return () => {
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
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
