export interface Profile {
  id: string;
  childId: string;
  nickname: string;
  gradeOrAgeBand: string | null;
  schoolOrGroup: string | null;
  interests: string[];
  interestDetails: string[];
  growthGoal: string | null;
  version: number;
}
export interface Me {
  user: { id: string; role: 'CHILD' | 'GUARDIAN'; needsFirstGreeting: boolean };
  profile: Profile | null;
}
export interface Token {
  accessToken: string;
}
