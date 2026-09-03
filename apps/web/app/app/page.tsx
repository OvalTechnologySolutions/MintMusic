import { redirect } from 'next/navigation';

/** The record player is now the whole product at `/`. Keep `/app` as a redirect
 *  for any existing links / installed PWAs whose start_url was `/app`. */
export default function MintAppRedirect() {
  redirect('/');
}
