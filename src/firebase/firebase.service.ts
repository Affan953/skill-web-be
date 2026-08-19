import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { FIRESTORE_DB } from './firebase.provider';

@Injectable()
export class FirebaseService {
  constructor(@Inject(FIRESTORE_DB) private readonly db: Firestore) {}

  getDb(): Firestore {
    return this.db;
  }
}
