class RockPaperScissorsGame {
	constructor() {
		this.playerName;
		this.matchId;
		this.playerData;
		this.playerId;
		this.userData;
		this.playerMadeChoice = false;
		this.opponentId;
		this.opponentData;
		this.opponentMadeChoice = false;
		this.opponentInitialized = false;
		this.inMatch = false;
		this.signedIn = false;
		this.uid;

		this.databaseConfig = 
			{
				apiKey: "AIzaSyCjytawaV-Yv2Vw_Hp6iTKA9d_tcUnOPnY",
				authDomain: "rockpaperscissors-multip-1897b.firebaseapp.com",
				databaseURL: "https://rockpaperscissors-multip-1897b.firebaseio.com",
				projectId: "rockpaperscissors-multip-1897b",
				storageBucket: "",
				messagingSenderId: "307049576798"
			};

		// FirebaseUI config.
		this.uiConfig = 
			{
				signInOptions: [
					// Leave the lines as is for the providers you want to offer your users.
					firebase.auth.GoogleAuthProvider.PROVIDER_ID,
					firebase.auth.FacebookAuthProvider.PROVIDER_ID,
					firebase.auth.TwitterAuthProvider.PROVIDER_ID,
					firebase.auth.EmailAuthProvider.PROVIDER_ID
				],
				signInFlow: 'popup',
				// Terms of service url.
				tosUrl: '<your-tos-url>',
				callbacks: {
					signInSuccess: function() { return false; }
				}
			};

		firebase.initializeApp(this.databaseConfig);
		this.database = firebase.database();
		this.listenForFirebaseAuth();

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



		// Initialize the FirebaseUI Widget using Firebase.
		this.firebaseUi = new firebaseui.auth.AuthUI(firebase.auth());
		// The start method will wait until the DOM is loaded.
		this.firebaseUi.start('#firebaseui-auth-container', this.uiConfig);
	}

	listenForFirebaseAuth() {
		document.getElementById('sign-out-btn').addEventListener('click', this.logOutUser.bind(this));
		document.getElementById('sign-out-btn').style.display= 'none';
		let self = this;
        firebase.auth().onAuthStateChanged(function(user) {
			if (user) {
			  // User is signed in.
			  self.signedIn = true;
			  var displayName = user.displayName;
			  var email = user.email;
			  var emailVerified = user.emailVerified;
			  var photoURL = user.photoURL;
			  self.uid = user.uid;
			  var phoneNumber = user.phoneNumber;
			  var providerData = user.providerData;
			  user.getIdToken().then(function(accessToken) {
				document.getElementById('account-details').innerHTML = 
					`<img class="account-image img-responsive" src='${photoURL}'></img><span>${displayName}</span>`;
				document.getElementById('sign-out-btn').style.display = 'inline-block';
			  });

			  //Check if user already exists
			  self.database.ref(`users/${self.uid}`).once('value', function(snapshot) {
				var exists = (snapshot.val() !== null);
				if (exists) {
					console.log(snapshot.val());
					self.userData = snapshot.val();
				} else {
					self.userData = {
						name: displayName,
						wins: 0,
						losses: 0
					}
	  
					self.database.ref(`users/${self.uid}`).set(self.userData);
				}

				$('#nameInput').val(self.userData.name);
				document.getElementById('auth-display').style.display = 'none';
			  });
			} else {
			  // User is signed out.
				document.getElementById('account-details').textContent = '';
				document.getElementById('auth-display').style.display = 'flex';
				self.firebaseUi.reset();
				self.firebaseUi.start('#firebaseui-auth-container', this.uiConfig);
			}
		  }, function(error) {
			console.log(error);
		  });		
	}

	logOutUser() {
		console.log('Pre-logout:' + this.signedIn);
		firebase.auth().signOut().then(function () {
			console.log('Signed out');
			document.getElementById('sign-out-btn').style.display= 'none';
		}).catch(function(error) {

		});
	}

