import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, cert, getApps, App } from 'firebase-admin';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

export const FIREBASE_APP = 'FIREBASE_APP';
export const FIREBASE_AUTH = 'FIREBASE_AUTH';
export const FIRESTORE_DB = 'FIRESTORE_DB';

export const firebaseProviders: Provider[] = [
  {
    provide: FIREBASE_APP,
    inject: [ConfigService],
    useFactory: (configService: ConfigService): App => {
      const projectId = configService.get<string>('firebase.projectId');
      const clientEmail = configService.get<string>('firebase.clientEmail');
      const privateKey = configService.get<string>('firebase.privateKey');

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Firebase configuration credentials are missing.');
      }

      const apps = getApps();
      if (apps.length > 0) {
        return apps[0];
      }

      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

      const app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey,
        }),
      });

      console.log('Firebase initialized successfully');
      return app;
    },
  },
  {
    provide: FIREBASE_AUTH,
    inject: [FIREBASE_APP],
    useFactory: (app: App): Auth => {
      return getAuth(app);
    },
  },
  {
    provide: FIRESTORE_DB,
    inject: [FIREBASE_APP],
    useFactory: (app: App): Firestore => {
      const db = getFirestore(app);
      console.log('Firestore connected');
      return db;
    },
  },
];
