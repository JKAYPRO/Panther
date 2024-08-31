import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD65dC0-1uOCGbV7yrcV2lYNsscRLkcNCQ",
  authDomain: "panther-6f0cd.firebaseapp.com",
  databaseURL: "https://panther-6f0cd-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "panther-6f0cd",
  storageBucket: "panther-6f0cd.appspot.com",
  messagingSenderId: "79959948540",
  appId: "1:79959948540:web:ce079235a45e8f374f6b79",
  measurementId: "G-S0KNWJZ54Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
