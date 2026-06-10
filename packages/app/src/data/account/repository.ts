import rawAccountData from "./mock/demo-account-data.json";
import {
  AccountDataSchema,
  type AccountData,
  type Achievement,
  type ActivityEvent,
  type DailyGoal,
  type DemoUser,
  type Lesson,
  type Profile,
  type StoreItem,
} from "./schema";

export interface DashboardData {
  user: DemoUser;
  profile: Profile;
  lessons: Lesson[];
  achievements: Achievement[];
  storeItems: StoreItem[];
  dailyGoals: DailyGoal[];
  activityTimeline: ActivityEvent[];
}

export interface AccountRepository {
  findUserByCredentials(email: string, password: string): DemoUser | null;
  getDashboardData(userId: string): DashboardData;
  decodeProfileAvatar(profile: Profile): string;
}

const accountData: AccountData = AccountDataSchema.parse(rawAccountData);

export const localAccountRepository: AccountRepository = {
  findUserByCredentials(email, password) {
    return (
      accountData.users.find((user) => user.email === email && user.password === password) ?? null
    );
  },
  getDashboardData(userId) {
    const user = accountData.users.find((candidate) => candidate.userId === userId);
    if (!user) throw new Error(`No user found for ${userId}`);

    const profile = accountData.profiles.find((candidate) => candidate.profileId === user.profileId);
    if (!profile) throw new Error(`No profile found for ${user.profileId}`);

    return {
      user,
      profile,
      lessons: accountData.lessons,
      achievements: accountData.achievements,
      storeItems: accountData.storeItems,
      dailyGoals: accountData.dailyGoals,
      activityTimeline: accountData.activityTimeline,
    };
  },
  decodeProfileAvatar(profile) {
    // Profile picture is persisted as Base64 for local parity with future blob storage.
    return `data:image/svg+xml;base64,${profile.avatarBase64}`;
  },
};
