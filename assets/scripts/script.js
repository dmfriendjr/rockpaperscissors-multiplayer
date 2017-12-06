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
		this.matchId;
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
	
	checkForExistingMatch() {
		$('.playArea').show();
		//Hide each player area until match is determined
		$('.p1PlayArea').hide();
		$('.p2PlayArea').hide();

		//Get open matches
		let matchFound = false;
		database.ref('openMatches').once('value').then((snapshot) => {
			if (snapshot.val() === null) {
				console.log('There are no open matches, need to make new');
				this.matchId = database.ref().child('openMatches').push().key;
				this.initializePlayer(this.playerName, 'p1', this.matchId);
				this.opponentId = 'p2';
				database.ref(`openMatches/` + this.matchId + `/players/${this.opponentId}`).on('value', this.opponentStatusUpdated.bind(this));	
				matchFound = true;
			} else {

				database.ref().child('openMatches').once('value').then((snapshot) => {
					snapshot.forEach((childSnapshot) => {
						console.log(childSnapshot.child('players/p2').exists());
						if (childSnapshot.child('players/p2').exists() === false) {
							//We can join this match
							this.matchId = childSnapshot.key;
							this.initializePlayer(this.playerName, 'p2', this.matchId);
							this.opponentId = 'p1';
							database.ref(`openMatches/` + this.matchId + `/players/${this.opponentId}`).on('value', this.opponentStatusUpdated.bind(this));		
							matchFound = true;
							console.log('Found a match');
						}
					});
					if (!matchFound) {
						console.log('Match was not found, force creating');
						//No open matches found, make new match
						this.matchId = database.ref().child('openMatches').push().key;
						this.initializePlayer(this.playerName, 'p1', this.matchId);
						this.opponentId = 'p2';
						database.ref(`openMatches/` + this.matchId + `/players/${this.opponentId}`).on('value', this.opponentStatusUpdated.bind(this));		
					}
				});
			}
		});


	}

	initializePlayer(name, playerNumber, matchId) {
		this.inMatch = true;
		this.playerId = playerNumber;

		database.ref('openMatches/' + matchId + '/players/' + playerNumber).set(
		{
			name: name,
			wins: 0,
			losses: 0
		});

		//Update UI
		$(`.${this.playerId}PlayArea`).show();
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

		database.ref(`openMatches/${this.matchId}/players/${this.playerId}`).update({
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
		database.ref(`openMatches/` + matchId + `/players/${this.playerId}/choice`).remove();

		//Reset variables
		this.opponentMadeChoice = false;
		this.playerMadeChoice = false;

		//Update wins and losses
		database.ref(`openMatches/` + matchId + `/players/${this.playerId}`).update({
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