	updateOpponentDisplay(snapshot) {
		$(`#${this.opponentId}WinsDisplay`).text(snapshot.val().wins);
		$(`#${this.opponentId}LossesDisplay`).text(snapshot.val().losses);
	}

	updatePlayerDisplay() {
		$(`#${this.playerId}WinsDisplay`).text(this.playerData.wins);
		$(`#${this.playerId}LossesDisplay`).text(this.playerData.losses);
	}
	
	initializePlayer(name, playerId, matchId) {
		this.inMatch = true;

		if (this.signedIn) {
			this.playerData = this.userData;
			//Prefer the name entered by player over display name attached to sign in
			this.playerData.name = this.playerName;
		} else {
			this.playerData = {
				name: name,
				wins: 0,
				losses: 0	
			};
		}
		
		this.database.ref(`openMatches/${matchId}/players/${this.playerId}`).set(this.playerData);

		//Update UI
		$(`#${this.playerId}Name`).text(name);
		$(`.${this.playerId}Input`).on('click', this.handleInput.bind(this));		
		this.updatePlayerDisplay();
	}

	handleInput(event) {
		this.playerData['choice'] = $(event.target).attr('data-choice');
	
		this.database.ref(`openMatches/${this.matchId}/players/${this.playerId}`).update(this.playerData);

		//Clear win message from last round
		$('#winnerMessage').empty();
		
		this.playerMadeChoice = true;
		//Display our choice, disable input
		$(`.${this.playerId}ImageDisplay`).attr('src', `./assets/images/${this.playerData.choice}.png`);
		$(`.${this.playerId}ImageDisplay`).show();		

		this.toggleInputButtons(true, this.playerId);

		if (this.opponentMadeChoice) {
			//Opponent has made choice already, decide winner
			this.determineWinner();
		} else {
			//Hide last choice to prevent user confusion
			$(`.${this.opponentId}ImageDisplay`).hide();
		}
	}

	toggleInputButtons(disabled, targetPlayerId) {
		$(`.${targetPlayerId}Input`).each( (index, element) => {
			$(element).prop('disabled', disabled);
		});
	}

