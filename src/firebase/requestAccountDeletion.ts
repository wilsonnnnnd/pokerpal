import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { accountDeletionDoc } from '@/constants/namingVar';

export type DeletionRequest = {
  uid: string;
  requestedAt: string; // ISO
  expiresAt: string; // ISO
  status: 'pending' | 'cancelled' | 'completed';
};

/**
 * Create or update a pending account deletion request for the given uid.
 * Writes a document to `user_deletes/{uid}` with requestedAt and expiresAt fields.
 * Client computes expiresAt (now + days). The backend Cloud Function (or scheduler)
 * should look for pending requests and perform the actual deletion when expiresAt passes.
 */
export async function requestAccountDeletion(uid: string, days = 7): Promise<DeletionRequest> {
  if (!uid) throw new Error('uid-required');
  const now = Date.now();
  const requestedAt = new Date(now).toISOString();
  // delete after 7 days of request
  const expiresAt = new Date(now + days * 24 * 60 * 60 * 1000).toISOString();

  const payload: DeletionRequest = {
    uid,
    requestedAt,
    expiresAt,
    status: 'pending',
  };

  const ref = doc(db, accountDeletionDoc, uid);
  await setDoc(ref, payload, { merge: true });
  return payload;
}
