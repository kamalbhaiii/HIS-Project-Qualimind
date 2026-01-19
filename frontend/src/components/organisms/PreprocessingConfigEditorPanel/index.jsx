// components/organisms/PreprocessingConfigEditorPanel.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import PropTypes from "prop-types";

import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";
import Button from "../../atoms/CustomButton";
import SectionCard from "../../atoms/SectionCard";
import ToggleChip from "../../atoms/ToggleChip";

function safeJsonStringify(obj) {
  try {
    return JSON.stringify(obj ?? null, null, 2);
  } catch {
    return '{ "version": "1.0", "steps": [] }';
  }
}

function tryParseJson(txt) {
  try {
    const parsed = JSON.parse(txt);
    return { ok: true, value: parsed, error: null };
  } catch (e) {
    return { ok: false, value: null, error: e?.message || "Invalid JSON" };
  }
}

function TextareaNative({ value, onChange, readOnly }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      style={{
        width: "100%",
        minHeight: 420,
        padding: 12,
        borderRadius: 12,
        border: "1px solid rgba(0,0,0,0.15)",
        outline: "none",
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 12,
        background: readOnly ? "rgba(0,0,0,0.03)" : "white",
      }}
    />
  );
}

export default function PreprocessingConfigEditorPanel({
  liveConfig,
  validateConfig,

  useCustomConfig,
  setUseCustomConfig,
  customConfigText,
  setCustomConfigText,
  setCustomConfigParsed,
  customConfigError,
  setCustomConfigError,
}) {
  const liveText = useMemo(() => safeJsonStringify(liveConfig || { version: "1.0", steps: [] }), [liveConfig]);

  const [lastValidAt, setLastValidAt] = useState(null);

  // When user enables custom, seed editor from LIVE config once (don’t overwrite user edits)
  useEffect(() => {
    if (!useCustomConfig) return;
    if (customConfigText?.trim()) return;
    setCustomConfigText(liveText);
    setCustomConfigParsed(liveConfig || null);
    setCustomConfigError(null);
    setLastValidAt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCustomConfig]);

  const copyToClipboard = useCallback(async (txt) => {
    try {
      await navigator.clipboard.writeText(String(txt || ""));
    } catch {
      // silently ignore (some browsers block clipboard)
    }
  }, []);

  const handleFormat = useCallback(() => {
    const parsed = tryParseJson(customConfigText);
    if (!parsed.ok) {
      setCustomConfigError(parsed.error);
      return;
    }
    setCustomConfigText(safeJsonStringify(parsed.value));
    setCustomConfigError(null);
  }, [customConfigText, setCustomConfigText, setCustomConfigError]);

  const handleValidateAndParse = useCallback(() => {
    const parsed = tryParseJson(customConfigText);
    if (!parsed.ok) {
      setCustomConfigParsed(null);
      setCustomConfigError(parsed.error);
      return;
    }

    const v = validateConfig(parsed.value);
    if (!v.ok) {
      setCustomConfigParsed(null);
      setCustomConfigError(v.message || "Invalid config.");
      return;
    }

    setCustomConfigParsed(parsed.value);
    setCustomConfigError(null);
    setLastValidAt(new Date().toISOString());
  }, [customConfigText, setCustomConfigParsed, setCustomConfigError, validateConfig]);

  const statusText = useMemo(() => {
    if (!useCustomConfig) return "Live config is active.";
    if (customConfigError) return "Custom config has errors.";
    if (lastValidAt) return "Custom config is valid.";
    return "Custom config is active. Validate to apply changes.";
  }, [useCustomConfig, customConfigError, lastValidAt]);

  return (
    <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <SectionCard>
        <FlexBox sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
          <FlexBox sx={{ flexDirection: "column", gap: 0.25 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Config editor
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Live config updates automatically from Bulk Selection. Enable Custom only if you want to override it.
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Status: {statusText}
            </Typography>
          </FlexBox>

          <FlexBox sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <ToggleChip
              label={useCustomConfig ? "Custom: ON" : "Custom: OFF"}
              selected={useCustomConfig}
              onClick={() => {
                setUseCustomConfig((v) => !v);
                // do not auto-validate here; keep user in control
              }}
            />
            <Button variant="outlined" color="inherit" onClick={() => copyToClipboard(liveText)}>
              Copy Live
            </Button>
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
        <FlexBox sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
          <FlexBox sx={{ flexDirection: "column", gap: 0.25 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Live config (read-only)
            </Typography>
            <Typography variant="caption" color="textSecondary">
              This is what Bulk Selection is producing right now.
            </Typography>
          </FlexBox>
          <Button variant="outlined" color="inherit" onClick={() => copyToClipboard(liveText)}>
            Copy
          </Button>
        </FlexBox>

        <FlexBox sx={{ mt: 1 }}>
          <TextareaNative value={liveText} onChange={() => {}} readOnly />
        </FlexBox>
      </SectionCard>

      {/* Custom config only if enabled */}
      {useCustomConfig && (
        <SectionCard>
          <FlexBox sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
            <FlexBox sx={{ flexDirection: "column", gap: 0.25 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Custom config (editable)
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Paste/edit JSON. Use Format for readability, Validate to apply.
              </Typography>
            </FlexBox>

            <FlexBox sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button variant="outlined" color="inherit" onClick={handleFormat}>
                Format
              </Button>
              <Button variant="outlined" color="inherit" onClick={() => copyToClipboard(customConfigText)}>
                Copy
              </Button>
            </FlexBox>
          </FlexBox>

          <FlexBox sx={{ mt: 1 }}>
            <TextareaNative value={customConfigText} onChange={(e) => setCustomConfigText(e.target.value)} />
          </FlexBox>

          {customConfigError && (
            <Typography variant="caption" sx={{ mt: 1 }} color="error">
              {customConfigError}
            </Typography>
          )}

          <FlexBox sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1 }}>
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
