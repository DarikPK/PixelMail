import { Box, Paper } from '@mui/material';
import EmailActions from './EmailActions';
import EmailHeader from './EmailHeader';
import EmailBody from './EmailBody';
import EmailAttachments from './EmailAttachments';

interface Attachment {
  name: string;
  size: number;
  contentType?: string;
}

interface EmailData {
  id: string;
  resendEmailId: string;
  from: string;
  fromName: string;
  fromEmail: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  text: string;
  html: string;
  attachments: Attachment[];
  receivedAt: Date;
  read: boolean;
  starred: boolean;
  archived: boolean;
  deleted: boolean;
}

interface EmailViewerProps {
  email: EmailData;
  onBack: () => void;
  onToggleRead: () => void;
  onToggleStar: () => void;
  onToggleArchive: () => void;
  onToggleDelete: () => void;
  onDeleteForever: () => void;
  onDownloadAttachment: (filename: string) => void;
}

const EmailViewer = ({
  email,
  onBack,
  onToggleRead,
  onToggleStar,
  onToggleArchive,
  onToggleDelete,
  onDeleteForever,
  onDownloadAttachment
}: EmailViewerProps) => {
  return (
    <Box>
      <EmailActions
        emailId={email.id}
        read={email.read}
        starred={email.starred}
        archived={email.archived}
        deleted={email.deleted}
        onBack={onBack}
        onToggleRead={onToggleRead}
        onToggleStar={onToggleStar}
        onToggleArchive={onToggleArchive}
        onToggleDelete={onToggleDelete}
        onDeleteForever={onDeleteForever}
      />

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <EmailHeader
          subject={email.subject}
          read={email.read}
          from={email.from}
          fromName={email.fromName}
          fromEmail={email.fromEmail}
          to={email.to}
          cc={email.cc}
          bcc={email.bcc}
          receivedAt={email.receivedAt}
        />

        <EmailBody
          html={email.html}
          text={email.text}
        />

        <EmailAttachments
          attachments={email.attachments}
          onDownload={onDownloadAttachment}
        />
      </Paper>
    </Box>
  );
};

export default EmailViewer;
