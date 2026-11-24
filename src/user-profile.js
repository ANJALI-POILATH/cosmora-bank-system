// Reads and writes the signed-in user's own document at users/{uid}.
// firestore.rules only allows a user to touch the document whose ID is their
// own uid, so documents are keyed by uid (setDoc/getDoc) rather than created
// with random IDs (addDoc) or read as a whole collection (getDocs).
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export const signInToFirebase = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const signOutOfFirebase = () => signOut(auth);

function currentUid() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in to Firebase before reading or saving your profile.');
  return uid;
}

// Creates the document, or merges the given fields into an existing one.
export async function saveUserProfile(fields) {
  const ref = doc(db, 'users', currentUid());
  await setDoc(ref, { ...fields, updatedAt: serverTimestamp() }, { merge: true });
  return ref.id;
}

// Returns the profile, or null when the user has not saved one yet.
export async function getUserProfile() {
  const snapshot = await getDoc(doc(db, 'users', currentUid()));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}
