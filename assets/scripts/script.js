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
		this.playerWins = 0;
		this.playerLosses = 0;
		this.opponentId;
		this.opponentName;
		this.opponentChoice;
		this.opponentMadeChoice = false;
		this.opponentInitialized = false;
		this.inMatch = false;

		$('.playArea').hide();

		$('#nameInputSubmit').on('click', (event) => {
			event.preventDefault();

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
			$(`#${this.opponentId}WinsDisplay`).text(snapshot.val().wins);
			$(`#${this.opponentId}LossesDisplay`).text(snapshot.val().losses);
			$(`.${this.opponentId}PlayArea`).show();
			//Hide opponent input buttons
			$(`#${this.opponentId}InputWrapper`).hide();
			//Now listen for our input events
			$(`.${this.playerId}Input`).on('click', this.handleInput.bind(this));
		} else {
			//Update wins/losses display for opponent
			$(`#${this.opponentId}WinsDisplay`).text(snapshot.val().wins);
			$(`#${this.opponentId}LossesDisplay`).text(snapshot.val().losses);

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
		$('.playArea').show();
		//Hide each player area until match is determined
		$('.p1PlayArea').hide();
		$('.p2PlayArea').hide();

		database.ref('players/p1').once('value').then((snapshot) => {
			if (snapshot.val() === null) {
				//We are the first player, no match yet
				this.playerId = 'p1';
				this.opponentId = 'p2';
				$('.p1PlayArea').show();
			} else {
				//We are the second player, have a match
				this.playerId = 'p2';
				this.opponentId = 'p1';
				//Need to display first players name
				$('#p1Name').text(snapshot.val().name);
				$('.p1PlayArea').show();
				$('.p2PlayArea').show();
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

		//Update UI
		$(`#${this.playerId}WinsDisplay`).text(this.playerWins);
		$(`#${this.playerId}LossesDisplay`).text(this.playerLosses);
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
		
		//Clear win message from last round
		$('#winnerMessage').empty();

		this.playerMadeChoice = true;
		

		if (this.opponentMadeChoice) {
			//Opponent has made choice already
			this.determineWinner();
		}
	}

	determineWinner() {
		if (this.playerChoice === this.opponentChoice) {
			//Draw
			$('#winnerMessage').text('Draw!');
		}
		else if ((this.playerChoice === 'rock' && this.opponentChoice === 'scissors') ||
			(this.playerChoice === 'paper' && this.opponentChoice === 'rock') ||
			(this.playerChoice === 'scissors' && this.opponentChoice === 'paper')
		) {
			//Player wins
			$('#winnerMessage').text(`${this.playerName} Wins!`);
			//Increase wins for player
			this.playerWins++;
		} else {
			//Opponent wins
			$('#winnerMessage').text(`${this.opponentName} Wins!`);
			//Increase losses for player
			this.playerLosses++;
		}

		//Show player choices
		$(`#${this.playerId}ChoiceDisplay`).text(this.playerChoice);
		$(`#${this.opponentId}ChoiceDisplay`).text(this.opponentChoice);

		//Reset player choice on database
		database.ref(`players/${this.playerId}/choice`).remove();

		//Reset variables
		this.opponentMadeChoice = false;
		this.playerMadeChoice = false;

		//Update wins and losses
		database.ref(`players/${this.playerId}`).update({
				wins: this.playerWins,
				losses: this.playerLosses 
		});

		$(`#${this.playerId}WinsDisplay`).text(this.playerWins);
		$(`#${this.playerId}LossesDisplay`).text(this.playerLosses);

		//Reset UI to allow next round
		$(`#${this.playerId}InputWrapper`).show();
		
	}
}

let rpsMultiplayer = new RockPaperScissorsGame();