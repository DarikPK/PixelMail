import { Box, Typography } from '@mui/material';

interface EmailBodyProps {
  html?: string;
  text?: string;
}

const injectMobileFriendlyCSS = (rawHtml: string): string => {
  if (!rawHtml) return rawHtml;
  const responsiveStyle = `
    <style>
      img { max-width: 100% !important; height: auto !important; }
      table { max-width: 100% !important; width: 100% !important; table-layout: fixed !important; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        margin: 8px;
        word-wrap: break-word;
        overflow-x: hidden;
      }
    </style>
  `;
  return responsiveStyle + rawHtml;
};

const EmailBody = ({ html, text }: EmailBodyProps) => {
  const processedHtml = html ? injectMobileFriendlyCSS(html) : '';

  return (
    <Box sx={{ mt: 3, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, p: { xs: 1, sm: 2 }, bgcolor: '#ffffff', minHeight: 300 }}>
      {html ? (
        <iframe
          title="Contenido del Correo"
          srcDoc={processedHtml}
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
