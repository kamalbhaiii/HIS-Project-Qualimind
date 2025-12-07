import SurfaceCard from '../atoms/SurfaceCard';
import Typography from '../atoms/CustomTypography';
import FlexBox from '../atoms/FlexBox';
import Button from '../atoms/CustomButton';
import TextField from '@mui/material/TextField';

const ResetPasswordTemplate = ({  hasTokenProblem,
  tokenError,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  submitting,
  handleSubmit,
  handleBackToSignIn}) => {
    return (
        <FlexBox
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <SurfaceCard
        sx={{
          maxWidth: 420,
          width: '100%',
          p: 3,
          borderRadius: 3,
        }}
      >
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          Reset your password
        </Typography>

        {hasTokenProblem ? (
          <>
            <Typography variant="body2" color="error.main" sx={{ mb: 3 }}>
              {tokenError}
            </Typography>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={handleBackToSignIn}
            >
              Back to sign-in
            </Button>
          </>
        ) : (
          <>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Choose a new password for your account.
            </Typography>

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                type="password"
                label="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                size="small"
                margin="normal"
                required
              />

              <TextField
                fullWidth
                type="password"
                label="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                size="small"
                margin="normal"
                required
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                color="primary"
                disabled={submitting}
                sx={{ mt: 2 }}
              >
                {submitting ? 'Resetting password…' : 'Reset password'}
              </Button>

              <Button
                fullWidth
                variant="text"
                color="primary"
                sx={{ mt: 1.5 }}
                onClick={handleBackToSignIn}
              >
                Back to sign-in
              </Button>
            </form>
          </>
        )}
      </SurfaceCard>
    </FlexBox>
    );
}

export default ResetPasswordTemplate;