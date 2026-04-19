import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  description: string;
  source: string;
  children: ReactNode;
  wide?: boolean;
}

export default function MetricCard({ title, description, source, children, wide }: MetricCardProps) {
  return (
    <Paper
      sx={{
        p: 2.5,
        gridColumn: wide ? { xs: 'span 1', md: 'span 2' } : 'span 1',
      }}
    >
      <Typography variant="subtitle2" gutterBottom>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
        {description}
      </Typography>
      <Typography variant="caption" color="text.disabled" display="block" mb={2}>
        Source: {source}
      </Typography>
      {children}
    </Paper>
  );
}
