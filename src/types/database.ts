export type ProfileStatus = "ACTIVE" | "SUSPENDED" | "BANNED" | "DELETED";
export type ProfileRole = "USER" | "ADMIN" | "SUPER_ADMIN";

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  country: string;
  birth_date: string;
  bio: string | null;
  status: ProfileStatus;
  role: ProfileRole;
  terms_accepted_at: string;
  privacy_accepted_at: string;
  rules_accepted_at: string;
  created_at: string;
  updated_at: string;
};

export type PublicProfile = Pick<
  Profile,
  "id" | "username" | "avatar_url" | "country" | "bio" | "created_at"
>;

export type ReferenceStatus = "ACTIVE" | "INACTIVE";

export type Game = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  status: ReferenceStatus;
  created_at: string;
};

export type Platform = {
  id: string;
  name: string;
  slug: string;
  status: ReferenceStatus;
  created_at: string;
};

export type GameAccount = {
  id: string;
  user_id: string;
  game_id: string;
  platform_id: string;
  player_identifier: string;
  verified: boolean;
  created_at: string;
};

export type GameAccountWithDetails = GameAccount & {
  game: Pick<Game, "id" | "name" | "slug">;
  platform: Pick<Platform, "id" | "name" | "slug">;
};

export type TournamentStatus =
  | "DRAFT"
  | "REGISTRATION_OPEN"
  | "REGISTRATION_CLOSED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type Tournament = {
  id: string;
  name: string;
  description: string | null;
  game_id: string;
  platform_id: string;
  format: string;
  max_players: number;
  registration_start: string;
  registration_end: string;
  start_date: string;
  status: TournamentStatus;
  rules: string | null;
  entry_fee: number;
  prize_pool: number;
  currency: string;
  created_by: string | null;
  created_at: string;
};

export type TournamentPublic = Tournament & {
  participant_count: number;
  game_name: string;
  game_slug: string;
  platform_name: string;
  platform_slug: string;
};

export type TournamentParticipantStatus = "REGISTERED" | "CHECKED_IN" | "WITHDRAWN" | "DISQUALIFIED";

export type TournamentParticipantPublic = {
  id: string;
  tournament_id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  status: TournamentParticipantStatus;
  seed: number | null;
  registered_at: string;
};

export type MatchStatus =
  | "SCHEDULED"
  | "READY"
  | "IN_PROGRESS"
  | "AWAITING_CONFIRMATION"
  | "DISPUTED"
  | "COMPLETED"
  | "FORFEIT"
  | "CANCELLED";

export type Match = {
  id: string;
  tournament_id: string;
  round: number;
  match_number: number;
  player_1_id: string | null;
  player_2_id: string | null;
  player_1_score: number | null;
  player_2_score: number | null;
  winner_id: string | null;
  next_match_id: string | null;
  next_match_slot: number | null;
  scheduled_at: string | null;
  deadline: string | null;
  status: MatchStatus;
  created_at: string;
  completed_at: string | null;
};

export type MatchPublic = Match & {
  player_1_username: string | null;
  player_2_username: string | null;
};

export type MatchReport = {
  id: string;
  match_id: string;
  reported_by: string;
  player_1_score: number;
  player_2_score: number;
  evidence_path: string | null;
  comment: string | null;
  created_at: string;
};

export type DisputeReason =
  | "RESULT_CONTESTED"
  | "OPPONENT_ABSENT"
  | "DISCONNECTION"
  | "GAME_SERVER_DOWN"
  | "CONNECTION_ISSUE"
  | "WRONG_IDENTIFIER"
  | "ABUSIVE_BEHAVIOR"
  | "CHEATING_SUSPICION"
  | "OTHER";

export type DisputeStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";

export type Dispute = {
  id: string;
  match_id: string;
  opened_by: string;
  reason: DisputeReason;
  description: string | null;
  evidence_path: string | null;
  status: DisputeStatus;
  decision: string | null;
  resolved_by: string | null;
  created_at: string;
  resolved_at: string | null;
};

export type Device = {
  id: string;
  user_id: string;
  expo_push_token: string;
  platform: "ios" | "android";
  created_at: string;
  last_seen_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
};

export type PlayerStats = {
  user_id: string;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  win_rate: number;
  tournaments_played: number;
  tournaments_won: number;
};

export type RankingEntry = PlayerStats & {
  username: string;
  avatar_url: string | null;
  score: number;
};

export type SanctionType = "WARNING" | "SUSPENSION" | "BAN";

export type Sanction = {
  id: string;
  user_id: string;
  type: SanctionType;
  reason: string;
  created_by: string | null;
  start_date: string;
  end_date: string | null;
  created_at: string;
};
