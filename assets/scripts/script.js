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

			this.playerName = $('#nameInput').val();
			
			if (this.playerName.length === 0) {
				//Must enter valid name, can't be blank
				return;
			}

			$('#nameInputForm').hide();			
			this.checkForExistingMatch();	
		});

		$('#chatInputSubmit').on('click', (event) => {
			event.preventDefault();

			let chatMessage = $('#chatInput').val();
			
			if (chatMessage.length === 0) {
				return;
			}

			$('#chatInput').val('');
			this.sendChatMessage(chatMessage);
		});

		$(window).on('unload', () => {
			this.disconnect();	
		});
	}

	updateOpponentDisplay(snapshot) {
		$(`#${this.opponentId}WinsDisplay`).text(snapshot.val().wins);
		$(`#${this.opponentId}LossesDisplay`).text(snapshot.val().losses);
	}

	updatePlayerDisplay() {
		$(`#${this.playerId}WinsDisplay`).text(this.playerWins);
		$(`#${this.playerId}LossesDisplay`).text(this.playerLosses);
	}
	
	initializePlayer(name, playerId, matchId) {
		this.inMatch = true;

		database.ref('openMatches/' + matchId + '/players/' + this.playerId).set(
		{
			name: name,
			wins: 0,
			losses: 0
		});

		//Update UI
		$(`.${this.playerId}PlayArea`).show();
		$(`#${this.playerId}Name`).text(name);
		this.updatePlayerDisplay();
	}

	handleInput(event) {
		this.playerChoice = $(event.target).attr('data-choice');	

		database.ref(`openMatches/${this.matchId}/players/${this.playerId}`).update({
			choice: this.playerChoice
		});

		
		//Clear win message from last round
		$('#winnerMessage').empty();
		
		this.playerMadeChoice = true;
		//Display our choice, disable input
		$(`#${this.playerId}ChoiceDisplay`).text(this.playerChoice);
		this.toggleInputButtons(true);

		if (this.opponentMadeChoice) {
			//Opponent has made choice already, decide winner
			this.determineWinner();
		}
	}

	toggleInputButtons(disabled) {
		$(`.${this.playerId}Input`).each( (index, element) => {
			$(element).prop('disabled', disabled);
		});

	}

	checkForExistingMatch() {
		$('.playArea').show();
		//Hide each player area until match is determined
		$('.p1PlayArea').hide();
		$('.p2PlayArea').hide();

		//Get open matches
		database.ref('openMatches').once('value').then((snapshot) => {
			database.ref().child('openMatches').once('value').then((snapshot) => {

				//Search openMatches for one we can join	
				let matchFound = snapshot.forEach((childSnapshot) => {
					if (childSnapshot.child('players/p1').exists() === false) {
						//We can join this match as p1
						this.matchId = childSnapshot.key;
						this.playerId = 'p1';
						this.opponentId = 'p2';
						return true;
					}
					else if (childSnapshot.child('players/p2').exists() === false) {
						//We can join this match as p2
						this.matchId = childSnapshot.key;
						this.playerId = 'p2';
						this.opponentId = 'p1';
						return true;
					}
				});
				if (matchFound) {
					this.joinMatch(this.playerId, this.opponentId);
				}
				if (!matchFound) {
					//No open matches found, make new match
					this.matchId = database.ref().child('openMatches').push().key;
					this.playerId = 'p1';
					this.opponentId = 'p2';
					this.joinMatch(this.playerId, this.opponentId);		
					//No opponent yet, hide input buttons
					$('#p1InputWrapper').hide();
				}
			});
		});
	}

	joinMatch(playerId, opponentId) {
		this.initializePlayer(this.playerName, playerId, this.matchId);
		database.ref(`openMatches/${this.matchId}/chat/${this.opponentId}`).on('value', this.chatStatusUpdated.bind(this));
		database.ref(`openMatches/${this.matchId}/players/${this.opponentId}`).on('value', this.opponentStatusUpdated.bind(this));		
	}
	
	opponentStatusUpdated(snapshot) {
		console.log('Opponent data updated', snapshot.val());
		if (snapshot.val() === null && this.opponentInitialized) {
			//Opponent was initialized but has now disconnected
			$(`#${this.opponentId}Name`).text('Disconnected!');			
			this.displayChatMessage(`${this.opponentName} has disconnected!`);
			this.opponentInitialized = false;
			return;
		} else if (snapshot.val() === null) {
			//No opponent has connected yet
			return;
		}

		if (!this.opponentInitialized) {
			//Opponent has connected, update UI and variables
			//Hide finding match alert and display our input buttons
			$(`#${this.playerId}WaitingWrapper`).hide();
			$(`#${this.playerId}InputWrapper`).show();
			//Set opponent message to waiting for input
			$(`#${this.opponentId}WaitingMessageDisplay`).text('Opponent choosing...');

			this.opponentName = snapshot.val().name;
			$(`#${this.opponentId}Name`).text(this.opponentName);		
			$(`.${this.opponentId}PlayArea`).show();
			//Hide opponent input buttons
			$(`#${this.opponentId}InputWrapper`).hide();
			//Now listen for our input events
			$(`.${this.playerId}Input`).on('click', this.handleInput.bind(this));
			this.opponentInitialized = true;
		} else {
			//Opponent initialized, listening for opponent to make their choice
			if (snapshot.child('choice').exists()) {
				//Opponent has chosen
				this.opponentChoice = snapshot.val().choice;
				this.opponentMadeChoice = true;
				//Alert player that opponent is waiting for your choice
				$(`#${this.opponentId}WaitingMessageDisplay`).text('Opponent chose!');
				if (this.playerMadeChoice) {
					this.determineWinner();
				}
			}
		}

		this.updateOpponentDisplay(snapshot);
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
			this.playerWins++;
		} else {
			//Opponent wins
			$('#winnerMessage').text(`${this.opponentName} Wins!`);
			this.playerLosses++;
		}

		//Show opponent choice
		$(`#${this.opponentId}ChoiceDisplay`).text(this.opponentChoice);

		//Reset variables
		this.opponentMadeChoice = false;
		this.playerMadeChoice = false;

		//Update database
		let updates = {};
		updates[`/wins`] = this.playerWins;
		updates[`/losses`] = this.playerLosses;
		updates[`/choice`] = null; 

		database.ref(`openMatches/${this.matchId}/players/${this.playerId}`).update(updates);

		this.updatePlayerDisplay();

		//Reset UI to allow next round
		$(`#${this.playerId}InputWrapper`).show();	
		this.toggleInputButtons(false);		
		//Alert player that opponent is choosing again
		$(`#${this.opponentId}WaitingMessageDisplay`).text('Opponent choosing...');
	}

	chatStatusUpdated(snapshot) {
		if (snapshot.child('chatMessage').exists()) {
			this.displayChatMessage(snapshot.val().chatMessage);
		}
	}	

	sendChatMessage(message) {
		message = `${this.playerName}: ${message}`;

		database.ref(`openMatches/${this.matchId}/chat/${this.playerId}`).update({
			chatMessage: message
		});

		this.displayChatMessage(message);
	}

	displayChatMessage(message) {
		let newMessage = $('<p>', {
			'class': 'chatMessage',
			text: message
		});	

		$('#chatDisplay').append(newMessage);
		//Autoscroll to bottom of window overflow if needed
		$('#chatDisplay').scrollTop($('#chatDisplay')[0].scrollHeight);		
	}	

	disconnect() {
		if (this.inMatch) {
			//Remove our data from database
			let updates = {};
			updates[`/players/${this.playerId}`] = null;
			updates[`/chat/${this.playerId}`] = null;
			database.ref(`openMatches/${this.matchId}`).update(updates);
		}
	}
}

let rpsMultiplayer = new RockPaperScissorsGame();
