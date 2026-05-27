export type ChallengeStatus = 'BeforeStart' | 'Active' | 'Ended' | 'Hidden';

export type ChallengeRole = 'challenger' | 'spectator' | null;

export interface Challenge {
  id: number;
  title: string;
  description: string;
  logoUrl?: string | null;
  soundUrl?: string | null;
  uploadType: 'Video' | 'Image' | 'Audio';
  status: ChallengeStatus;
  deadlineUtc: string;
  startAtUtc?: string;
  endAtUtc?: string;
  prizePoints: {
    first: number;
    second: number;
    third: number;
  };
  currentUserRoleId?: number | null;
  currentUserRole?: ChallengeRole;
  currentUserSubmissionId?: number | null;
  currentUserVotedSubmissionId?: number | null;
  hasCurrentUserJoined: boolean;
  hasCurrentUserSubmitted: boolean;
  hasCurrentUserVoted: boolean;
}

export interface ChallengeSubmission {
  id: number;
  challengeId: number;
  userId: number;
  userName: string;
  userPhotoUrl?: string | null;
  mediaUrl: string;
  mediaType: 'Video' | 'Image' | 'Audio';
  caption?: string | null;
  votes: number;
  isOwn: boolean;
  isVotedByCurrentUser: boolean;
  createdAtUtc: string;
}

export interface ChallengeLeaderboardItem {
  rank: number;
  submissionId: number;
  userId: number;
  userName: string;
  userPhotoUrl?: string | null;
  mediaUrl: string;
  mediaType: string;
  caption?: string | null;
  votes: number;
  pointsEarned: number;
  isOwn: boolean;
}

export interface VoteChallengeSubmissionResponse {
  success: boolean;
  submissionId: number;
  newVoteCount: number;
  votedSubmissionId: number;
}

export interface CreateChallengePayload {
  title: string;
  description: string;
  soundUrl?: string;
  uploadType: 'Video' | 'Image' | 'Audio';
  deadlineUtc: string;
  startAtUtc: string;
  endAtUtc: string;
  status: ChallengeStatus;
  firstPlacePts: number;
  secondPlacePts: number;
  thirdPlacePts: number;
  logo?: File | null;
}

export interface UpdateChallengePayload extends CreateChallengePayload {
  removeLogo?: boolean;
}

export interface ChallengeComment {
  user: string;
  text: string;
  color: string;
}

export interface ChallengeWithWinners {
  id: number;
  title: string;
  description: string;
  logoUrl?: string | null;
  uploadType: 'Video' | 'Image' | 'Audio';
  prizePoints: {
    first: number;
    second: number;
    third: number;
  };
  winners: ChallengeLeaderboardItem[];
}
