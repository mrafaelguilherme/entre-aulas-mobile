import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marca uma rota que abre sem login. Sem esta marca, toda rota exige token.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
