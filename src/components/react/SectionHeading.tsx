import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';

interface SectionHeadingProps {
  title: string;
}

export default function SectionHeading({ title }: SectionHeadingProps) {
  return (
    <Box
      sx={{
        gridColumn: '1 / -1',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        pt: 1,
      }}
    >
      <Typography variant="subtitle1" fontWeight={600} noWrap>
        {title}
      </Typography>
      <Divider sx={{ flex: 1 }} />
    </Box>
  );
}
