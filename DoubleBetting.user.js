// ==UserScript==
// @name         DoubleBetting
// @namespace    DoubleBetting
// @version      0.2
// @description  A gambling script for www.csgodouble.com
// @author       Michael
// @include      http://www.csgodouble.com/
// @include      http://www.csgodouble.com/index.php
// @downloadURL  https://raw.githubusercontent.com/mandreasen/DoubleBetting/master/DoubleBetting.user.js
// @updateURL    https://raw.githubusercontent.com/mandreasen/DoubleBetting/master/DoubleBetting.user.js
// @grant        none
// ==/UserScript==

// ------------------------------------------ Settings for you as a user. ------------------------------------------
// WARNING: Other 3rd party plugins, can conflict with this script.
// WARNING: All settings will be sat to default, if the script is updated to a new version.
// NOTE: The script don't place a bet on first round.
// NOTE: Everytime you reload the website or open it as new, the settings down below will be used.
var settings = {
	// Bet amount
	// Minimum bet amount is 1 and default is 1.
	"amount": 1,

	// Bet on red, black or green. Default: red
	// There is 47% chance for a win when bettion on red or black and there is 6% chance when betting on green.
	"color": "red",

	// Double bet on lose. on or off.
	// Recommended to turn off, if you are betting on green. Default: on
	"martingale": "on",

	// On/off switch.
	// Default is off. On means that the plugin automatic start betting and if off you need to turn it manually on.
	// If off you need the menu to be on so you can turn the betting on from the page.
	"power": "off",

	// Show DoubleBetting setting menu on CSGODouble.
	// On or off, Default is on.
	"menu": "on",
};
// ------------------------------------------------- Settings end. -------------------------------------------------

var doublebetting = {
	// Console log, warn and error text prefix.
	"consolePrefix": "[DoubleBetting] ",

	// Data from this session of gambling.
	"session": {
		"bets": {},
		"profit": 0,
		"balance": 0,
		"amount": settings.amount,
		"creditCount": 0,
	},

	// Update the session profit.
	updateProfit: function(rollid, rolled, won) {
		if (csgodouble.betPlaced(rollid)) {
			// Preset of lost amount.
			var lost = 0;

			$.each(doublebetting.session.bets[rollid], function(betID, betData) {
				lost += betData.amount;
			});

			// Update the session profit.
			doublebetting.session.profit += (won - lost);

			return true;
		} else {
			console.error(doublebetting.consolePrefix + "There cannot be checked for profit, when there wasn't placed any bets.");
		}

		return false;
	},

	// Cheak that a number is a number and a integer.
	isInt: function(integer) {
		return Number(integer) === integer && integer % 1 === 0;
	},

	// Check for null in balance.
	setBalance: function(balance) {
		if (balance !== null) {
			doublebetting.session.balance = balance;
		}
	},

	insertHTML: function() {
		// HTML Code.
		var html = '<p><span style="font-size:18px;font-weight:bold">DoubleBetting</span></p><div class="row" id="doubleBetting"> <div class="col-md-4"> <p><b>Bet amount (Currently: <span id="currentlyAmount">' + settings.amount + '</span>)</b> </p><div class="form-inline"> <div class="form-group"> <input type="number" class="form-control" id="defaultAmount" min="1" max="' + MAX_BET + '" style="min-width: 180px;" placeholder="Amount in coin format"> </div><button type="button" style="outline: none;" class="btn btn-default" id="updateDefaultAmount">Update</button> </div></div><div class="col-md-4"> <p><b>Settings</b> </p><div class="form-group"> <div class="btn-group"> <button type="button" style="outline: none;" class="btn btn-default" id="martingale" title="Will try to get your lost coins back, by betting more.">Martingale</button> <button type="button" style="outline: none;" class="btn btn-default" id="power" title="Turn automatic betting on/off">Power</button> </div></div></div><div class="col-md-4"> <p><b>Bet color</b> </p><div class="form-group"> <div class="btn-group"> <button type="button" style="outline: none;" class="btn btn-default" id="red">Red</button> <button type="button" style="outline: none;" class="btn btn-default" id="black">Black</button> <button type="button" style="outline: none;" class="btn btn-default" id="green">Green</button> </div></div></div></div>';
	
		// Insert HTML to the page.
		$("#mainpage .well:nth-last-child(2)").append(html);

		// Update the buttons.
		this.updateSettingButton("#doubleBetting #martingale", settings.martingale);
		this.updateSettingButton("#doubleBetting #power", settings.power);
		this.updateColorButton(settings.color);
	},

	updateSettingButton: function(id, onOff) {
		if (onOff == "on") {
			$(id).addClass("active");
		} else {
			$(id).removeClass("active");
		}
	},

	updateColorButton: function(color) {
		// Remove active from all.
		$("#doubleBetting #red").removeClass("active");
		$("#doubleBetting #black").removeClass("active");
		$("#doubleBetting #green").removeClass("active");

		// Set active on the active button
		$("#doubleBetting #" + color).addClass("active");
	},
};

