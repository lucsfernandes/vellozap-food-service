/** Domain model mirroring `onboarding_progress`. */
export interface OnboardingProgress {
  id: string;
  userId: string;
  stepName: string;
  completed: boolean;
  completedAt: Date | null;
  createdAt: Date;
}
