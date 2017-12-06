  var config = {
    apiKey: "AIzaSyCjytawaV-Yv2Vw_Hp6iTKA9d_tcUnOPnY",
    authDomain: "rockpaperscissors-multip-1897b.firebaseapp.com",
    databaseURL: "https://rockpaperscissors-multip-1897b.firebaseio.com",
    projectId: "rockpaperscissors-multip-1897b",
    storageBucket: "",
    messagingSenderId: "307049576798"
  };
  firebase.initializeApp(config);


var database = firebase.database();



class RockPaperScissorsGame {
	constructor() {
		this.playerName;
		this.playerId;
		this.opponentId;
		this.opponentInitialized = false;
		this.inMatch = false;

		$('#nameInputSubmit').on('click', (event) => {
			event.preventDefault();
			//Hide name input
			$('#nameInputForm').hide();

			this.playerName = $('#nameInput').val();

			this.checkForExistingMatch();	
		});

		$(window).on('unload', () => {
			this.disconnect();	
		});
	}

	playerStatusUpdated(snapshot) {
		console.log(snapshot.ref(`${this.opponentId}`).val());
	}

	opponentStatusUpdated(snapshot) {
		console.log('Opponent data', snapshot.val());
		if (snapshot.val() === null) {
			//No opponent has connected yet
			return;
		}

		if (!this.opponentInitialized) {
			//Opponent has connected, update UI
			$(`#${this.opponentId}Name`).text(snapshot.val().name);
			this.opponentInitialized = true;
		}
	}
	
	checkForExistingMatch(playerName) {
		database.ref('players/p1').once('value').then((snapshot) => {
			if (snapshot.val() === null) {
				//We are the first player
				this.playerId = 'p1';
				this.opponentId = 'p2';
			} else {
				//We are the second player
				this.playerId = 'p2';
				this.opponentId = 'p1';
				//Need to display first players name
				$('#p1Name').text(snapshot.val().name);
			}

			this.initializePlayer(this.playerName, this.playerId);	
			//Listen for changes in opponent data
			database.ref(`players/${this.opponentId}`).on('value', this.opponentStatusUpdated.bind(this));
		});
	}

	initializePlayer(name, playerNumber) {
		this.inMatch = true;

		database.ref('players/' + playerNumber).set(
		{
			name: name,
			wins: 0,
			losses: 0
		});

		$(`#${playerNumber}Name`).text(name);
	}

	disconnect() {
		if (this.inMatch) {
			//Remove our data from database
			database.ref('players/' + this.playerId).remove();
		}
	}
}

let rpsMultiplayer = new RockPaperScissorsGame();