	checkForExistingMatch() {
		$('.playArea').show();
		//Hide initial images for player choices
		$('.p1ImageDisplay').hide();
		$('.p2ImageDisplay').hide();
		//Get open matches
		this.database.ref('openMatches').once('value').then((snapshot) => {
			this.database.ref().child('openMatches').once('value').then((snapshot) => {

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
					$(`#${this.playerId}WaitingWrapper`).hide();
				}
				if (!matchFound) {
					//No open matches found, make new match
					this.matchId = this.database.ref().child('openMatches').push().key;
					this.playerId = 'p1';
					this.opponentId = 'p2';
					this.joinMatch(this.playerId, this.opponentId);		
					//No opponent yet, show and disable the inputs
					$('#p1WaitingWrapper').hide();
					this.toggleInputButtons(true, this.playerId);
					$('#p2InputWrapper').hide();
				}
				
			});
		});
	}

	joinMatch(playerId, opponentId) {
		this.initializePlayer(this.playerName, playerId, this.matchId);
		if (!this.signedIn) {
			document.getElementById('auth-display').style.display = 'none';
		}
		this.database.ref(`openMatches/${this.matchId}/chat/${this.opponentId}`).on('child_added', this.chatStatusUpdated.bind(this));
		this.database.ref(`openMatches/${this.matchId}/players/${this.opponentId}`).on('value', this.opponentStatusUpdated.bind(this));	
	}
	
	opponentStatusUpdated(snapshot) {
		if (snapshot.val() === null && this.opponentInitialized) {
			//Opponent was initialized but has now disconnected
			$(`#${this.opponentId}Name`).text('Disconnected!');			
			this.displayChatAlert(`${this.opponentData.name} has disconnected!`, 'danger');
			//Reset player and opponent choices
			this.opponentMadeChoice = false;
			this.playerMadeChoice = false;
			//Remove displayed image for player choice if it is displayed
			$(`.${this.playerId}ImageDisplay`).hide();

			this.toggleInputButtons(true, this.playerId);

			//Display matchmaking spinner
			$(`#${this.opponentId}WaitingWrapper`).show();
			$(`#${this.opponentId}InputWrapper`).hide();
			
			this.opponentInitialized = false;
			return;
		} else if (snapshot.val() === null) {
			//No opponent has connected yet
			return;
		}

		if (!this.opponentInitialized) {
			//Update local opponent data
			this.opponentData = snapshot.val();
			//Opponent has connected, update UI and variables
			$(`#${this.opponentId}WaitingWrapper`).hide();
			$(`#${this.opponentId}InputWrapper`).show();
			this.toggleInputButtons(true, this.opponentId);
			this.toggleInputButtons(false, this.playerId);

			$(`#${this.opponentId}Name`).text(this.opponentData.name);		
		
			this.displayChatAlert(`${this.opponentData.name} has connected!`, 'success');

			this.opponentInitialized = true;
		} else {
			//Opponent initialized, listening for opponent to make their choice
			//Update local opponent data
			this.opponentData = snapshot.val();
			if (snapshot.child('choice').exists()) {
				//Opponent has chosen
				this.opponentMadeChoice = true;
				if (this.playerMadeChoice) {
					this.determineWinner();
				}
			}
		}

		this.updateOpponentDisplay(snapshot);
	}

	determineWinner() {
		if (this.playerData.choice === this.opponentData.choice) {
			//Draw
			$('#winnerMessage').text('Draw!');
		}
		else if ((this.playerData.choice === 'rock' && this.opponentData.choice === 'scissors') ||
			(this.playerData.choice === 'paper' && this.opponentData.choice === 'rock') ||
			(this.playerData.choice === 'scissors' && this.opponentData.choice === 'paper')
		) {
			//Player wins
			$('#winnerMessage').text(`${this.playerData.name} Wins!`);
			this.playerData.wins++;
		} else {
			//Opponent wins
			$('#winnerMessage').text(`${this.opponentData.name} Wins!`);
			this.playerData.losses++;
		}

		//Flash text
		$('#winnerMessage').addClass('flashText');
		setTimeout(()=> {$('#winnerMessage').removeClass('flashText')},500);

		//Show opponent choice
		$(`.${this.opponentId}ImageDisplay`).attr('src', `./assets/images/${this.opponentData.choice}.png`);
		$(`.${this.opponentId}ImageDisplay`).show();

		//Reset variables
		this.opponentMadeChoice = false;
		this.playerMadeChoice = false;
		this.playerData.choice = null;


		this.database.ref(`openMatches/${this.matchId}/players/${this.playerId}`).update(this.playerData);

		this.updatePlayerDisplay();

		//Reset UI to allow next round
		this.toggleInputButtons(false, this.playerId);		
	}

	chatStatusUpdated(snapshot) {
		this.displayChatMessage(snapshot.val());

		//Removing ref so child_added event fires on next sent message
		snapshot.ref.remove();
	}	

	sendChatMessage(message) {
		message = `${this.playerData.name}: ${message}`;

		this.database.ref(`openMatches/${this.matchId}/chat/${this.playerId}`).set({
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

	displayChatAlert(message, alertStyle) {
		let newAlert = $('<div>', {
			'class': `alert alert-${alertStyle} text-center mb-1`,
			text: message
		});

		$('#chatDisplay').append(newAlert);
		$('#chatDisplay').scrollTop($('#chatDisplay')[0].scrollHeight);		
	}

	disconnect() {
		if (this.inMatch) {
			//Remove our data from database
			let updates = {};
			updates[`/players/${this.playerId}`] = null;
			updates[`/chat/${this.playerId}`] = null;

			if (this.signedIn) {
				//Update player database with new win/loss record
				this.database.ref(`users/${this.uid}`).set(this.playerData);	
			}

			this.database.ref(`openMatches/${this.matchId}`).update(updates);
		}
	}
}

let rpsMultiplayer = new RockPaperScissorsGame();
