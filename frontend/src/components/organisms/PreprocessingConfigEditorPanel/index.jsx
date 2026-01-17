// components/organisms/PreprocessingConfigEditorPanel.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import PropTypes from "prop-types";

import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";
import Button from "../../atoms/CustomButton";
import SectionCard from "../../atoms/SectionCard";
import ToggleChip from "../../atoms/ToggleChip";

/* --------------------------- safe helpers --------------------------- */

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
        minHeight: 520,
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

/**
 * Behavior:
 * - Only ONE editor is shown.
 * - When Custom is OFF -> editor shows LIVE config, read-only.
 * - When Custom is ON  -> editor becomes editable, using customConfigText.
 * - Validate is the ONLY action that sets customConfigParsed (i.e., applies the custom config).
 * - Any edit/reset invalidates customConfigParsed until Validate is clicked again.
 */
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

  // When switching Custom ON:
  // - seed editor from live config if editor is empty
  // - DO NOT mark as applied/valid until user clicks Validate
  useEffect(() => {
    if (!useCustomConfig) return;
    if (String(customConfigText || "").trim()) return;

    setCustomConfigText(liveText);
    setCustomConfigError(null);
    setCustomConfigParsed(null);
    setLastValidAt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCustomConfig]);

  // When switching Custom OFF:
  // - clear validation stamp and visible error (UI only)
  // - keep user's draft text (so they can toggle ON again)
  useEffect(() => {
    if (useCustomConfig) return;
    setLastValidAt(null);
    if (customConfigError) setCustomConfigError(null);
    // Do NOT clear customConfigText (draft)
    // Do NOT clear customConfigParsed (parent may keep it, but should ignore when custom is OFF)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCustomConfig]);

  const editorValue = useMemo(() => {
    return useCustomConfig ? String(customConfigText || "") : liveText;
  }, [useCustomConfig, customConfigText, liveText]);

  const editorReadOnly = !useCustomConfig;

  const copyToClipboard = useCallback(async (txt) => {
    try {
      await navigator.clipboard.writeText(String(txt || ""));
    } catch {
      // silently ignore (some browsers block clipboard)
    }
  }, []);

  const handleFormat = useCallback(() => {
    if (!useCustomConfig) return;

    const parsed = tryParseJson(customConfigText);
    if (!parsed.ok) {
      setCustomConfigError(parsed.error);
      return;
    }
    setCustomConfigText(safeJsonStringify(parsed.value));
    setCustomConfigError(null);
  }, [useCustomConfig, customConfigText, setCustomConfigText, setCustomConfigError]);

  const handleValidateAndParse = useCallback(() => {
    if (!useCustomConfig) return;

    const parsed = tryParseJson(customConfigText);
    if (!parsed.ok) {
      setCustomConfigParsed(null);
      setCustomConfigError(parsed.error);
      setLastValidAt(null);
      return;
    }

    const v = validateConfig(parsed.value);
    if (!v.ok) {
      setCustomConfigParsed(null);
      setCustomConfigError(v.message || "Invalid config.");
      setLastValidAt(null);
      return;
    }

    setCustomConfigParsed(parsed.value);
    setCustomConfigError(null);
    setLastValidAt(new Date().toISOString());
  }, [
    useCustomConfig,
    customConfigText,
    setCustomConfigParsed,
    setCustomConfigError,
    validateConfig,
  ]);

  const statusText = useMemo(() => {
    if (!useCustomConfig) return "Live config is active (read-only).";
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
              Status: {statusText}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {useCustomConfig
                ? "Editing Custom config. Bulk Selection should sync from this config after Validate."
                : "Viewing Live config. Turn Custom ON to edit and override."}
            </Typography>
          </FlexBox>

          <FlexBox sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
            <ToggleChip
              label={useCustomConfig ? "Custom: ON" : "Custom: OFF"}
              selected={useCustomConfig}
              onClick={() => {
                setUseCustomConfig((v) => !v);
              }}
            />

            <Button variant="outlined" color="inherit" onClick={() => copyToClipboard(liveText)}>
              Copy Live
            </Button>

            {useCustomConfig && (
              <>
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => {
                    setCustomConfigText(liveText);
                    setCustomConfigParsed(null);
                    setCustomConfigError(null);
                    setLastValidAt(null);
                  }}
                >
                  Reset to Live
                </Button>

                <Button variant="outlined" color="inherit" onClick={handleFormat}>
                  Format
                </Button>

                <Button variant="outlined" color="inherit" onClick={() => copyToClipboard(customConfigText)}>
                  Copy
                </Button>
              </>
            )}
          </FlexBox>
        </FlexBox>
      </SectionCard>

      <SectionCard>
        <FlexBox
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <FlexBox sx={{ flexDirection: "column", gap: 0.25 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {useCustomConfig ? "Custom config (editable)" : "Live config (read-only)"}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {useCustomConfig
                ? "Paste/edit JSON. Use Format for readability, Validate to apply."
                : "This is what Bulk Selection is producing right now."}
            </Typography>
          </FlexBox>

          {!useCustomConfig && (
            <Button variant="outlined" color="inherit" onClick={() => copyToClipboard(liveText)}>
              Copy
            </Button>
          )}
        </FlexBox>

        <FlexBox sx={{ mt: 1 }}>
          <TextareaNative
            value={editorValue}
            readOnly={editorReadOnly}
            onChange={(e) => {
              if (!useCustomConfig) return;

              setCustomConfigText(e.target.value);

              // Any edit invalidates previously parsed/applied config until re-validated.
              setCustomConfigParsed(null);

              // UX clarity: edits invalidate validation timestamp
              if (lastValidAt) setLastValidAt(null);
            }}
          />
        </FlexBox>

        {useCustomConfig && customConfigError && (
          <Typography variant="caption" sx={{ mt: 1 }} color="error">
            {customConfigError}
          </Typography>
        )}

        {useCustomConfig && (
          <FlexBox sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1 }}>
            <Button variant="contained" color="primary" onClick={handleValidateAndParse}>
              Validate
            </Button>
          </FlexBox>
        )}
      </SectionCard>
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
