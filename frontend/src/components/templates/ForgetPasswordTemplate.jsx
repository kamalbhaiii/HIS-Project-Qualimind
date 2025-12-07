import SurfaceCard from '../../components/atoms/SurfaceCard';
import Typography from '../../components/atoms/CustomTypography';
import FlexBox from '../../components/atoms/FlexBox';
import Button from '../../components/atoms/CustomButton';
import TextField from '@mui/material/TextField';

const ForgotPasswordTemplate = ({handleBackToSignIn, handleSubmit, email, setEmail, submitting}) => {
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
          Forgot your password?
        </Typography>

        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Enter the email address associated with your account and we’ll send you
          a link to reset your password.
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            type="email"
            label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            {submitting ? 'Sending reset link…' : 'Send reset link'}
          </Button>

          <Button
            fullWidth
            variant="text"
            color="primary"
            onClick={handleBackToSignIn}
            sx={{ mt: 1.5 }}
          >
            Back to sign-in
          </Button>
        </form>
      </SurfaceCard>
    </FlexBox>
)
}

export default ForgotPasswordTemplate;