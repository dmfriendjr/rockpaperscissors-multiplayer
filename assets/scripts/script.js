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
		this.playerChoice;
		this.playerMadeChoice = false;
		this.opponentId;
		this.opponentName;
		this.opponentChoice;
		this.opponentMadeChoice = false;
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
		if (snapshot.val() === null && this.opponentInitialized) {
			//Opponent was initialized but has now disconnected
			$(`#${this.opponentId}Name`).text('Disconnected!');			
			this.opponentInitialized = false;
			return;
		} else if (snapshot.val() === null) {
			//No opponent has connected yet
			return;
		}

		if (!this.opponentInitialized) {
			//Opponent has connected, update UI and variables
			this.opponentName = snapshot.val().name;
			$(`#${this.opponentId}Name`).text(this.opponentName);
			this.opponentInitialized = true;
			//Hide opponent input buttons
			$(`#${this.opponentId}InputWrapper`).hide();
			//Now listen for our input events
			$(`.${this.playerId}Input`).on('click', this.handleInput.bind(this));
		} else {
			//Opponent initialized, listening for opponent to make their choice
			if (snapshot.child('choice').exists()) {
				//Opponent has chosen
				console.log('Opponent picked option', snapshot.val().choice);
				this.opponentChoice = snapshot.val().choice;
				this.opponentMadeChoice = true;

				if (this.playerMadeChoice) {
					this.determineWinner();
				}
			}
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

	handleInput(event) {
		this.playerChoice = $(event.target).attr('data-choice');	

		database.ref(`players/${this.playerId}`).update({
			choice: this.playerChoice
		});

		//We chose, hide our input
		$(`#${this.playerId}InputWrapper`).hide();
		
		this.playerMadeChoice = true;

		if (this.opponentMadeChoice) {
			//Opponent has made choice already
			this.determineWinner();
		}
	}

	determineWinner() {
		if ((this.playerChoice === 'rock' && this.opponentChoice === 'scissors') ||
			(this.playerChoice === 'paper' && this.opponentChoice === 'rock') ||
			(this.playerChoice === 'scissors' && this.opponentChoice === 'paper')
		) {
			//Player wins
			console.log('You win!', this.playerChoice, 'beats', this.opponentChoice);
			$('#winnerName').text(this.playerName);
		} else {
			//Opponent wins
			console.log('You lose!', this.opponentChoice, 'beats', this.playerChoice);
			$('#winnerName').text(this.opponentName);
		}

		//Reset player choice on database
		database.ref(`players/${this.playerId}/choice`).remove();

		//Reset variables
		this.opponentMadeChoice = false;
		this.playerMadeChoice = false;

		//Reset UI to allow next round
		$(`#${this.playerId}InputWrapper`).show();
		
	}
}

let rpsMultiplayer = new RockPaperScissorsGame();
