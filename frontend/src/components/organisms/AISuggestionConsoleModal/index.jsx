// src/components/organisms/AISuggestionConsoleModal.jsx
import React from "react";
import PropTypes from "prop-types";

import AppModal from "../../atoms/AppModal";
import AISuggestionTerminal from "../../molecules/AISuggestionTerminal";

export default function AISuggestionConsoleModal({
  open,
  onClose,
  suggestion,
  loading,
  error,
  onAccept,
  onReject,
}) {
  return (
    <AppModal
      open={open}
      title="AI Suggestion"
      subtitle="Review the recommendation and accept to apply it as a custom preprocessing configuration."
      onClose={onClose}
      maxWidth="md"
      disableBackdropClose={!!loading}
    >
      <AISuggestionTerminal
        open={open}
        suggestion={suggestion}
        loading={loading}
        error={error}
        onAccept={onAccept}
        onReject={onReject}
        onClose={onClose}
      />
    </AppModal>
  );
}

AISuggestionConsoleModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  suggestion: PropTypes.object,
  loading: PropTypes.bool,
  error: PropTypes.string,
  onAccept: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired,
};

AISuggestionConsoleModal.defaultProps = {
  suggestion: null,
  loading: false,
  error: null,
};
