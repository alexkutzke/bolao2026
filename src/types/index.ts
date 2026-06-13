export interface Match {
  id: number;
  api_id: number;
  home_team_id: string;
  away_team_id: string;
  home_team_name: string;
  away_team_name: string;
  home_score: number | null;
  away_score: number | null;
  group_name: string;
  matchday: number;
  match_date: string;
  stadium: string;
  stage: 'group' | 'knockout';
  finished: boolean;
  home_team_label: string | null;
  away_team_label: string | null;
  manually_set: boolean;
  updated_at: string;
}

export interface ApiGame {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: string;
  away_score: string;
  group: string;
  matchday: string;
  date?: string;
  local_date: string;
  stadium_id: string;
  finished: string;
  time_elapsed: string;
  type: string;
  home_team_name_en: string;
  home_team_name_fa: string;
  away_team_name_en: string;
  away_team_name_fa: string;
  home_team_label: string;
  away_team_label: string;
}

export interface ApiTeam {
  id: string;
  name_en: string;
  name_fa: string;
  flag: string;
  fifa_code: string;
  iso2: string;
  groups: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

export interface Prediction {
  id: number;
  user_id: string;
  match_id: number;
  home_score: number;
  away_score: number;
  points: number | null;
  points_detail: 'exact' | 'winner_diff' | 'winner' | 'one_team_goals' | null;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  name: string;
  total_points: number;
  exact_scores: number;
  winner_diff: number;
  winners: number;
  one_team_goals: number;
  change: 'up' | 'down' | 'same' | null;
}

export type CompetitionSlug = 'group' | 'knockout';
