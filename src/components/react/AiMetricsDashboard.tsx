import { useState, useCallback, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { lightTheme } from '../../lib/mui-theme';
import { filterRenderableCheckpoints, formatCheckpointOptionLabel, formatGeneratedAt } from '../../lib/utils/ai-metrics-utils';
import { fetchCheckpointsCache } from '../../lib/utils/github-checkpoints';
import type { CheckpointMeta, CheckpointsCache } from '../../lib/utils/ai-metrics-utils';

import AttributionSection from './AttributionSection';
import TokenSection from './TokenSection';
import QualitySection from './QualitySection';
import BehavioralSection from './BehavioralSection';
import TemporalSection from './TemporalSection';

interface CacheMeta {
  repo: string;
  branch: string;
  generatedAt: string;
  checkpointCount: number;
}

interface Props {
  initialCheckpoints: CheckpointMeta[];
  meta: CacheMeta | null;
  source: { repo: string; branch: string };
}

export default function AiMetricsDashboard({ initialCheckpoints, meta, source }: Props) {
  const [allCheckpoints, setAllCheckpoints] = useState(initialCheckpoints);
  const [selectedValue, setSelectedValue] = useState('all');
  const [cacheMeta, setCacheMeta] = useState(meta);
  const [refreshStatus, setRefreshStatus] = useState(
    meta === null
      ? 'No cached commit snapshot is loaded. Use the refresh button to fetch data directly from GitHub.'
      : 'Dashboard is showing the cached commit snapshot until you refresh.',
  );
  const [refreshTone, setRefreshTone] = useState<'default' | 'success' | 'error'>('default');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sorted = useMemo(
    () => [...allCheckpoints].sort((a, b) => new Date(a.commit_date).getTime() - new Date(b.commit_date).getTime()),
    [allCheckpoints],
  );

  const selectedCheckpoints = useMemo(() => {
    if (selectedValue === 'all') return allCheckpoints;
    return allCheckpoints.filter((c) => c.checkpoint_id === selectedValue);
  }, [allCheckpoints, selectedValue]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshStatus('Fetching the latest commit data from GitHub...');
    setRefreshTone('default');

    try {
      const result = await fetchCheckpointsCache();
      const filtered = filterRenderableCheckpoints(result.cache.checkpoints);
      setAllCheckpoints(filtered);
      setCacheMeta(result.cache.meta);

      const stillExists = filtered.some((c) => c.checkpoint_id === selectedValue);
      if (!stillExists && selectedValue !== 'all') setSelectedValue('all');

      setRefreshStatus(
        `Loaded ${result.cache.meta.checkpointCount} commits in ${(result.elapsedMs / 1000).toFixed(1)}s across ${result.apiCallCount} GitHub API calls.`,
      );
      setRefreshTone('success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setRefreshStatus(`Refresh failed: ${message}`);
      setRefreshTone('error');
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedValue]);

  const statusColor = refreshTone === 'success' ? 'success.main' : refreshTone === 'error' ? 'error.main' : 'text.disabled';

  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />

      {/* Header */}
      <Paper sx={{ p: 2.5, mb: 4 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', xl: 'row' },
            gap: 2,
            alignItems: { xl: 'flex-end' },
            justifyContent: { xl: 'space-between' },
          }}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3 }}>
            <Box>
              <Typography variant="caption" color="text.disabled">Repository</Typography>
              <Typography variant="body2" color="primary" fontWeight={500}>
                {cacheMeta?.repo ?? source.repo}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.disabled">Branch</Typography>
              <Typography variant="body2" color="text.secondary">
                {cacheMeta?.branch ?? source.branch}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.disabled">Commits</Typography>
              <Typography variant="body2" fontWeight={600}>
                {cacheMeta?.checkpointCount ?? 0}
              </Typography>
            </Box>
            <Box sx={{ minWidth: '12rem' }}>
              <Typography variant="caption" color="text.disabled">Generated</Typography>
              <Typography variant="body2" color="text.secondary">
                {formatGeneratedAt(cacheMeta?.generatedAt)}
              </Typography>
            </Box>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>View</InputLabel>
              <Select
                label="View"
                value={selectedValue}
                onChange={(e) => setSelectedValue(e.target.value)}
                disabled={allCheckpoints.length === 0}
              >
                <MenuItem value="all">All Commits</MenuItem>
                {sorted.map((cp) => (
                  <MenuItem key={cp.checkpoint_id} value={cp.checkpoint_id}>
                    {formatCheckpointOptionLabel(cp)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Button
            variant="outlined"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh From GitHub'}
          </Button>
        </Box>

        <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <Typography variant="caption" color={statusColor}>
            {refreshStatus}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            GitHub API limit is 60 requests per hour when used without a token.
          </Typography>
        </Box>
      </Paper>

      {/* Metrics Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          gap: 3,
        }}
      >
        <AttributionSection checkpoints={selectedCheckpoints} />
        <TokenSection checkpoints={selectedCheckpoints} />
        <QualitySection checkpoints={selectedCheckpoints} />
        <BehavioralSection checkpoints={selectedCheckpoints} />
        <TemporalSection checkpoints={selectedCheckpoints} />
      </Box>
    </ThemeProvider>
  );
}
