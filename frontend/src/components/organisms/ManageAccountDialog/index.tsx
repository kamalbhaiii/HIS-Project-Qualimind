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

import {
  updateMyName,
  updateMyEmail,
  updateMyPassword,
  getMe,
} from '../../../services/modules/auth.api';
import { getAuth, saveAuth } from '../../../lib/authStorage';

const ManageAccountDialog = ({ open, onClose, user, onUserUpdated }) => {
  const { showToast } = useToast();

  const [step, setStep] = React.useState('edit'); // 'edit' | 'confirm'
  const [loading, setLoading] = React.useState(false);

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

  React.useEffect(() => {
    if (open) {
      setStep('edit');
      setLoading(false);
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
    if (loading) return;
    onClose?.();
  };

  const buildPayloads = () => {
    const payloads = {};

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
    const { namePayload, emailPayload, passwordPayload } = buildPayloads();

    if (!namePayload && !emailPayload && !passwordPayload) {
      showToast('Select at least one thing to update.', 'warning');
      return;
    }

    if (emailPayload) {
      if (!emailPayload.newEmail || !emailPayload.currentPassword) {
        showToast('Fill both new email and current password.', 'warning');
        return;
      }
    }

    if (passwordPayload) {
      if (!passwordPayload.currentPassword || !passwordPayload.newPassword) {
        showToast('Fill both current and new password.', 'warning');
        return;
      }
      if (passwordPayload.newPassword.length < 8) {
        showToast('New password must be at least 8 characters.', 'warning');
        return;
      }
    }

    setStep('confirm');
  };

  const handleBack = () => {
    if (loading) return;
    setStep('edit');
  };

  const handleConfirm = async () => {
    const { namePayload, emailPayload, passwordPayload } = buildPayloads();

    setLoading(true);
    const errors = [];

    try {
      // 1) Call update APIs as needed
      if (namePayload) {
        try {
          await updateMyName(namePayload);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Error updating name', err);
          const msg =
            err?.response?.data?.message ||
            'Failed to update name. Make sure this account is not a Google-only account.';
          errors.push(msg);
        }
      }

      if (emailPayload) {
        try {
          await updateMyEmail(emailPayload);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Error updating email', err);
          const status = err?.response?.status;
          const msg =
            err?.response?.data?.message ||
            (status === 401
              ? 'Current password is incorrect.'
              : status === 403
              ? 'Email change is not allowed for Google sign-in accounts.'
              : status === 409
              ? 'This email is already in use.'
              : 'Failed to update email.');
          errors.push(msg);
        }
      }

      if (passwordPayload) {
        try {
          await updateMyPassword(passwordPayload);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Error updating password', err);
          const status = err?.response?.status;
          const msg =
            err?.response?.data?.message ||
            (status === 401
              ? 'Current password is incorrect.'
              : status === 403
              ? 'Password change is not allowed for Google sign-in accounts.'
              : 'Failed to update password.');
          errors.push(msg);
        }
      }

      // 2) Always try to refresh user data if any update section was selected
      if (namePayload || emailPayload || passwordPayload) {
        try {
          const freshUser = await getMe();
          const { token } = getAuth();

          if (token && freshUser) {
            saveAuth({ token, user: freshUser });
          }

          if (freshUser) {
            onUserUpdated?.(freshUser);
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Error fetching latest user with getMe()', err);
          // non-fatal: just means UI might be a bit stale
        }
      }

      if (errors.length === 0) {
        showToast('Account updated successfully.', 'success');
        onClose?.();
      } else {
        showToast(errors.join(' '), 'error');
      }
    } finally {
      setLoading(false);
    }
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
          disabled={!updateName || loading}
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
            disabled={!updateEmail || loading}
          />
          <TextField
            fullWidth
            size="small"
            label="Current password"
            type="password"
            value={emailCurrentPassword}
            onChange={(e) => setEmailCurrentPassword(e.target.value)}
            disabled={!updateEmail || loading}
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
            disabled={!updatePassword || loading}
          />
          <TextField
            fullWidth
            size="small"
            label="New password"
            type="password"
            value={passwordNew}
            onChange={(e) => setPasswordNew(e.target.value)}
            disabled={!updatePassword || loading}
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
          Please confirm the changes you want to apply.
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
                    Only the server will see your passwords; they will be transmitted over HTTPS.
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
        <Button variant="text" color="inherit" onClick={handleCancel} disabled={loading}>
          Cancel
        </Button>
        {step === 'confirm' && (
          <Button variant="outlined" color="primary" onClick={handleBack} disabled={loading}>
            Back
          </Button>
        )}
        {step === 'edit' ? (
          <Button variant="contained" color="primary" onClick={handleNext} disabled={loading}>
            Review changes
          </Button>
        ) : (
          <Button variant="contained" color="primary" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Saving…' : 'Confirm changes'}
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
  onUserUpdated: PropTypes.func, // (updatedUser) => void
};

export default ManageAccountDialog;
