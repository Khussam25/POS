import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, setPersistence, browserSessionPersistence } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyD_t2bO4mL7SQCOHQoFW1axsd7WGGGmDi4",
  authDomain: "jeibe-pos-4af06.firebaseapp.com",
  projectId: "jeibe-pos-4af06",
  storageBucket: "jeibe-pos-4af06.firebasestorage.app",
  messagingSenderId: "329804560443",
  appId: "1:329804560443:web:2fd55b97803affb4e1c41e"
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

setPersistence(auth, browserSessionPersistence)
