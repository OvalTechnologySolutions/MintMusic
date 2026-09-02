import type {
  GetArtistProfileResponse,
  PutArtistProfileRequest,
  PutArtistProfileResponse,
} from '@mintmusic/shared';
import { apiFetch } from './client';

export function getArtistProfile(wallet: string) {
  return apiFetch<GetArtistProfileResponse>(
    `/v1/artists/${wallet}/profile`
  );
}

export function updateArtistProfile(
  wallet: string,
  body: PutArtistProfileRequest
) {
  return apiFetch<PutArtistProfileResponse>(
    `/v1/artists/${wallet}/profile`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    }
  );
}
