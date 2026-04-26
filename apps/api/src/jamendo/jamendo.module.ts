import { Global, Module } from '@nestjs/common';
import { JamendoService } from './jamendo.service';

@Global()
@Module({
  providers: [JamendoService],
  exports: [JamendoService],
})
export class JamendoModule {}
