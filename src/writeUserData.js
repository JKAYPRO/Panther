// src/writeUserData.js

import { db, ref, set } from './firebase/firebaseConfig';

function writeUserData(player_name, handicap, scores, total_score) {
  const reference = ref(db, 'players/' + player_name); // 'players/' is the path where the data is stored

  set(reference, {
    player: player_name,
    handicap: handicap,
    scores: scores,
    total_score: total_score
  })
  .then(() => {
    console.log("Data saved successfully!");
  })
  .catch((error) => {
    console.error("Error saving data: ", error);
  });
}

export default writeUserData;
