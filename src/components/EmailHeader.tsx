import { Box, Typography, Chip, Card, CardContent, Avatar } from '@mui/material';

interface EmailHeaderProps {
  subject: string;
  read: boolean;
  from: string;
  fromName: string;
  fromEmail: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  receivedAt: Date;
}

const EmailHeader = ({
  subject,
  read,
  from,
  fromName,
  fromEmail,
  to,
  cc = [],
  bcc = [],
  receivedAt
}: EmailHeaderProps) => {
  const senderDisplayName = fromName || fromEmail || from;
  const avatarLetter = (fromName || fromEmail || from).charAt(0).toUpperCase();

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', wordBreak: 'break-word', flexGrow: 1 }}>
          {subject || "(Sin asunto)"}
        </Typography>
        <Chip
          label={read ? "Leído" : "No leído"}
          color={read ? "default" : "primary"}
          variant={read ? "outlined" : "filled"}
          size="small"
        />
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48, fontWeight: 'bold' }}>
              {avatarLetter}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
                <Typography variant="subtitle1" noWrap sx={{ fontWeight: 'bold' }}>
                  {senderDisplayName} {fromEmail && fromName ? `<${fromEmail}>` : ''}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {receivedAt.toLocaleString('es-PE', { dateStyle: 'full', timeStyle: 'medium' })}
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                <strong>Para:</strong> {to.join(', ')}
              </Typography>

              {cc.length > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  <strong>CC:</strong> {cc.join(', ')}
                </Typography>
              )}

              {bcc.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  <strong>CCO:</strong> {bcc.join(', ')}
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EmailHeader;
