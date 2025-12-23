// components/organisms/Step2PreprocessingOrchestrator.jsx
import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import FlexBox from '../../atoms/FlexBox';
import Typography from '../../atoms/CustomTypography';
import ModeTabs from '../../atoms/ModeTabs';
import SectionCard from '../../atoms/SectionCard';
import Button from '../../atoms/CustomButton';

import PreprocessingTaskSelector from '../../molecules/PreprocessingTaskSelector';

import BulkAssignmentPanel from '../BulkAssignmentPanel';
import PreprocessingConfigEditorPanel from '../PreprocessingConfigEditorPanel';

import AISuggestionConsoleModal from '../AISuggestionConsoleModal';
import { suggestPreprocessing } from '../../../services/modules/preprocessingSuggest.api';
import AppliedPreprocessingSummary from '../AppliedPreprocessingSummary';

export default function Step2PreprocessingOrchestrator({
  tasks,
  selectedTaskKeys,
  setSelectedTaskKeys,

  columns,
  columnTypes,
  previewRows,
  filename,

  defaults,
  setDefaults,
  overrides,
  setOverrides,

  // config output to wizard
  onConfigChange,

  validatePreprocessingConfig,

  liveConfig,
  useCustomConfig,
  setUseCustomConfig,
  customConfigText,
  setCustomConfigText,
  setCustomConfigParsed,
  customConfigError,
  setCustomConfigError,
}) {
  const [mode, setMode] = useState('bulk');

  // AI suggest states
  const [aiConsoleOpen, setAiConsoleOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [suggestMeta, setSuggestMeta] = useState(null);

  const tabs = useMemo(
    () => [
      { key: 'bulk', label: 'Bulk Selection' },
      { key: 'config', label: 'Config Editor' },
    ],
    []
  );

  const hasTask = (k) => selectedTaskKeys.includes(k);

  const handleToggleTask = (taskKey) => {
    setSelectedTaskKeys((prev) => (prev.includes(taskKey) ? prev.filter((k) => k !== taskKey) : [...prev, taskKey]));
  };

  function pickRandomSample(rows, n) {
    const arr = Array.isArray(rows) ? rows.slice() : [];
    if (arr.length <= n) return arr;
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr.slice(0, n);
  }

  function isMissing(v) {
    if (v === null || v === undefined) return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    return false;
  }

  function buildColumnProfiles({ cols, types, sampleRows }) {
    const profiles = [];
    for (const col of cols) {
      const inferredType = types?.[col] || 'unknown';
      let missingCount = 0;
      const uniques = new Set();
      const sampleValues = [];

      for (const row of sampleRows) {
        const v = row?.[col];
        if (isMissing(v)) {
          missingCount += 1;
          continue;
        }
        const s = String(v);
        uniques.add(s);
        if (sampleValues.length < 8) sampleValues.push(s);
      }

      profiles.push({
        name: col,
        inferredType,
        missingCount,
        uniqueCount: uniques.size,
        sampleValues,
      });
    }
    return profiles;
  }

  function configToSeedDefaults(preprocessingConfig) {
    const steps = preprocessingConfig?.steps || [];
    const seed = {
      categoricalMissing: 'categorical_unknown',
      unknownLevel: 'unknown',
      numericMissing: 'numeric_median',
      numericConstant: 0,
      oneHotMaxLevels: 10,
      scaling: 'zscore',
      rarePropThreshold: 0.01,
      highCardinalityThreshold: 50,
    };

    for (const s of steps) {
      const task = s?.task;
      const method = s?.method;
      const p = s?.params || {};
      const types = s?.appliesTo?.types || [];

      if (task === 'missing_values') {
        if (types.includes('numeric')) {
          if (method === 'numeric_median' || method === 'numeric_mean' || method === 'numeric_constant') {
            seed.numericMissing = method;
          }
          if (method === 'numeric_constant') {
            const num = Number(p.fill_value);
            seed.numericConstant = Number.isFinite(num) ? num : 0;
          }
        }
        if (types.includes('categorical')) {
          if (method === 'categorical_unknown' || method === 'categorical_mode') seed.categoricalMissing = method;
          if (method === 'categorical_unknown') seed.unknownLevel = (p.fill_value && String(p.fill_value)) || 'unknown';
        }
      }

      if (task === 'encoding') {
        const m = Number(p.one_hot_max_levels);
        if (Number.isFinite(m) && m > 0) seed.oneHotMaxLevels = m;
      }

      if (task === 'reduce_cardinality') {
        const r = Number(p.rare_prop_threshold);
        const h = Number(p.high_cardinality_threshold);
        if (Number.isFinite(r) && r > 0) seed.rarePropThreshold = r;
        if (Number.isFinite(h) && h > 0) seed.highCardinalityThreshold = h;
      }

      if (task === 'scaling') {
        if (method === 'zscore' || method === 'minmax' || method === 'none') seed.scaling = method;
      }
    }

    return seed;
  }

  function configToTaskKeys(preprocessingConfig, uiTasks) {
    const steps = preprocessingConfig?.steps || [];
    const present = new Set(steps.map((s) => s?.task).filter(Boolean));

    const CONFIGTASK_TO_TASKKEY = {
      missing_values: ['handle_missing_categoricals', 'numeric_imputation'],
      label_cleaning: ['clean_category_labels'],
      reduce_cardinality: ['reduce_cardinality'],
      encoding: ['encode_categoricals'],
      scaling: ['numeric_scaling'],
    };

    const out = [];
    for (const t of present) {
      (CONFIGTASK_TO_TASKKEY[t] || []).forEach((k) => out.push(k));
    }

    const allowed = new Set(uiTasks.map((t) => t.key));
    return Array.from(new Set(out)).filter((k) => allowed.has(k));
  }

  const handleAiSuggest = async () => {
    setAiConsoleOpen(true);
    setAiLoading(true);
    setAiError(null);
    setAiSuggestion(null);

    try {
      const rows = Array.isArray(previewRows) ? previewRows : [];
      if (rows.length === 0) throw new Error('No sample rows available for suggestion.');

      const filtered = rows.map((row) => {
        const obj = {};
        columns.forEach((c) => {
          obj[c] = row?.[c];
        });
        return obj;
      });

      const sampleRowCount = Math.min(100, filtered.length);
      const sampleRows = pickRandomSample(filtered, sampleRowCount);

      const columnProfiles = buildColumnProfiles({
        cols: columns,
        types: columnTypes,
        sampleRows,
      });

      const resp = await suggestPreprocessing({
        filename: filename || 'dataset.csv',
        columns: columnProfiles,
        sampleRows,
        sampleRowCount,
      });

      const seed = configToSeedDefaults(resp.preprocessingConfig);
      const taskKeys = configToTaskKeys(resp.preprocessingConfig, tasks);

      setAiSuggestion({
        ...resp,
        _seedDefaults: seed,
        _recommendedTasks: taskKeys,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      setAiError(e?.message || 'Unknown error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiAccept = () => {
    if (!aiSuggestion) return;

    // 1) Apply suggested defaults (global)
    setDefaults((prev) => ({ ...prev, ...(aiSuggestion._seedDefaults || {}) }));

    // 2) Apply suggested tasks (replace for clarity)
    setSelectedTaskKeys(aiSuggestion._recommendedTasks || []);

    // 3) Prefill config editor with suggested JSON (user independence)
    if (aiSuggestion.preprocessingConfig) {
      setCustomConfigText(JSON.stringify(aiSuggestion.preprocessingConfig, null, 2));
      setCustomConfigParsed(aiSuggestion.preprocessingConfig);
      setCustomConfigError(null);
    }

    setSuggestMeta({
      confidence: aiSuggestion.confidence,
      rationale: aiSuggestion.rationale,
      warnings: aiSuggestion.warnings,
    });

    setAiConsoleOpen(false);
  };

  const handleAiReject = () => setAiConsoleOpen(false);

  return (
    <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <AISuggestionConsoleModal
        open={aiConsoleOpen}
        onClose={() => setAiConsoleOpen(false)}
        suggestion={aiSuggestion}
        loading={aiLoading}
        error={aiError}
        onAccept={handleAiAccept}
        onReject={handleAiReject}
      />

      {/* Tasks */}
      <SectionCard>
        <FlexBox
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 1,
            alignItems: { xs: 'flex-start', md: 'center' },
            flexWrap: 'wrap',
          }}
        >
          <FlexBox sx={{ flexDirection: 'column', gap: 0.25 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Preprocessing tasks
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Enable tasks, then assign methods to specific columns using Bulk Selection. Defaults ensure every enabled task
              is configured for all columns.
            </Typography>
          </FlexBox>

          <Button variant="contained" color="primary" onClick={handleAiSuggest} disabled={aiLoading}>
            {aiLoading ? 'Suggesting...' : 'AI Suggest'}
          </Button>
        </FlexBox>

        <FlexBox sx={{ mt: 1 }}>
          <PreprocessingTaskSelector tasks={tasks} selectedTaskKeys={selectedTaskKeys} onToggleTask={handleToggleTask} />
        </FlexBox>

        {suggestMeta?.rationale?.length ? (
          <FlexBox
            sx={{
              mt: 1.25,
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 2,
              padding: 1,
              background: 'rgba(0,0,0,0.02)',
              flexDirection: 'column',
              gap: 0.5,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              Suggestion rationale (confidence: {suggestMeta.confidence})
            </Typography>
            {suggestMeta.rationale.map((r, idx) => (
              <Typography key={idx} variant="caption" color="textSecondary">
                • {r}
              </Typography>
            ))}
          </FlexBox>
        ) : null}
      </SectionCard>

      {/* Tabs */}
      <SectionCard sx={{ padding: 0 }}>
        <ModeTabs value={mode} onChange={setMode} tabs={tabs} />
      </SectionCard>

    {mode === 'bulk' && (
  <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <BulkAssignmentPanel
      enabledTaskKeys={selectedTaskKeys}
      columns={columns}
      columnTypes={columnTypes}
      defaults={defaults}
      onDefaultsChange={setDefaults}
      overrides={overrides}
      onOverridesChange={setOverrides}
    />

    <AppliedPreprocessingSummary
      selectedTaskKeys={selectedTaskKeys}
      columns={columns}
      columnTypes={columnTypes}
      defaults={defaults}
      overrides={overrides}
    />
  </FlexBox>
)}


      {/* Config editor */}
      {mode === 'config' && (
        <PreprocessingConfigEditorPanel
            liveConfig={liveConfig}   // <-- pass the live config here
            validateConfig={validatePreprocessingConfig}
            useCustomConfig={useCustomConfig}
            setUseCustomConfig={setUseCustomConfig}
            customConfigText={customConfigText}
            setCustomConfigText={setCustomConfigText}
            setCustomConfigParsed={setCustomConfigParsed}
            customConfigError={customConfigError}
            setCustomConfigError={setCustomConfigError}
        />
      )}
    </FlexBox>
  );
}

Step2PreprocessingOrchestrator.propTypes = {
  tasks: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string, label: PropTypes.string })).isRequired,
  selectedTaskKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  setSelectedTaskKeys: PropTypes.func.isRequired,

  columns: PropTypes.arrayOf(PropTypes.string).isRequired,
  columnTypes: PropTypes.object.isRequired,
  previewRows: PropTypes.array,
  filename: PropTypes.string,

  defaults: PropTypes.object.isRequired,
  setDefaults: PropTypes.func.isRequired,
  overrides: PropTypes.object.isRequired,
  setOverrides: PropTypes.func.isRequired,

  onConfigChange: PropTypes.func.isRequired,

  validatePreprocessingConfig: PropTypes.func.isRequired,

  liveConfig: PropTypes.object.isRequired,
  useCustomConfig: PropTypes.bool.isRequired,
  setUseCustomConfig: PropTypes.func.isRequired,
  customConfigText: PropTypes.string.isRequired,
  setCustomConfigText: PropTypes.func.isRequired,
  setCustomConfigParsed: PropTypes.func.isRequired,
  customConfigError: PropTypes.string,
  setCustomConfigError: PropTypes.func.isRequired,
};
