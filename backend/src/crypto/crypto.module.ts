import { Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { HashingService } from './hashing.service';

@Module({
  providers: [EncryptionService, HashingService],
  exports: [EncryptionService, HashingService],
})
export class CryptoModule {}