var csgodouble = {
	// Bet colors on CSGODouble with lower and upper numbers.
	"colorOptions": {
		"red": {"lower": 1, "upper": 7},
		"black": {"lower": 8, "upper": 14},
		"green": {"lower": 0, "upper": 0},
	},

	eventListener: function(message) {
		var data = JSON.parse(message.data);

		if (data.type == "betconfirm") {
			csgodouble.confirmed(data.bet, data.balance);
		} else if (data.type == "roll") {
			csgodouble.rolled(data);
		} else if (data.type == "balance") {
			// Update the session balance.
			doublebetting.setBalance(data.balance);
		} else if (data.type == "alert") {
			// Check if the balance is included in the alert.
			if (!isNaN(data.balance)) {
				// Update the session balance.
				doublebetting.setBalance(data.balance);
			}
		}

		// Return the message to the normal event listener in CSGODouble javascript.
		onMessage(message);
	},

	// Run when a placed bet is confirmed by CSGODouble.
	confirmed: function(bet, balance) {
		// Confirm that betconfirm message was to you. USER is from CSGODouble javascript.
		if (bet.user == USER) {
			// Update the session balance.
			doublebetting.setBalance(balance);

			// Add the rollid to the bets if not exists.
			if (!(bet.rollid in doublebetting.session.bets)) {
				doublebetting.session.bets[bet.rollid] = {};
			}

			// Add the data from this bet to the betid.
			doublebetting.session.bets[bet.rollid][bet.betid] = {
				"lower": bet.lower,
				"upper": bet.upper,
				"amount": bet.amount,
				"won": null,
			};
		}
	},

	// Run after a bet is rolled.
	rolled: function(data) {
		// Update the session balance.
		doublebetting.setBalance(data.balance);

		// Check if there was placed a bet.
		if (this.betPlaced(data.rollid)) {
			// Update the session profit.
			doublebetting.updateProfit(data.rollid, data.roll, data.won);

			// Has the script placed a bet there was won.
			if (this.hasWon(data.rollid, data.roll, settings.color)) {
				// Set the default bet amount.
				doublebetting.session.amount = settings.amount;
			} else {
				if (settings.martingale == "on") {
					doublebetting.session.amount = (doublebetting.session.amount * 2);
				} else {
					doublebetting.session.amount = settings.amount;
				}
			}
		}

		// Check for power on or off.
		if (settings.power == "on") {
			// Place a bet when the new round starts.
			setTimeout(function() {
				// Place the bet.
				csgodouble.placeBet(doublebetting.session.amount, settings.color);
			}, ((data.wait + 1) * 1000));
		} else {
			// If off set amount so the script always start on default amount.
			doublebetting.session.amount = settings.amount;
		}
	},

	placeBet: function(amount, color) {
		if (color in this.colorOptions) {
			if (doublebetting.isInt(amount)) {
				// Check that the bet amount not is bigger than max allowed bet and downgrade the bet if bigger then allowed. MAX_BET is from CSGODouble javascript.
				if (amount > MAX_BET) {
					amount = MAX_BET;
					console.warn(doublebetting.consolePrefix + "You was trying bet more then allowed, so the bet was downgraded to max bet amount allowed.");
				}

				// Checking that there is enough coins.
				if (amount > doublebetting.session.balance) {
					amount = doublebetting.session.balance;
					console.warn(doublebetting.consolePrefix + "You was trying bet more then you have, so the bet was downgraded to your balance.");
				}

				if (amount > 0) {
					// Send and ROUND is from CSGODouble javascript.
					send({
						"type": "bet",
						"amount": amount,
						"lower": this.colorOptions[color].lower,
						"upper": this.colorOptions[color].upper,
						"round": ROUND,
					});
				} else {
					if (doublebetting.session.balance <= 0) {
						// Turn the betting script off.
						settings.power = "off";

						// Update power button.
						doublebetting.updateSettingButton("#doubleBetting #power", "off");

						console.warn(doublebetting.consolePrefix + "You can't bet 0 coins and your balance is 0, so power is turned off.");
					} else {
						console.warn(doublebetting.consolePrefix + "You can't bet 0 coins.");
					}
				}
			} else {
				console.error(doublebetting.consolePrefix + "You are trying to bet an unknown amount of coins!");
			}
		} else {
			console.error(doublebetting.consolePrefix + "The color (" + color + ") is not an option.");
		}
	},

	// Is there placed a bet.
	betPlaced: function(rollid) {
		return (rollid in doublebetting.session.bets) ? true : false;
	},

	// Has the script placed a bet there was won.
	hasWon: function(rollid, rolled, color) {
		if (this.betPlaced(rollid)) {
			var result = false;

			$.each(doublebetting.session.bets[rollid], function(betID, betData) {
				if (betData.lower <= rolled && betData.upper >= rolled) {
					// Update bet won status.
					doublebetting.session.bets[rollid][betID].won = true;

					// Has the script placed a bet there was won.
					if (csgodouble.colorOptions[color].lower == betData.lower && csgodouble.colorOptions[color].upper == betData.upper) {
						result = true;
					}
				} else {
					// Update bet won status.
					doublebetting.session.bets[rollid][betID].won = false;
				}
			});

			return result;
		} else {
			console.error(doublebetting.consolePrefix + "There cannot be checked for a win, when there wasn't placed any bets.");
		}

		return false;
	},
}

