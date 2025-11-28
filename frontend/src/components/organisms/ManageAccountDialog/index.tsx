// src/components/organisms/ManageAccountDialog.jsx
import React from 'react';
import PropTypes from 'prop-types';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';

import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import FlexBox from '../../atoms/FlexBox';
import Button from '../../atoms/CustomButton';
import { useToast } from '../../organisms/ToastProvider';

const ManageAccountDialog = ({ open, onClose, user }) => {
  const { showToast } = useToast();

  const [step, setStep] = React.useState<'edit' | 'confirm'>('edit');

  // Section toggles
  const [updateName, setUpdateName] = React.useState(false);
  const [updateEmail, setUpdateEmail] = React.useState(false);
  const [updatePassword, setUpdatePassword] = React.useState(false);

  // Form fields
  const [name, setName] = React.useState(user?.name || '');
  const [newEmail, setNewEmail] = React.useState(user?.email || '');
  const [emailCurrentPassword, setEmailCurrentPassword] = React.useState('');
  const [passwordCurrent, setPasswordCurrent] = React.useState('');
  const [passwordNew, setPasswordNew] = React.useState('');

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setStep('edit');
      setUpdateName(false);
      setUpdateEmail(false);
      setUpdatePassword(false);
      setName(user?.name || '');
      setNewEmail(user?.email || '');
      setEmailCurrentPassword('');
      setPasswordCurrent('');
      setPasswordNew('');
    }
  }, [open, user]);

  const handleCancel = () => {
    onClose?.();
  };

  const buildPayloads = () => {
    const payloads: {
      namePayload?: { name: string };
      emailPayload?: { newEmail: string; currentPassword: string };
      passwordPayload?: { currentPassword: string; newPassword: string };
    } = {};

    if (updateName) {
      payloads.namePayload = { name };
    }
    if (updateEmail) {
      payloads.emailPayload = {
        newEmail,
        currentPassword: emailCurrentPassword,
      };
    }
    if (updatePassword) {
      payloads.passwordPayload = {
        currentPassword: passwordCurrent,
        newPassword: passwordNew,
      };
    }

    return payloads;
  };

  const handleNext = () => {
    const payloads = buildPayloads();

    const wantsSomething =
      payloads.namePayload || payloads.emailPayload || payloads.passwordPayload;

    if (!wantsSomething) {
      showToast('Select at least one thing to update.', 'warning');
      return;
    }

    // Simple client-side validation (no API)
    if (payloads.emailPayload) {
      if (!payloads.emailPayload.newEmail || !payloads.emailPayload.currentPassword) {
        showToast('Fill both new email and current password.', 'warning');
        return;
      }
    }

    if (payloads.passwordPayload) {
      if (!payloads.passwordPayload.currentPassword || !payloads.passwordPayload.newPassword) {
        showToast('Fill both current and new password.', 'warning');
        return;
      }
    }

    setStep('confirm');
  };

  const handleBack = () => {
    setStep('edit');
  };

  const handleConfirm = () => {
    const payloads = buildPayloads();

    // 🚫 No API calls here – just log and toast.
    // Later: replace with real API integration.
    // eslint-disable-next-line no-console
    console.log('[ManageAccountDialog] Would submit payloads:', payloads);

    showToast('Account changes queued (mock). API integration coming soon.', 'success');
    onClose?.();
  };

  const renderEditStep = () => (
    <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Name Section */}
      <SurfaceCard sx={{ p: 2, borderRadius: 2 }}>
        <FlexBox
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1.5,
          }}
        >
          <Typography variant="subtitle2">Display name</Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={updateName}
                onChange={(e) => setUpdateName(e.target.checked)}
                size="small"
              />
            }
            label="Update"
          />
        </FlexBox>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
          This will call <code>PUT /api/auth/me/name</code> with your new name.
        </Typography>
        <TextField
          fullWidth
          size="small"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!updateName}
        />
      </SurfaceCard>

      {/* Email Section */}
      <SurfaceCard sx={{ p: 2, borderRadius: 2 }}>
        <FlexBox
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1.5,
          }}
        >
          <Typography variant="subtitle2">Email address</Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={updateEmail}
                onChange={(e) => setUpdateEmail(e.target.checked)}
                size="small"
              />
            }
            label="Update"
          />
        </FlexBox>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
          This will call <code>PUT /api/auth/me/email</code>. For security, we&apos;ll also ask
          for your current password.
        </Typography>
        <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            label="New email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            disabled={!updateEmail}
          />
          <TextField
            fullWidth
            size="small"
            label="Current password"
            type="password"
            value={emailCurrentPassword}
            onChange={(e) => setEmailCurrentPassword(e.target.value)}
            disabled={!updateEmail}
          />
        </FlexBox>
      </SurfaceCard>

      {/* Password Section */}
      <SurfaceCard sx={{ p: 2, borderRadius: 2 }}>
        <FlexBox
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1.5,
          }}
        >
          <Typography variant="subtitle2">Password</Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={updatePassword}
                onChange={(e) => setUpdatePassword(e.target.checked)}
                size="small"
              />
            }
            label="Update"
          />
        </FlexBox>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
          This will call <code>PUT /api/auth/me/password</code>. You&apos;ll need your current
          password.
        </Typography>
        <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            label="Current password"
            type="password"
            value={passwordCurrent}
            onChange={(e) => setPasswordCurrent(e.target.value)}
            disabled={!updatePassword}
          />
          <TextField
            fullWidth
            size="small"
            label="New password"
            type="password"
            value={passwordNew}
            onChange={(e) => setPasswordNew(e.target.value)}
            disabled={!updatePassword}
          />
        </FlexBox>
      </SurfaceCard>
    </FlexBox>
  );

  const renderConfirmStep = () => {
    const { namePayload, emailPayload, passwordPayload } = buildPayloads();

    return (
      <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="body2" color="textSecondary">
          Please confirm the changes you want to apply. No changes will be applied until you click
          &quot;Confirm changes&quot;.
        </Typography>

        <SurfaceCard sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Summary
          </Typography>
          {!namePayload && !emailPayload && !passwordPayload ? (
            <Typography variant="body2" color="textSecondary">
              No changes selected.
            </Typography>
          ) : (
            <>
              {namePayload && (
                <>
                  <Typography variant="body2">
                    <strong>Name:</strong> {user?.name || '(current)'} → {namePayload.name}
                  </Typography>
                </>
              )}
              {emailPayload && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2">
                    <strong>Email:</strong> {user?.email || '(current)'} → {emailPayload.newEmail}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Current password will be sent but is not shown here for security reasons.
                  </Typography>
                </>
              )}
              {passwordPayload && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2">
                    <strong>Password:</strong> Will be updated.
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Only the server will see your passwords; they will be sent hashed using HTTPS.
                  </Typography>
                </>
              )}
            </>
          )}
        </SurfaceCard>
      </FlexBox>
    );
  };

  return (
    <Dialog open={open} onClose={handleCancel} fullWidth maxWidth="sm">
      <DialogTitle>Manage account</DialogTitle>
      <DialogContent dividers>
        {step === 'edit' ? renderEditStep() : renderConfirmStep()}
      </DialogContent>
      <DialogActions>
        <Button variant="text" color="inherit" onClick={handleCancel}>
          Cancel
        </Button>
        {step === 'confirm' && (
          <Button variant="outlined" color="primary" onClick={handleBack}>
            Back
          </Button>
        )}
        {step === 'edit' ? (
          <Button variant="contained" color="primary" onClick={handleNext}>
            Review changes
          </Button>
        ) : (
          <Button variant="contained" color="primary" onClick={handleConfirm}>
            Confirm changes
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

ManageAccountDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  user: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
  }),
};

export default ManageAccountDialog;
