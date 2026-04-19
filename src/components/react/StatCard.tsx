import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

interface StatCardProps {
  title: string;
  description: string;
  source: string;
  value: string;
  detail: string;
  hasData: boolean;
  valueId?: string;
  detailId?: string;
}

export default function StatCard({
  title,
  description,
  source,
  value,
  detail,
  hasData,
  valueId,
  detailId,
}: StatCardProps) {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="subtitle2" gutterBottom>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
        {description}
      </Typography>
      <Typography variant="caption" color="text.disabled" display="block" mb={2}>
        Source: {source}
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
          <Typography id={detailId} variant="body2" color="text.secondary" mt={0.5}>
            {detail}
          </Typography>
        </Box>
      ) : (
        <Box display="flex" alignItems="center" justifyContent="center" height={64}>
          <Typography variant="body2" color="text.disabled">
            No data available
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
