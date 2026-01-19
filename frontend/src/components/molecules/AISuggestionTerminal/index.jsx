import React from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';

import TerminalShell from '../../atoms/TerminalShell';
import TypingText from '../../atoms/TypingText';

function buildTerminalText({ suggestion, loading, error }) {
  if (error) {
    return [
      '[error] AI Suggestion failed.',
      `reason: ${error}`,
      '',
      'You can close this console and try again.',
    ].join('\n');
  }

  if (loading) {
    return [
      '[info] Analyzing dataset schema...',
      '[info] Inferring column types...',
      '[info] Selecting preprocessing steps and methods...',
      '',
      'Generating recommendation...\n',
    ].join('\n');
  }

  if (!suggestion) return '[info] Waiting for suggestion...\n';

  const confidence = suggestion.confidence ?? null;
  const rationale = Array.isArray(suggestion.rationale) ? suggestion.rationale : [];
  const warnings = Array.isArray(suggestion.warnings) ? suggestion.warnings : [];

  const cfg = suggestion.preprocessingConfig || {};
  const stepCount = Array.isArray(cfg.steps) ? cfg.steps.length : 0;

  return [
    '[ok] AI suggestion ready.',
    confidence != null ? `confidence: ${confidence}` : '',
    `steps: ${stepCount}`,
    '',
    'rationale:',
    ...(rationale.length ? rationale.map((r) => `- ${r}`) : ['- (none)']),
    '',
    warnings.length ? 'warnings:' : '',
    ...(warnings.length ? warnings.map((w) => `- ${w}`) : []),
    '',
    'Actions:',
    '• Accept: apply this configuration to your upload',
    '• Reject: keep current selection and continue manually',
    '',
  ]
    .filter(Boolean)
    .join('\n');
}

export default function AISuggestionTerminal({
  open,
  suggestion,
  loading,
  error,
  onAccept,
  onReject,
  onClose,
}) {
  const [typedDone, setTypedDone] = React.useState(false);

  React.useEffect(() => {
    setTypedDone(false);
  }, [suggestion, loading, error, open]);

  if (!open) return null;

  const terminalText = buildTerminalText({ suggestion, loading, error });

  const canDecide = !loading && !error && !!suggestion;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <TerminalShell height={320}>
            <TypingText
      text={terminalText}
      speedMs={12}
      startDelayMs={200}
      onDone={() => setTypedDone(true)}
      disabled={(terminalText?.length ?? 0) > 4000}
    />
      </TerminalShell>

      {/* Footer controls inside “console” area */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 1,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          {loading ? <Chip size="small" label="Thinking…" /> : null}
          {error ? <Chip size="small" color="error" label="Error" /> : null}
          {canDecide ? <Chip size="small" color="success" label="Ready" /> : null}
          {!typedDone ? <Chip size="small" label="Typing…" /> : null}
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" color="inherit" onClick={onClose}>
            Close
          </Button>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

          <Button
            variant="outlined"
            color="inherit"
            onClick={onReject}
            disabled={!canDecide}
          >
            Reject
          </Button>

          <Button
            variant="contained"
            color="primary"
            onClick={onAccept}
            disabled={!canDecide}
          >
            Accept
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

AISuggestionTerminal.propTypes = {
  open: PropTypes.bool.isRequired,
  suggestion: PropTypes.shape({
    preprocessingConfig: PropTypes.object,
    rationale: PropTypes.array,
    confidence: PropTypes.number,
    warnings: PropTypes.array,
  }),
  loading: PropTypes.bool,
  error: PropTypes.string,
  onAccept: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
