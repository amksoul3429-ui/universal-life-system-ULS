/**
 * Universal Life System — Core Engine
 * Central rules for progression and reward integrity.
 */

export const SYSTEM_CONFIG = {
  name: "Universal Life System",
  version: "1.1.0",
  xpPerLevel: 500,
  creditsPerTenXp: 1,
  minimumMissionCredits: 1,
} as const;

export type MissionRecord = {
  id: string;
  done?: boolean;
  xp?: number;
};

export type RewardRecord = {
  id: string;
  cost?: number;
  redeemed?: boolean;
};

export function getLevel(xp: number): number {
  const safeXp = Math.max(0, Math.floor(Number(xp) || 0));
  return Math.floor(safeXp / SYSTEM_CONFIG.xpPerLevel) + 1;
}

export function xpIntoLevel(xp: number): number {
  const safeXp = Math.max(0, Math.floor(Number(xp) || 0));
  return safeXp % SYSTEM_CONFIG.xpPerLevel;
}

export function levelProgressPercent(xp: number): number {
  return (xpIntoLevel(xp) / SYSTEM_CONFIG.xpPerLevel) * 100;
}

export function completeMissionReward<T extends MissionRecord>(
  missions: T[],
  currentXp: number,
  currentCredits: number,
  missionId: string
) {
  const mission = missions.find(item => item.id === missionId);

  if (!mission || mission.done) {
    return {
      awarded: false,
      missions,
      xp: currentXp,
      credits: currentCredits,
      reason: !mission ? "Mission not found" : "Mission already completed",
    };
  }

  const rawXp = mission.xp == null ? 50 : Number(mission.xp);

const rewardXp = Number.isFinite(rawXp)
  ? Math.max(0, Math.floor(rawXp))
  : 0;

const earnedCredits = Math.max(
  SYSTEM_CONFIG.minimumMissionCredits,
  Math.floor(
    (rewardXp / 10) * SYSTEM_CONFIG.creditsPerTenXp
  )
);

  return {
    awarded: true,
    missions: missions.map(item =>
      item.id === missionId ? { ...item, done: true } : item
    ),
    xp: currentXp + rewardXp,
    credits: currentCredits + earnedCredits,
    reason: "Mission completed",
  };
}

export function redeemReward<T extends RewardRecord>(
  rewards: T[],
  currentCredits: number,
  rewardId: string
) {
  const reward = rewards.find(item => item.id === rewardId);

  if (!reward || reward.redeemed) {
    return {
      redeemed: false,
      rewards,
      credits: currentCredits,
      reason: !reward ? "Reward not found" : "Reward already redeemed",
    };
  }

  const cost = Math.max(0, Math.floor(Number(reward.cost) || 0));

  if (cost <= 0 || currentCredits < cost) {
    return {
      redeemed: false,
      rewards,
      credits: currentCredits,
      reason: "Insufficient credits or invalid reward cost",
    };
  }

  return {
    redeemed: true,
    rewards: rewards.map(item =>
      item.id === rewardId ? ({ ...item, redeemed: true } as T) : item
    ),
    credits: currentCredits - cost,
    reason: "Reward redeemed",
  };
}
