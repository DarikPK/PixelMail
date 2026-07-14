import React, { useState } from 'react';
import { Box, Typography, IconButton, Collapse } from '@mui/material';
import {
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowRight as ArrowRightIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon
} from '@mui/icons-material';
import type { SignatureBlock } from './types';

interface DOMTreePanelProps {
  blocks: SignatureBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onDeleteBlock: (id: string) => void;
  onUpdateBlockProperties: (id: string, updates: Partial<SignatureBlock>) => void;
}

export const DOMTreePanel: React.FC<DOMTreePanelProps> = ({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onDeleteBlock,
  onUpdateBlockProperties
}) => {
  const [expandedNodes, setExpandedFolders] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const renderNode = (block: SignatureBlock, depth: number = 0) => {
    const isSelected = selectedBlockId === block.id;
    const hasChildren = block.children && block.children.length > 0;
    const isExpanded = !!expandedNodes[block.id];

    return (
      <Box key={block.id} sx={{ display: 'flex', flexDirection: 'column' }}>
        <Box
          onClick={() => onSelectBlock(block.id)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 0.6,
            px: 1.0,
            pl: `${depth * 10 + 6}px`,
            borderRadius: '4px',
            cursor: 'pointer',
            border: '1px solid',
            borderColor: isSelected ? '#3B82F6' : 'transparent',
            bgcolor: isSelected ? 'rgba(59,130,246,0.06)' : 'transparent',
            mb: 0.2,
            transition: 'all 120ms',
            '&:hover': {
              bgcolor: isSelected ? 'rgba(59,130,246,0.08)' : 'action.hover'
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, gap: 0.5 }}>
            {hasChildren ? (
              <IconButton
                size="small"
                onClick={(e) => toggleExpand(block.id, e)}
                sx={{ p: 0.1, mr: 0.2, color: 'text.secondary' }}
              >
                {isExpanded ? <ArrowDownIcon sx={{ fontSize: '13px' }} /> : <ArrowRightIcon sx={{ fontSize: '13px' }} />}
              </IconButton>
            ) : (
              <Box sx={{ width: 14 }} />
            )}

            <Typography
              variant="caption"
              noWrap
              sx={{
                fontWeight: isSelected ? 'bold' : 500,
                fontSize: '10.5px',
                color: isSelected ? '#3B82F6' : 'text.primary'
              }}
            >
              {block.name}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 0.1 }} onClick={(e) => e.stopPropagation()}>
            <IconButton
              size="small"
              onClick={() => onUpdateBlockProperties(block.id, { hidden: !block.hidden })}
              sx={{ p: 0.1, color: block.hidden ? 'warning.main' : 'text.disabled' }}
            >
              {block.hidden ? <VisibilityOffIcon sx={{ fontSize: '11px' }} /> : <VisibilityIcon sx={{ fontSize: '11px' }} />}
            </IconButton>

            <IconButton
              size="small"
              onClick={() => onUpdateBlockProperties(block.id, { locked: !block.locked })}
              sx={{ p: 0.1, color: block.locked ? 'error.main' : 'text.disabled' }}
            >
              {block.locked ? <LockIcon sx={{ fontSize: '11px' }} /> : <LockOpenIcon sx={{ fontSize: '11px' }} />}
            </IconButton>

            <IconButton
              size="small"
              color="error"
              onClick={() => onDeleteBlock(block.id)}
              sx={{ p: 0.1 }}
            >
              <DeleteIcon sx={{ fontSize: '11px' }} />
            </IconButton>
          </Box>
        </Box>

        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit sx={{ pl: 0.5 }}>
            {block.children!.map((child) => renderNode(child, depth + 1))}
          </Collapse>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {blocks.length === 0 ? (
        <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic', display: 'block', textAlign: 'center', py: 2 }}>
          Árbol de estructura vacío.
        </Typography>
      ) : (
        blocks.map((b) => renderNode(b, 0))
      )}
    </Box>
  );
};
export default DOMTreePanel;
