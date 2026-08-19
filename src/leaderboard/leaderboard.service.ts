import {
  Injectable,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { FIRESTORE_DB } from '../firebase/firebase.provider';
import { LeaderboardEntryDto } from './dto/leaderboard-entry.dto';

@Injectable()
export class LeaderboardService {
  constructor(@Inject(FIRESTORE_DB) private readonly firestore: Firestore) {}

  private get usersCollection() {
    return this.firestore.collection('users');
  }

  private baseQuery() {
    return this.usersCollection
      .orderBy('xp', 'desc')
      .orderBy('level', 'desc')
      .orderBy('currentStreak', 'desc');
  }

  private mapToEntry(
    doc: FirebaseFirestore.QueryDocumentSnapshot,
    rank: number,
  ): LeaderboardEntryDto {
    const data = doc.data();
    return {
      rank,
      uid: doc.id,
      displayName: data.username ?? 'Unknown',
      photoURL: data.photoUrl ?? null,
      level: data.level ?? 1,
      xp: data.xp ?? 0,
      streak: data.currentStreak ?? 0,
    };
  }

  async getTopUsers(limit: number = 100): Promise<LeaderboardEntryDto[]> {
    try {
      const snapshot = await this.baseQuery().limit(limit).get();
      return snapshot.docs.map((doc, index) => this.mapToEntry(doc, index + 1));
    } catch (error) {
      console.error('Error fetching leaderboard data from Firestore:', error);
      throw new InternalServerErrorException(
        'Failed to retrieve leaderboard data.',
      );
    }
  }

  async getUserRank(uid: string): Promise<LeaderboardEntryDto | null> {
    try {
      const snapshot = await this.baseQuery().get();
      const targetIndex = snapshot.docs.findIndex((doc) => doc.id === uid);

      if (targetIndex === -1) {
        return null;
      }

      return this.mapToEntry(snapshot.docs[targetIndex], targetIndex + 1);
    } catch (error) {
      console.error('Error fetching user rank from Firestore:', error);
      throw new InternalServerErrorException('Failed to retrieve user rank.');
    }
  }
}
