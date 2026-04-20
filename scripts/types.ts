export interface CacheMeta {
  repo: string;
  branch: string;
  generatedAt: string;
  checkpointCount: number;
}

export interface TurnMeta {
  turn_id: string;
  session_id: string;
  model: string;
  prompt_txt: string;
  turn_count: number;
  agent_percentage: number;
}

export interface CheckpointMeta {
  checkpoint_id: string;
  commit_date: string;
  agent_percentage: number;
  agent_lines: number;
  human_added: number;
  human_modified: number;
  human_removed: number;
  tokens: {
    input: number;
    cache_creation: number;
    cache_read: number;
    output: number;
  };
  summary: {
    friction: string[];
    open_items: string[];
  };
  learnings: { repo: number; code: number; workflow: number };
  files_touched: string[];
  turns: TurnMeta[];
  bmad_commands: Record<string, number>;
  tool_usage: Record<string, number>;
  skill_usage: Record<string, number>;
  subagent_count: number;
  author: string;
  fetch_failed: boolean;
}

export interface CheckpointsCache {
  meta: CacheMeta;
  checkpoints: CheckpointMeta[];
}
