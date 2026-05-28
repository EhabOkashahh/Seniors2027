import type { Challenge, ChallengeSubmission, ChallengeComment } from './types';

export const MOCK_CHALLENGE: Challenge = {
  id: 2027,
  title: 'Guess The Senior',
  description: 'Upload a childhood photo and let everyone vote for the hardest one to guess.',
  deadlineUtc: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'Active',
  uploadType: 'Image',
  soundUrl: 'https://www.tiktok.com/music/Graduation-Vibes-2027-7382910394857',
  prizePoints: {
    first: 100,
    second: 50,
    third: 25
  },
  minParticipants: 6,
  minSubmissions: 4,
  hasCurrentUserJoined: false,
  hasCurrentUserSubmitted: false,
  hasCurrentUserVoted: false,
  participants: []
};

export const INITIAL_MOCK_SUBMISSIONS: ChallengeSubmission[] = [
  {
    id: 1,
    challengeId: 2027,
    userId: 101,
    userName: 'Ahmed_77',
    caption: 'I was literally a round potato.',
    mediaUrl: '/seniors-logo.png',
    mediaType: 'Image',
    votes: 12,
    isOwn: false,
    isVotedByCurrentUser: false,
    createdAtUtc: new Date().toISOString()
  },
  {
    id: 2,
    challengeId: 2027,
    userId: 102,
    userName: 'Sara.M',
    caption: 'The haircut my mom gave me was a crime.',
    mediaUrl: '/icons.svg',
    mediaType: 'Image',
    votes: 24,
    isOwn: false,
    isVotedByCurrentUser: false,
    createdAtUtc: new Date().toISOString()
  },
  {
    id: 3,
    challengeId: 2027,
    userId: 103,
    userName: 'Ziad_Rocks',
    caption: 'Ready to graduate since 2008.',
    mediaUrl: '/favicon.svg',
    mediaType: 'Image',
    votes: 18,
    isOwn: false,
    isVotedByCurrentUser: false,
    createdAtUtc: new Date().toISOString()
  },
  {
    id: 4,
    challengeId: 2027,
    userId: 104,
    userName: 'Laila_Vibes',
    caption: 'Check the drip.',
    mediaUrl: '/Asset 1.svg',
    mediaType: 'Image',
    votes: 7,
    isOwn: false,
    isVotedByCurrentUser: false,
    createdAtUtc: new Date().toISOString()
  },
  {
    id: 5,
    challengeId: 2027,
    userId: 105,
    userName: 'Omar.K',
    caption: 'Standard school photo energy.',
    mediaUrl: '/seniors-logo.png',
    mediaType: 'Image',
    votes: 15,
    isOwn: false,
    isVotedByCurrentUser: false,
    createdAtUtc: new Date().toISOString()
  },
  {
    id: 6,
    challengeId: 2027,
    userId: 106,
    userName: 'Mariam_G',
    caption: 'Why am I wearing a hat indoors?',
    mediaUrl: '/icons.svg',
    mediaType: 'Image',
    votes: 21,
    isOwn: false,
    isVotedByCurrentUser: false,
    createdAtUtc: new Date().toISOString()
  }
];

export const MOCK_COMMENTS: ChallengeComment[] = [
  { user: 'Ahmed', text: 'This challenge is already cursed 😂', color: 'var(--accent-yellow)' },
  { user: 'Sara', text: 'Someone upload first!', color: 'var(--accent-pink-soft)' },
  { user: 'Ziad', text: 'The winner better be funny.', color: 'var(--accent-blue)' }
];
