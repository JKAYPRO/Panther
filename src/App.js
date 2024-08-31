import React, { useEffect, useState } from 'react';
import { db } from './firebase/firebaseConfig';
import { collection, doc, setDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

const initialHoles = [
  { number: 1, par: 4, strokeIndex: 7 },
  { number: 2, par: 3, strokeIndex: 15 },
  { number: 3, par: 4, strokeIndex: 11 },
  { number: 4, par: 4, strokeIndex: 3 },
  { number: 5, par: 4, strokeIndex: 1 },
  { number: 6, par: 5, strokeIndex: 17 },
  { number: 7, par: 4, strokeIndex: 5 },
  { number: 8, par: 5, strokeIndex: 13 },
  { number: 9, par: 3, strokeIndex: 9 },
  { number: 10, par: 5, strokeIndex: 18 },
  { number: 11, par: 4, strokeIndex: 10 },
  { number: 12, par: 4, strokeIndex: 4 },
  { number: 13, par: 4, strokeIndex: 2 },
  { number: 14, par: 4, strokeIndex: 6 },
  { number: 15, par: 3, strokeIndex: 14 },
  { number: 16, par: 4, strokeIndex: 12 },
  { number: 17, par: 3, strokeIndex: 16 },
  { number: 18, par: 5, strokeIndex: 8 }
];

const calculateStableford = (grossScore, par, handicap, strokeIndex) => {
  if (grossScore == null) return 0;

  const netScore = grossScore - (handicap >= strokeIndex ? 1 : 0);
  const scoreDifference = netScore - par;

  switch (scoreDifference) {
    case 2: return 0;
    case 1: return 1;
    case 0: return 2;
    case -1: return 3;
    case -2: return 4;
    case -3: return 5;
    default: return 6;
  }
};

const isShotHole = (handicap, strokeIndex) => handicap >= strokeIndex;

const App = () => {
  const [players, setPlayers] = useState([{ name: '', handicap: 0, scores: Array(initialHoles.length).fill(null) }]);
  const [currentHole, setCurrentHole] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState('home');
  const [isTeamPlay, setIsTeamPlay] = useState(false);

  useEffect(() => {
    const savedGame = localStorage.getItem('golfGame');
    if (savedGame) {
      const gameState = JSON.parse(savedGame);
      setPlayers(gameState.players);
      setCurrentHole(gameState.currentHole);
      setTab(gameState.tab);
      setIsTeamPlay(gameState.isTeamPlay);
    }
  }, []);

  useEffect(() => {
    const gameState = { players, currentHole, tab, isTeamPlay };
    localStorage.setItem('golfGame', JSON.stringify(gameState));
  }, [players, currentHole, tab, isTeamPlay]);

  useEffect(() => {
    const q = query(collection(db, 'scores'), orderBy('total_score', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedLeaderboard = snapshot.docs.map(doc => doc.data());
      setLeaderboard(updatedLeaderboard);
    });

    return () => unsubscribe();
  }, []);

  const handleGameTypeSelection = (isTeam) => {
    setIsTeamPlay(isTeam);
    setTab('setup');
  };

  const handleAddNewPlayer = () => {
    setPlayers([...players, { name: '', handicap: 0, scores: Array(initialHoles.length).fill(null) }]);
  };

  const handleRemovePlayer = (index) => {
    const updatedPlayers = players.filter((_, i) => i !== index);
    setPlayers(updatedPlayers);
  };

  const handleUpdatePlayerInfo = (index, field, value) => {
    const updatedPlayers = [...players];
    updatedPlayers[index] = { ...updatedPlayers[index], [field]: value };
    setPlayers(updatedPlayers);
  };

  const handleUpdateScore = async (playerIndex, score) => {
    if (score == null || score < 0) return;
    const updatedPlayers = [...players];
    updatedPlayers[playerIndex].scores[currentHole] = score;
    setPlayers(updatedPlayers);

    const totalScore = updatedPlayers[playerIndex].scores.reduce(
      (acc, grossScore, i) => acc + calculateStableford(grossScore, initialHoles[i].par, updatedPlayers[playerIndex].handicap, initialHoles[i].strokeIndex),
      0
    );

    console.log("Attempting to write to Firestore...");
    console.log("Player Data: ", {
      player_name: updatedPlayers[playerIndex].name,
      handicap: updatedPlayers[playerIndex].handicap,
      scores: updatedPlayers[playerIndex].scores,
      total_score: totalScore,
    });

    try {
      await setDoc(doc(db, 'scores', updatedPlayers[playerIndex].name), {
        player_name: updatedPlayers[playerIndex].name,
        handicap: updatedPlayers[playerIndex].handicap,
        scores: updatedPlayers[playerIndex].scores,
        total_score: totalScore,
      });
      console.log("Document successfully written!");
    } catch (error) {
      console.error("Error writing document: ", error);
    }
  };

  const handleNextHole = () => {
    if (currentHole < initialHoles.length - 1) {
      setCurrentHole(currentHole + 1);
    } else {
      setTab('final');
    }
  };

  const handlePrevHole = () => {
    if (currentHole > 0) {
      setCurrentHole(currentHole - 1);
    }
  };

  const renderSetupScreen = () => (
    <div style={styles.container}>
      <h1 style={styles.title}>Setup Game</h1>
      <form style={styles.form}>
        {players.map((player, index) => (
          <div key={index} style={styles.playerForm}>
            <label htmlFor={`name-${index}`} style={styles.label}>Player {index + 1} Name:</label>
            <div style={styles.playerInputContainer}>
              <input
                type="text"
                id={`name-${index}`}
                value={player.name}
                onChange={(e) => handleUpdatePlayerInfo(index, 'name', e.target.value)}
                style={styles.input}
                placeholder="Enter player name"
              />
              {players.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => handleRemovePlayer(index)}
                    style={styles.removePlayerButton}
                  >
                    &times;
                  </button>
                </>
              )}
            </div>
            <label htmlFor={`handicap-${index}`} style={styles.label}>Handicap:</label>
            <input
              type="number"
              id={`handicap-${index}`}
              value={player.handicap}
              onChange={(e) => handleUpdatePlayerInfo(index, 'handicap', parseInt(e.target.value, 10))}
              style={styles.input}
              placeholder="Enter handicap"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddNewPlayer}
          style={styles.button}
        >
          Add Player
        </button>
        <button
          type="button"
          onClick={() => {
            if (players.every(player => player.name.trim() !== '' && player.handicap >= 0)) {
              setTab('scorecard');
            } else {
              alert('Please ensure all players have valid names and handicaps.');
            }
          }}
          style={styles.button}
        >
          Continue to Scoring
        </button>
        <button
          type="button"
          onClick={() => setTab('home')}
          style={styles.prevButton}
        >
          Back
        </button>
      </form>
    </div>
  );

  const renderScoringScreen = () => {
    const hole = initialHoles[currentHole];
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Hole {hole.number} - Scoring</h1>
        <div style={styles.holeDetails}>
          <p>Par: <span style={styles.boldText}>{hole.par}</span></p>
          <p>Stroke Index: <span style={styles.boldText}>{hole.strokeIndex}</span> {isShotHole(players[0].handicap, hole.strokeIndex) && <span style={styles.shotHole}>*Shot Hole*</span>}</p>
        </div>
        {players.map((player, playerIndex) => (
          <form key={playerIndex} style={styles.form}>
            <label htmlFor={`score-${playerIndex}`} style={styles.label}>{player.name}'s Score:</label>
            <input
              type="number"
              id={`score-${playerIndex}`}
              value={player.scores[currentHole] ?? ''}
              onChange={(e) => handleUpdateScore(playerIndex, parseInt(e.target.value, 10))}
              style={styles.input}
              placeholder="Enter score"
            />
            <p style={styles.stableford}>
              Stableford: {calculateStableford(player.scores[currentHole], hole.par, player.handicap, hole.strokeIndex)}
            </p>
          </form>
        ))}
        <div style={styles.buttonGroup}>
          <button
            type="button"
            onClick={handleNextHole}
            style={styles.nextButton}
          >
            Next Hole
          </button>
          <button
            type="button"
            onClick={handlePrevHole}
            disabled={currentHole === 0}
            style={styles.prevButton}
          >
            Previous Hole
          </button>
          <button
            type="button"
            onClick={() => setTab('setup')}
            style={styles.prevButton}
          >
            Back to Setup
          </button>
        </div>
      </div>
    );
  };

  const renderFinalScoreScreen = () => {
    const teamScore = players.reduce((total, player) => {
      return total + player.scores.reduce((acc, score, index) => {
        return acc + calculateStableford(score, initialHoles[index].par, player.handicap, initialHoles[index].strokeIndex);
      }, 0);
    }, 0);

    return (
      <div style={styles.finalContainer}>
        <div style={styles.finalScorecard}>
          <h1 style={styles.finalTitle}>Final Scores</h1>
          {isTeamPlay && <h2 style={styles.finalTeamScore}>Team Score: {teamScore}</h2>}

          <div style={styles.tableContainer}>
            <h2 style={styles.sectionTitle}>Leaderboard</h2>
            <div style={styles.scrollableTable}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.tableHeader}>Position</th>
                    <th style={styles.tableHeader}>Player</th>
                    <th style={styles.tableHeader}>Stableford Points</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr key={entry.player_name}>
                      <td style={styles.tableCell}>{index + 1}</td>
                      <td style={styles.tableCell}>{entry.player_name}</td>
                      <td style={styles.tableCell}>{entry.total_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMenu = () => (
    <div style={styles.menu}>
      <button onClick={() => setTab('home')} style={styles.menuItem}>Home</button>
      <button onClick={() => {
        if (players.every(player => player.name.trim() !== '' && player.handicap >= 0)) {
          setTab('setup');
        } else {
          alert('Please ensure all players have valid names and handicaps.');
        }
      }} style={styles.menuItem}>Setup</button>
      <button onClick={() => {
        if (players.every(player => player.name.trim() !== '' && player.handicap >= 0)) {
          setTab('scorecard');
        } else {
          alert('Please ensure all players have valid names and handicaps.');
        }
      }} style={styles.menuItem}>Scorecard</button>
      <button onClick={() => setTab('leaderboard')} style={styles.menuItem}>Leaderboard</button>
    </div>
  );

  const renderContent = () => {
    switch (tab) {
      case 'home':
        return (
          <div style={styles.container}>
            <h1 style={styles.title}>Choose Game Type</h1>
            <div style={styles.buttonGroup}>
              <button
                type="button"
                onClick={() => handleGameTypeSelection(false)}
                style={styles.button}
              >
                Singles
              </button>
              <button
                type="button"
                onClick={() => handleGameTypeSelection(true)}
                style={styles.button}
              >
                Team
              </button>
            </div>
          </div>
        );
      case 'setup':
        return renderSetupScreen();
      case 'scorecard':
        return renderScoringScreen();
      case 'final':
        return renderFinalScoreScreen();
      case 'leaderboard':
        return renderFinalScoreScreen();  // Ensure this points to the correct function
      default:
        return null;
    }
  };

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <button onClick={() => setMenuOpen(!menuOpen)} style={styles.hamburger}>
          &#9776;
        </button>
        <h1 style={styles.headerTitle}>Golf App</h1>
      </header>

      {menuOpen && renderMenu()}

      <main style={styles.mainContent}>
        {renderContent()}
      </main>
    </div>
  );
};

const styles = {
  appContainer: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f4f7fa',
    width: '100vw',
    overflowX: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#2E7D32',
    color: '#fff',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    width: '100%',
    zIndex: 1000,
  },
  hamburger: {
    fontSize: '24px',
    background: 'none',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    transition: 'color 0.3s ease',
    outline: 'none',
  },
  headerTitle: {
    fontSize: '24px',
    margin: 0,
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    width: '100%',
    boxSizing: 'border-box',
    position: 'relative',
    zIndex: 1,
  },
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '700px',
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '10px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease',
    margin: '20px 0',
    overflow: 'hidden',
  },
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: '20px',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    width: '100%',
  },
  label: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    textAlign: 'left',
  },
  input: {
    padding: '12px',
    fontSize: '16px',
    borderRadius: '5px',
    border: '1px solid #ddd',
    transition: 'border-color 0.3s ease',
    width: '100%',
  },
  reorderButton: {
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: '10px',
    cursor: 'pointer',
    outline: 'none',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
    marginTop: '20px',
  },
  button: {
    padding: '14px',
    fontSize: '18px',
    backgroundColor: '#2E7D32',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
    width: '100%',
    textAlign: 'center',
    outline: 'none',
  },
  nextButton: {
    padding: '14px',
    fontSize: '18px',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  prevButton: {
    padding: '14px',
    fontSize: '18px',
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  stableford: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#111827',
    marginTop: '5px',
  },
  tableContainer: {
    width: '100%',
    overflowX: 'auto',
  },
  scrollableTable: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
  },
  tableHeader: {
    borderBottom: '2px solid #ddd',
    padding: '10px',
    textAlign: 'left',
    backgroundColor: '#f8f9fa',
  },
  tableCell: {
    padding: '10px',
    borderBottom: '1px solid #ddd',
  },
};

export default App;
