export type ThemeMode = "light" | "dark" | "system";

export type User = {
  id: string;
  displayName: string;
  partnerName: string;
  email?: string;
  emailVerified?: boolean;
  avatarUrl?: string;
  partnerAvatarUrl?: string;
  status: "active" | "blocked";
  coupleId: string;
};

export type Couple = {
  id: string;
  code: string;
  loveStartDate: string;
  memberIds: string[];
};

export type CheckIn = {
  id: string;
  coupleId: string;
  ownerId: string;
  ownerName: string;
  type: "photo" | "text" | "mood";
  imageUrl?: string;
  caption?: string;
  mood?: string;
  quickMessage?: string;
  reactions: Array<{ userId: string; type: ReactionType; createdAt: string }>;
  createdAt: string;
  updatedAt: string;
};

export type ReactionType = "heart" | "hug" | "kiss" | "laugh" | "miss";

export type MeResponse = {
  user: User;
  couple: Couple | null;
  stats: {
    streak: number;
    daysTogether: number;
  };
};

export type RandomCategory = {
  id: string;
  name: string;
  count: number;
};

export type RandomEvent = {
  id: string;
  category: string;
  prompt: string;
  detail?: string;
  createdAt: string;
  userId?: string;
};
