export interface User {
  uid: string;
  username: string;
  email: string;
  photoUrl: string | null;
  role?: 'user' | 'admin';
  xp: number;
  level: number;
  totalHabits: number;
  currentStreak: number;
  longestStreak: number;
  /** Timestamp of the last habit completion — used for user streak calculation. */
  lastHabitCompletedAt?: Date | any;
  createdAt: Date | any; // Supports Date or Firestore Timestamp
  updatedAt: Date | any; // Supports Date or Firestore Timestamp
}
