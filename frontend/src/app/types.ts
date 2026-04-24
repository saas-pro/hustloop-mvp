
export type View = "home" | "blog" | "mentors" | "incubators" | "submitIP" | "pricing" | "msmes" | "solveChallenges" | "dashboard" | "login" | "signup" | "education" | "contact" | "complete-profile" | "joinasanMSME" | "browseTech" | "marketplace" | "browseMSME" | "early-bird";
export type DashboardTab = "overview" | "msmes" | "events" | "ip/technologies" | "incubators" | "engagements" | "registration" | "mentors" | "submission" | "settings" | "users" | "blog" | "sessions" | "subscribers" | "aignite" | "connex" | "pitch-details" | "plans";
export type MentorDashboardTab = "overview" | "mentees" | "schedule" | "profile" | "settings";
export type SolveChallengeTab = "overview" | "submission" | "team" | "settings"
export type TechTransferTab = "overview" | "submission" | "engagements" | "settings"
export type InnovativeIdeaTab = "overview" | "incubators" | "mentors" | "submission" | "settings"
export type IncubatorDashboardTab = "overview" | "submissions" | "profile" | "settings";
export type MsmeDashboardTab = "overview" | "submissions" | "profile" | "engagement" | "settings";
export type UserRole = "admin" | "mentor" | "incubator" | "organisation" | "founder" | "blogger" ;
export type founderRole = "Solve Organisation's challenge" | "List a technology for licensing" | "Submit an innovative idea"
export type UserStatus = "active" | "banned" | "pending";

export type Comment = {
  id: number;
  author: 'Founder' | 'Incubator' | 'Triage Team' | 'MSME';
  text: string;
  timestamp: string;
};
export interface FileData {
  name: string;
  path: string;
  previewUrl: string;
  size?: number;
}
export interface ChallengeInfo {
  title: string | null;
  sector: string | null;
  technologyArea: string | null;
  status: string;
  allow_status_updates?: boolean;
  postedBy?: {
    companyName: string | null;
  } | null;
}


export type Submission = {
  user_id: string;
  solutionId: string
  challengeId: string;
  contactName: string;
  status: 'new' | 'under_review' | 'duplicate' | 'rejected' | 'solution_accepted_points' | 'triaged' | 'need_info' | 'winner';
  points: number;
  description: string;
  createdAt: string;
  district: string;
  placeOfResidence: string;
  mobileNumber: string;
  comments: Comment[];
  files?: FileData[];
  challenge?: ChallengeInfo | null;
  team_members?: TeamMember[];
  isOwner?: boolean;
  lastActive?: string;
};

type TeamMember = {
  userId: string;
  name: string;
  email: string;
};

export type AppUser = {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  auth_provider: 'local' | 'google' | 'linkedin';
  status: UserStatus;
  founder_role: founderRole;
  email_verified: boolean;
  active_plans?: string[];
  created_at: string;
};

export type NewsletterSubscriber = {
  id: number;
  email: string;
  subscribed_at: string;
};

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  image: string;
  hint?: string;
  featured_image_url?: string;
  youtube_embed_url?: string;
  meta_title?: string;
  meta_description?: string;
  tags?: string[];
  status: 'draft' | 'published';
  author_id: string;
  author?: {
    uid: string;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}
export type EducationSession = {
  language: string;
  date: string;
  time: string;
};

export type EducationFeature = {
  name: string;
  icon: string;
};

export type EducationProgram = {
  id: number;
  title: string;
  sessions: EducationSession[];
  description: string;
  features: EducationFeature[];
  created_at: string;
};





