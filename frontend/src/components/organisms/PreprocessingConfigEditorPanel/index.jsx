// components/organisms/PreprocessingConfigEditorPanel.jsx
import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import FlexBox from '../../atoms/FlexBox';
import Typography from '../../atoms/CustomTypography';
import Button from '../../atoms/CustomButton';
import SectionCard from '../../atoms/SectionCard';
import ToggleChip from '../../atoms/ToggleChip';

function TextareaNative({ value, onChange, readOnly }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      style={{
        width: '100%',
        minHeight: 420,
        padding: 12,
        borderRadius: 12,
        border: '1px solid rgba(0,0,0,0.15)',
        outline: 'none',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 12,
        background: readOnly ? 'rgba(0,0,0,0.03)' : 'white',
      }}
    />
  );
}

export default function PreprocessingConfigEditorPanel({
  liveConfig,                 // NEW
  validateConfig,

  useCustomConfig,
  setUseCustomConfig,
  customConfigText,
  setCustomConfigText,
  setCustomConfigParsed,
  customConfigError,
  setCustomConfigError,
}) {
  const liveText = useMemo(() => {
    try {
      return JSON.stringify(liveConfig || { version: '1.0', steps: [] }, null, 2);
    } catch {
      return '{ "version": "1.0", "steps": [] }';
    }
  }, [liveConfig]);

  // When user enables custom, seed editor from LIVE config (best default + user independence)
  useEffect(() => {
    if (!useCustomConfig) return;
    if (customConfigText?.trim()) return; // don't overwrite user's edits
    setCustomConfigText(liveText);
    setCustomConfigParsed(liveConfig || null);
    setCustomConfigError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCustomConfig]);

  const handleValidateAndParse = () => {
    try {
      const parsed = JSON.parse(customConfigText);
      const v = validateConfig(parsed);
      if (!v.ok) {
        setCustomConfigParsed(null);
        setCustomConfigError(v.message || 'Invalid config.');
        return;
      }
      setCustomConfigParsed(parsed);
      setCustomConfigError(null);
    } catch (e) {
      setCustomConfigParsed(null);
      setCustomConfigError(e?.message || 'Invalid JSON.');
    }
  };

  return (
    <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <SectionCard>
        <FlexBox sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <FlexBox sx={{ flexDirection: 'column', gap: 0.25 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Config editor
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Live config updates automatically from Bulk Selection. Enable Custom Config only if you want to override it.
            </Typography>
          </FlexBox>

          <FlexBox sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <ToggleChip
              label={useCustomConfig ? 'Custom: ON' : 'Custom: OFF'}
              selected={useCustomConfig}
              onClick={() => setUseCustomConfig((v) => !v)}
            />
            {useCustomConfig && (
              <Button variant="outlined" color="inherit" onClick={() => setCustomConfigText(liveText)}>
                Reset to Live
              </Button>
            )}
          </FlexBox>
        </FlexBox>
      </SectionCard>

      {/* Live config always visible */}
      <SectionCard>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Live config (read-only)
        </Typography>
        <Typography variant="caption" color="textSecondary">
          This is what Bulk Selection is producing right now.
        </Typography>
        <FlexBox sx={{ mt: 1 }}>
          <TextareaNative value={liveText} onChange={() => {}} readOnly />
        </FlexBox>
      </SectionCard>

      {/* Custom config only if enabled */}
      {useCustomConfig && (
        <SectionCard>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Custom config (editable)
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Paste/edit JSON. Click “Validate” to apply.
          </Typography>

          <FlexBox sx={{ mt: 1 }}>
            <TextareaNative value={customConfigText} onChange={(e) => setCustomConfigText(e.target.value)} />
          </FlexBox>

          {customConfigError && (
            <Typography variant="caption" sx={{ mt: 1 }} color="error">
              {customConfigError}
            </Typography>
          )}

          <FlexBox sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
            <Button variant="contained" color="primary" onClick={handleValidateAndParse}>
              Validate
            </Button>
          </FlexBox>
        </SectionCard>
      )}
    </FlexBox>
  );
}

PreprocessingConfigEditorPanel.propTypes = {
  liveConfig: PropTypes.object,
  validateConfig: PropTypes.func.isRequired,

  useCustomConfig: PropTypes.bool.isRequired,
  setUseCustomConfig: PropTypes.func.isRequired,
  customConfigText: PropTypes.string.isRequired,
  setCustomConfigText: PropTypes.func.isRequired,
  setCustomConfigParsed: PropTypes.func.isRequired,
  customConfigError: PropTypes.string,
  setCustomConfigError: PropTypes.func.isRequired,
};
