import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};
import Link from '@tiptap/extension-link';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import FontFamily from '@tiptap/extension-font-family';
import { FontSize } from './FontSize';
import {
  Box,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Select,
  MenuItem
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatStrikethrough,
  FormatListBulleted,
  FormatListNumbered,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify,
  Link as LinkIcon,
  Undo,
  Redo,
  FormatColorFill
} from '@mui/icons-material';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = window.prompt('URL');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', p: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
      <ToggleButtonGroup size="small">
        <ToggleButton
          value="bold"
          selected={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <FormatBold fontSize="small" />
        </ToggleButton>
        <ToggleButton
          value="italic"
          selected={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <FormatItalic fontSize="small" />
        </ToggleButton>
        <ToggleButton
          value="underline"
          selected={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <FormatUnderlined fontSize="small" />
        </ToggleButton>
        <ToggleButton
          value="strike"
          selected={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <FormatStrikethrough fontSize="small" />
        </ToggleButton>
      </ToggleButtonGroup>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <input
          type="color"
          onInput={(event: any) => editor.chain().focus().setColor(event.target.value).run()}
          value={editor.getAttributes('textStyle').color || '#000000'}
          style={{ width: 24, height: 24, padding: 0, border: 'none', cursor: 'pointer' }}
          title="Color de texto"
        />
        <IconButton size="small" onClick={() => editor.chain().focus().toggleHighlight().run()} color={editor.isActive('highlight') ? 'primary' : 'default'}>
          <FormatColorFill fontSize="small" />
        </IconButton>
      </Box>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <Select
        size="small"
        value={editor.getAttributes('textStyle').fontFamily || 'Inter'}
        onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
        sx={{
          minWidth: { xs: 100, sm: 120 },
          height: 32,
          flex: { xs: '1 1 140px', sm: '0 1 auto' }
        }}
      >
        <MenuItem value="Inter">Predeterminado</MenuItem>
        <MenuItem value="Arial">Arial</MenuItem>
        <MenuItem value="Courier New">Courier New</MenuItem>
        <MenuItem value="Georgia">Georgia</MenuItem>
        <MenuItem value="Times New Roman">Times New Roman</MenuItem>
        <MenuItem value="Verdana">Verdana</MenuItem>
      </Select>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <Select
        size="small"
        value={editor.getAttributes('textStyle').fontSize || '16px'}
        onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
        sx={{
          minWidth: { xs: 68, sm: 80 },
          height: 32,
          flex: { xs: '1 1 80px', sm: '0 1 auto' }
        }}
      >
        <MenuItem value="12px">12px</MenuItem>
        <MenuItem value="14px">14px</MenuItem>
        <MenuItem value="16px">16px</MenuItem>
        <MenuItem value="18px">18px</MenuItem>
        <MenuItem value="20px">20px</MenuItem>
        <MenuItem value="24px">24px</MenuItem>
        <MenuItem value="30px">30px</MenuItem>
      </Select>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <ToggleButtonGroup size="small">
        <ToggleButton
          value="left"
          selected={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <FormatAlignLeft fontSize="small" />
        </ToggleButton>
        <ToggleButton
          value="center"
          selected={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <FormatAlignCenter fontSize="small" />
        </ToggleButton>
        <ToggleButton
          value="right"
          selected={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <FormatAlignRight fontSize="small" />
        </ToggleButton>
        <ToggleButton
          value="justify"
          selected={editor.isActive({ textAlign: 'justify' })}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        >
          <FormatAlignJustify fontSize="small" />
        </ToggleButton>
      </ToggleButtonGroup>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <ToggleButtonGroup size="small">
        <ToggleButton
          value="bulletList"
          selected={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <FormatListBulleted fontSize="small" />
        </ToggleButton>
        <ToggleButton
          value="orderedList"
          selected={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <FormatListNumbered fontSize="small" />
        </ToggleButton>
      </ToggleButtonGroup>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <IconButton size="small" onClick={addLink} color={editor.isActive('link') ? 'primary' : 'default'}>
        <LinkIcon fontSize="small" />
      </IconButton>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <IconButton size="small" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <Undo fontSize="small" />
      </IconButton>
      <IconButton size="small" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <Redo fontSize="small" />
      </IconButton>
    </Box>
  );
};

const Editor = ({ content, onChange }: EditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image,
      Link.configure({
        openOnClick: false,
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      FontFamily,
      FontSize,
    ],
    editorProps: {
      handleDOMEvents: {
        paste: (view, event) => {
          const items = event.clipboardData?.items;
          if (!items) return false;

          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
              const file = item.getAsFile();
              if (file) {
                event.preventDefault();
                fileToBase64(file).then((base64) => {
                  const node = view.state.schema.nodes.image.create({ src: base64 });
                  const transaction = view.state.tr.replaceSelectionWith(node);
                  view.dispatch(transaction);
                }).catch((err) => {
                  console.error("Error reading pasted image:", err);
                });
                return true; // handled
              }
            }
          }
          return false;
        },
        drop: (view, event) => {
          const files = event.dataTransfer?.files;
          if (!files || files.length === 0) return false;

          const file = files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
            if (coordinates) {
              fileToBase64(file).then((base64) => {
                const node = view.state.schema.nodes.image.create({ src: base64 });
                const transaction = view.state.tr.insert(coordinates.pos, node);
                view.dispatch(transaction);
              }).catch((err) => {
                console.error("Error reading dropped image:", err);
              });
            }
            return true; // handled
          }
          return false;
        }
      }
    },
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content === '') {
      editor.commands.clearContent();
    }
  }, [content, editor]);

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mt: 2, mb: 1, minHeight: 300, width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', overflow: 'hidden' }}>
      <MenuBar editor={editor} />
      <Box sx={{ p: { xs: 1, sm: 2 }, '& .ProseMirror': { outline: 'none', minHeight: 250, wordBreak: 'break-word', overflowWrap: 'anywhere' }, width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
        <EditorContent editor={editor} style={{ width: '100%', maxWidth: '100%', minWidth: 0 }} />
      </Box>
    </Box>
  );
};

export default Editor;
