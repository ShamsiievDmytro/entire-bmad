import { useState } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface StatCardProps {
  title: string;
  description: string;
  infoRu?: string;
  chartType?: string;
  value: string;
  detail: string;
  hasData: boolean;
  valueId?: string;
  detailId?: string;
}

export default function StatCard({
  title,
  description,
  infoRu,
  chartType = 'Stat card',
  value,
  detail,
  hasData,
  valueId,
  detailId,
}: StatCardProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <Paper sx={{ p: 2.5 }}>
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
      <Box sx={{ display: 'flex', gap: 0.75, mb: 0.75 }}>
        <Chip label={chartType} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        {description}
      </Typography>
      {hasData ? (
        <Box>
          <Typography
            id={valueId}
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 48,
              lineHeight: 1.1,
              fontWeight: 600,
              color: 'primary.main',
            }}
          >
            {value}
          </Typography>
          <Typography id={detailId} variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {detail}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 64 }}>
          <Typography variant="body2" color="text.disabled">
            No data available
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
