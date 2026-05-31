export type ChallengeStatus = 'BeforeStart' | 'Active' | 'Ended' | 'Hidden';

export type ChallengeRole = 'challenger' | 'spectator' | null;

export interface TeamMemberInfoDto {
  userId: number;
  username: string;
  photoUrl?: string | null;
}

export interface ChallengeParticipantInfo {
  userId: number;
  username: string;
  photoUrl?: string | null;
  role: string;
  teamName?: string | null;
  teamId?: number | null;
  isTeamOwner?: boolean;
}

export interface Challenge {
  id: number;
  title: string;
  description: string;
  logoUrl?: string | null;
  soundUrl?: string | null;
  uploadType: 'Video' | 'Image' | 'Audio' | 'PhotoRate';
  status: ChallengeStatus;
  deadlineUtc: string;
  startAtUtc?: string;
  endAtUtc?: string;
  prizePoints: {
    first: number;
    second: number;
    third: number;
  };
  minParticipants: number;
  minSubmissions: number;
  currentUserRoleId?: number | null;
  currentUserRole?: ChallengeRole;
  currentUserSubmissionId?: number | null;
  currentUserSubmissionMediaUrl?: string | null;
  currentUserSubmissionMediaType?: string | null;
  currentUserVotedSubmissionId?: number | null;
  hasCurrentUserJoined: boolean;
  hasCurrentUserSubmitted: boolean;
  hasCurrentUserVoted: boolean;
  participants: ChallengeParticipantInfo[];
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
  teamName?: string | null;
  teamMembers?: TeamMemberInfoDto[];
  isTeamOwner?: boolean;
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
  teamName?: string | null;
  teamMembers?: TeamMemberInfoDto[];
  isTeamOwner?: boolean;
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
  uploadType: 'Video' | 'Image' | 'Audio' | 'PhotoRate';
  deadlineUtc: string;
  startAtUtc: string;
  endAtUtc: string;
  status: ChallengeStatus;
  firstPlacePts: number;
  secondPlacePts: number;
  thirdPlacePts: number;
  minParticipants: number;
  minSubmissions: number;
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
  uploadType: 'Video' | 'Image' | 'Audio' | 'PhotoRate';
  prizePoints: {
    first: number;
    second: number;
    third: number;
  };
  winners: ChallengeLeaderboardItem[];
}
