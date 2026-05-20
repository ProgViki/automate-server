import { Param, ParseUUIDPipe } from '@nestjs/common';

export const IdParam = () => Param('id', ParseUUIDPipe);
