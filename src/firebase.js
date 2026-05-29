import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, setPersistence, browserSessionPersistence } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyD5uBXaVikFxT3TirvZmZb9y8lbI2TztQI",
  authDomain: "jeibe-pos.firebaseapp.com",
  projectId: "jeibe-pos",
  storageBucket: "jeibe-pos.firebasestorage.app",
  messagingSenderId: "364646510024",
  appId: "1:364646510024:web:d8618d0031ea9044c5a4fd"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

// Session-only persistence: closing/reopening the browser tab requires a fresh login
setPersistence(auth, browserSessionPersistence)
