import { Box, Typography } from '@mui/material';

interface EmailBodyProps {
  html?: string;
  text?: string;
}

const EmailBody = ({ html, text }: EmailBodyProps) => {
  return (
    <Box sx={{ mt: 3, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, bgcolor: '#ffffff', minHeight: 300 }}>
      {html ? (
        <iframe
          title="Contenido del Correo"
          srcDoc={html}
          sandbox="allow-popups"
          style={{
            width: '100%',
            height: '450px',
            border: 'none',
            display: 'block'
          }}
        />
      ) : (
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', fontFamily: 'inherit' }}>
          {text || "(Este correo no tiene contenido)"}
        </Typography>
      )}
    </Box>
  );
};

export default EmailBody;
