import { Module, Global } from '@nestjs/common';
import { firebaseProviders } from './firebase.provider';
import { FirebaseService } from './firebase.service';

@Global()
@Module({
  providers: [...firebaseProviders, FirebaseService],
  exports: [...firebaseProviders, FirebaseService],
})
export class FirebaseModule {}
