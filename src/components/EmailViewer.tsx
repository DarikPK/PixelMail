import { useEffect, useState } from 'react';
import { Box, Paper } from '@mui/material';
import EmailActions from './EmailActions';
import EmailHeader from './EmailHeader';
import EmailBody from './EmailBody';
import EmailAttachments from './EmailAttachments';
import { useAuth } from '../contexts/AuthContext';
import { isInlineAttachment } from '../utils/attachmentHelper';
import type { Attachment } from '../utils/attachmentHelper';

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

const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error || new Error('No se pudo leer el adjunto'));
  reader.readAsDataURL(blob);
});

const replaceCidReference = (html: string, cid: string | null | undefined, dataUrl: string) => {
  if (!cid) return html;
  const normalized = cid.trim().replace(/^<|>$/g, '');
  if (!normalized) return html;
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(new RegExp(`cid:${escaped}`, 'gi'), dataUrl);
};

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
  const { user } = useAuth();
  const [resolvedHtml, setResolvedHtml] = useState(email.html || '');

  const fetchAttachmentBlob = async (filename: string, attachmentId?: string): Promise<Blob> => {
    if (!user) throw new Error('Sesión no disponible');
    if (!email.resendEmailId) throw new Error('Identificador del correo no disponible');

    const sendEmailUrl = import.meta.env.VITE_SEND_EMAIL_URL;
    if (!sendEmailUrl) throw new Error('VITE_SEND_EMAIL_URL no configurada');

    const token = await user.getIdToken();
    const endpoint = sendEmailUrl.replace('/sendEmail', '/getAttachment');
    const params = new URLSearchParams({
      emailId: email.resendEmailId,
      filename
    });
    if (attachmentId) {
      params.set('attachmentId', attachmentId);
    }

    const response = await fetch(`${endpoint}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`No se pudo obtener el adjunto (${response.status})`);
    }

    return response.blob();
  };

  // Los correos recibidos pueden traer logos/firma como cid:. Los convertimos a
  // data URLs locales para que el iframe sandbox pueda mostrarlos sin exponer el token.
  useEffect(() => {
    let cancelled = false;
    setResolvedHtml(email.html || '');

    if (!user || !email.html || !email.resendEmailId || !Array.isArray(email.attachments)) {
      return () => {
        cancelled = true;
      };
    }

    const inlineAttachments = email.attachments.filter((attachment) =>
      attachment && isInlineAttachment(attachment, email.html)
    );

    if (inlineAttachments.length === 0) {
      return () => {
        cancelled = true;
      };
    }

    const resolveInlineImages = async () => {
      let nextHtml = email.html;

      for (const attachment of inlineAttachments) {
        const filename = typeof attachment.name === 'string' && attachment.name.trim()
          ? attachment.name
          : 'adjunto';

        try {
          const blob = await fetchAttachmentBlob(filename, attachment.id);
          const dataUrl = await blobToDataUrl(blob);
          nextHtml = replaceCidReference(nextHtml, attachment.contentId, dataUrl);
          nextHtml = replaceCidReference(nextHtml, attachment.id, dataUrl);
          nextHtml = replaceCidReference(nextHtml, attachment.name, dataUrl);
        } catch (error) {
          console.info(`[PIXEL MAIL] No se pudo resolver un recurso inline (${filename}).`, error);
        }
      }

      if (!cancelled) {
        setResolvedHtml(nextHtml);
      }
    };

    void resolveInlineImages();

    return () => {
      cancelled = true;
    };
  }, [email.id, email.resendEmailId, email.html, email.attachments, user]);

  const handleDownload = async (filename: string, attachmentId?: string) => {
    try {
      const blob = await fetchAttachmentBlob(filename, attachmentId);
      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = filename || 'adjunto';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.info('[PIXEL MAIL] Descarga por ID no disponible; usando compatibilidad por nombre.', error);
      onDownloadAttachment(filename);
    }
  };

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
          html={resolvedHtml}
          text={email.text}
        />

        <EmailAttachments
          attachments={email.attachments}
          onDownload={handleDownload}
          emailHtml={email.html}
        />
      </Paper>
    </Box>
  );
};

export default EmailViewer;
