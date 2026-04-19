import { useState } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  description: string;
  infoRu?: string;
  chartType?: string;
  chartLibrary?: string;
  children: ReactNode;
  wide?: boolean;
}

export default function MetricCard({ title, description, infoRu, chartType, chartLibrary, children, wide }: MetricCardProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <Paper
      sx={{
        p: 2.5,
        gridColumn: wide ? { xs: 'span 1', md: 'span 2' } : 'span 1',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" gutterBottom>
          {title}
        </Typography>
        {infoRu && (
          <>
            <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ mt: -0.5, ml: 1 }}>
              <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
            </IconButton>
            <Popover
              open={Boolean(anchorEl)}
              anchorEl={anchorEl}
              onClose={() => setAnchorEl(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ paper: { sx: { maxWidth: 360, p: 2 } } }}
            >
              <Typography variant="body2">{infoRu}</Typography>
            </Popover>
          </>
        )}
      </Box>
      {(chartType || chartLibrary) && (
        <Box sx={{ display: 'flex', gap: 0.75, mb: 0.75 }}>
          {chartType && <Chip label={chartType} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />}
          {chartLibrary && <Chip label={chartLibrary} size="small" variant="outlined" color="primary" sx={{ fontSize: 10, height: 20 }} />}
        </Box>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        {description}
      </Typography>
      {children}
    </Paper>
  );
}
