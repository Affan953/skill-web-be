import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { FIRESTORE_DB } from '../firebase/firebase.provider';
import { User } from './users.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(@Inject(FIRESTORE_DB) private readonly firestore: Firestore) {}

  private get usersCollection() {
    return this.firestore.collection('users');
  }

  async findOne(uid: string): Promise<User | null> {
    const docRef = this.usersCollection.doc(uid);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return null;
    }

    const data = docSnap.data();
    return this.mapFirestoreToUser(data);
  }

  async findAll(limit = 100): Promise<User[]> {
    const snapshot = await this.usersCollection
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapFirestoreToUser(doc.data()));
  }

  async countAll(): Promise<number> {
    const snapshot = await this.usersCollection.count().get();
    return snapshot.data().count;
  }

  async create(
    uid: string,
    email: string,
    username: string,
    photoUrl: string | null,
  ): Promise<User> {
    const userDocRef = this.usersCollection.doc(uid);

    const newUser: User = {
      uid,
      username,
      email,
      photoUrl: photoUrl || null,
      xp: 0,
      level: 1,
      totalHabits: 0,
      currentStreak: 0,
      longestStreak: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await userDocRef.set(newUser);
    return newUser;
  }

  async update(uid: string, updateProfileDto: UpdateProfileDto): Promise<User> {
    const userDocRef = this.usersCollection.doc(uid);

    return this.firestore.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(userDocRef);

      if (!docSnap.exists) {
        throw new NotFoundException(`User with UID ${uid} not found`);
      }

      const currentData = docSnap.data() as User;
      const updatedFields: Partial<User> = {
        updatedAt: new Date(),
      };

      if (updateProfileDto.username !== undefined) {
        updatedFields.username = updateProfileDto.username;
      }
      if (updateProfileDto.photoUrl !== undefined) {
        updatedFields.photoUrl = updateProfileDto.photoUrl || null;
      }

      transaction.update(userDocRef, updatedFields);

      return {
        ...currentData,
        ...updatedFields,
      };
    });
  }

  private mapFirestoreToUser(data: any): User {
    return {
      uid: data.uid,
      username: data.username,
      email: data.email,
      photoUrl: data.photoUrl,
      role: data.role ?? 'user',
      xp: data.xp,
      level: data.level,
      totalHabits: data.totalHabits,
      currentStreak: data.currentStreak,
      longestStreak: data.longestStreak,
      createdAt:
        data.createdAt instanceof Date
          ? data.createdAt
          : data.createdAt?.toDate?.() || data.createdAt,
      updatedAt:
        data.updatedAt instanceof Date
          ? data.updatedAt
          : data.updatedAt?.toDate?.() || data.updatedAt,
    };
  }
}