// Check settings before start.
var onOff = ["on", "off"];

if (doublebetting.isInt(settings.amount) && settings.amount >= 1 && settings.color in csgodouble.colorOptions && onOff.indexOf(settings.martingale) != -1 && onOff.indexOf(settings.power) != -1 && onOff.indexOf(settings.menu) != -1) {
	// Overwrite CSGODouble WS.onmessage.
	$(document).ready(function() {
		// Will insert the script menu if on.
		if (settings.menu == "on") {
			doublebetting.insertHTML();
		}

		var isWSReady = setInterval(function(){
			if (WS !== null) {
				// Redirect there socket om message to me, so i can read it and then send it back to CSGODouble javascript.
				WS.onmessage = csgodouble.eventListener;

				// Ask for the balance, to remove balance null value. Send is from CSGODouble javascript.
				send({"type": "balance"});

				// Stop the interval.
				clearInterval(isWSReady);
			}
		}, 1000);
	});
} else {
	console.error(doublebetting.consolePrefix + "There is an error in your settings. The script is stopped.");
}

// Menu button actions.
$("#doubleBetting #red").on("click", function() {
	settings.color = "red";
	doublebetting.updateColorButton(settings.color);
});

$("#doubleBetting #black").on("click", function() {
	settings.color = "black";
	doublebetting.updateColorButton(settings.color);
});

$("#doubleBetting #green").on("click", function() {
	settings.color = "green";
	doublebetting.updateColorButton(settings.color);
});

$("#doubleBetting #power").on("click", function() {
	if (settings.power == "on") {
		settings.power = "off";
	} else {
		settings.power = "on";
	}

	// Ask for the balance to update. Send is from CSGODouble javascript.
	send({"type": "balance"});

	doublebetting.updateSettingButton("#doubleBetting #power", settings.power);
});

$("#doubleBetting #martingale").on("click", function() {
	if (settings.martingale == "on") {
		settings.martingale = "off";
	} else {
		settings.martingale = "on";
	}
	
	doublebetting.updateSettingButton("#doubleBetting #power", settings.martingale);
});

$("#doubleBetting #updateDefaultAmount").on("click", function() {
	var amount = $("#doubleBetting #defaultAmount").val();

	if (amount.length > 0) {
			if (amount.match(/^[0-9]{1,}$/)) {
				amount = parseInt(amount);

				// MAX_BET is from CSGODouble javascript.
				if (amount <= MAX_BET) {
					settings.amount = amount;
					$("#doubleBetting #currentlyAmount").text(amount);
					$("#doubleBetting #defaultAmount").val("");
				} else {
					console.warn(doublebetting.consolePrefix + "You are trying to bet more then the max allowede amount.");
				}
			} else {
				console.warn(doublebetting.consolePrefix + "You are trying to bet an unknown amount.");
			}
	} else {
		console.warn(doublebetting.consolePrefix + "You can't update the script bet value without inserting amount in the text box.");
	}
});