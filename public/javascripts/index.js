$(function(){
	// [delete, change, flip, swap]
	var powerUps = [3,3,3,3];
	
	var socket = io.connect();
	
	var targetCell = $("#board1 #square_0_0").addClass("focus");
	var attackCell = $("#board2 #square_0_0").addClass("focus");
	var playerSquares = $("#board1 .square");
	var opponentSquares = $("#board2 .square");
	
	// For selecting input cells
	playerSquares.bind("click", function(){
		targetCell = $(this);
		playerSquares.removeClass("focus");
		$(this).addClass("focus");
		});
	
	// For selecting attack cells
	opponentSquares.bind("click", function(){
		attackCell = $(this);
		opponentSquares.removeClass("focus");
		$(this).addClass("focus");
		});
		
	var numbers = $(".number");
	
	// For inputting numbers into cells
	numbers.bind("click", function(){
		targetCell.text('');
		targetCell.append($(this).text());
		targetCell.css("color", "black");

		socket.emit("numberEntered", {targetID:targetCell[0].id, value:parseInt($(this).text())});
	});
	
	// For delete powerup click
	$("#delete").bind("click", function(){
		if(powerUps[0] > 0)
		{
			socket.emit("delete", attackCell[0].id);
			powerUps[0]--;
			$("#deleteCount").text(powerUps[0]);
		}
	});
	
	// For change powerup click
	$("#change").bind("click", function(){
		if(powerUps[1] > 0)
		{
			socket.emit("change", attackCell[0].id);
			powerUps[1]--;
			$("#changeCount").text(powerUps[1]);

		}
	});
	
	// For swap powerup click
	$("#swap").bind("click", function(){
		if(powerUps[2]>0){
			socket.emit("swap");
			powerUps[2]--;
			$("#swapCount").text(powerUps[2]);
		
		}
	
	});
	
	// For hint powerup click
	$("#hint").bind("click", function(){
		if(powerUps[3]>0){
		
			var emptyCells = new Array();
			var cell;
		
			for(var x = 0; x < 9; x++){
				for(var y = 0; y < 9; y++){
					if(($('#square_' + x + "_" + y).text()) === ''){
						cell = {X: x,
								Y: y};
						emptyCells.push(cell);
					}
				}
			}
			var randomEmptyCell = Math.floor(Math.random()*emptyCells.length);
		
			socket.emit("getHint", emptyCells[randomEmptyCell]);
		
			powerUps[3]--;
			$("#hintCount").text(powerUps[3]);
		}
	});
	
	// For swapping opponents values
	socket.on("swapOpponent", function(){
		var currentBoard = new Array();
		for(var x = 0; x < 9; x++){
			for(var y = 0; y < 9; y++){
				if(($('#square_' + x + "_" + y).text()) !== ''){
					cell = {X: x,
							Y: y,
							value: $('#square_' + x + "_" + y).text()};
					currentBoard.push(cell);
				}
			}
		}
		
		var firstcell = currentBoard[Math.floor(Math.random()*currentBoard.length)];
		var secondcell = currentBoard[Math.floor(Math.random()*currentBoard.length)];
		
		while(firstcell == secondcell){
			secondcell = Math.floor(Math.random()*currentBoard.length);
		}
		$('#board1 #square_' + firstcell.X + "_" + firstcell.Y).text(secondcell.value);
		$('#board1 #square_' + secondcell.X + "_" + secondcell.Y).text(firstcell.value);
		
		socket.emit("swapDone", {First: firstcell, Sec: secondcell});
	});

	// Put hint into board
	socket.on("hereHint", function(data){
		$('#board1 #square_' + data.X + "_" + data.Y).text(data.value);
		$('#board1 #square_' + data.X + "_" + data.Y).css("color", "green");
	});
	
	
	
	
	// For delete powerup affecting the opponent's board
	socket.on("deleteOpponent", function(data){
		$("#board1 #" + data).text("");
	});
	
	// For delete powerup affecting your view of the opponent's board
	socket.on("deletePlayer", function(data){
		$("#board2 #" + data).text("");
	});
	
	socket.on("backspace", function(data){
		$("#board2 #" + data).text("");
	});
	
	// For change powerup affecting the opponent's board
	socket.on("changeOpponent", function(data){
	
		var cellval = $("#board1 #" + data.targetID).text();
		var newValue = data.value;
		while(cellval == newValue){
			newValue = Math.floor((Math.random()*9)+1);
		}
		console.log(newValue);
		$("#board1 #" + data.targetID).text(newValue);
	});
	
	// For updating your screen of the opponent's board
	socket.on('opponentProgress', function(data){
		if(data.flag)
		{
			$("#board2 #" + data.targetID).text("V");
			$("#board2 #" + data.targetID).css("color", "green");
		}
		else
		{
			$("#board2 #" + data.targetID).text("X");
			$("#board2 #" + data.targetID).css("color", "red");

		}
	});	
	
	// For initial loading of the board
	socket.on('loadBoard', function(data){
		for(var x=0; x<9; x++)
		{
			for(var y=0; y<9; y++)
			{
				if(data.rows[x][y] === 0)
				{
					$("#board1 #square_" + x + "_" + y).text("");
				}
				else
				{
					$("#board1 #square_" + x + "_" + y).text(data.rows[x][y]);
					$("#board2 #square_" + x + "_" + y).text("V");
					$("#board1 #square_" + x + "_" + y).css("color", "green");
					$("#board2 #square_" + x + "_" + y).css("color", "green");
					
				}

			}
		}
	});	
	
	socket.on('receiveMessage', function(data){
			$("#chatbox").append("Opponent: " + data + "\n");
		});
	
	$('#board1').focus();
	
	// For UP, DOWN, LEFT, RIGHT, BACKSPACE, 1-9
	$(document).keydown(function(e){
		var id = targetCell[0].id;
		var matches = id.match(/square_(\d)_(\d)/);
		var x = parseInt(matches[1]);
		var y = parseInt(matches[2]);

		// If player board is in focus
		if(document.activeElement == $("#board1")[0]){

		if (e.keyCode == 37 && y>0) {y-=1;e.preventDefault();}
		else if (e.keyCode == 38 && x>0){ x-=1;e.preventDefault();}
		else if (e.keyCode == 39 && y<8){ y+=1;e.preventDefault();}
		else if (e.keyCode == 40 && x<8){ x+=1;e.preventDefault();}
		else if (e.keyCode == 8){
			targetCell.text("");		
			targetCell.css("color", "black");
			socket.emit("backspace", targetCell[0].id);
			e.preventDefault();}
		else if(e.keyCode == 49){
			targetCell.text("1");		
			targetCell.css("color", "black");
			socket.emit("numberEntered", {targetID:targetCell[0].id, value:1});}
		else if(e.keyCode == 50){
			targetCell.text("2");		
			targetCell.css("color", "black");
			socket.emit("numberEntered", {targetID:targetCell[0].id, value:2});}
		else if(e.keyCode == 51){
			targetCell.text("3");		
			targetCell.css("color", "black");
			socket.emit("numberEntered", {targetID:targetCell[0].id, value:3});}
		else if(e.keyCode == 52){
			targetCell.text("4");		
			targetCell.css("color", "black");
			socket.emit("numberEntered", {targetID:targetCell[0].id, value:4});}
		else if(e.keyCode == 53){
			targetCell.text("5");		
			targetCell.css("color", "black");
			socket.emit("numberEntered", {targetID:targetCell[0].id, value:5});}
		else if(e.keyCode == 54){
			targetCell.text("6");		
			targetCell.css("color", "black");
			socket.emit("numberEntered", {targetID:targetCell[0].id, value:6});}
		else if(e.keyCode == 55){
			targetCell.text("7");		
			targetCell.css("color", "black");
			socket.emit("numberEntered", {targetID:targetCell[0].id, value:7});}
		else if(e.keyCode == 56){
			targetCell.text("8");		
			targetCell.css("color", "black");
			socket.emit("numberEntered", {targetID:targetCell[0].id, value:8});}
		else if(e.keyCode == 57){
			targetCell.text("9");		
			targetCell.css("color", "black");
			socket.emit("numberEntered", {targetID:targetCell[0].id, value:9});}
		}
		// If chat is in focus
		else if(document.activeElement == $("#chat")[0]){
			if(e.keyCode == 13)
			{
				var text = $("#chat").val();
				console.log(text);
				if(text != "")
				{
					$("#chatbox").append("Player: " + text + "\n");
					socket.emit("sendMessage", text);
					$("#chat").val("");
				}
			else if (e.keyCode == 37){ e.preventDefault();}
			else if (e.keyCode == 38){ e.preventDefault();}
			else if (e.keyCode == 39){ e.preventDefault();}
			else if (e.keyCode == 40){ e.preventDefault();}
			}
		}
	
		playerSquares.removeClass("focus");
		targetCell = $("#board1 #square_" + x + "_" + y).addClass("focus");
})


// For submitting answers to server
	$("#submit").bind("click", function(){
	var answers = new Array();
	for(var x=0; x<9; x++)
		for(var y=0; y<9; y++)
		answers.push($('#square_' + x + "_" + y).text());
		socket.emit("checkAnswers", answers);
	});
	
///////time functionalities/////
	var time = new Date().getTime()/1000;
	var opponentTime;
	var timeremaining;
	var penalities=0;
	
	var currentminutes = 0;
	var currentseconds = 0;
	var gametimer = setInterval(function(){
		currentseconds++;
		
		if(currentseconds >= 60){
			currentminutes++;
			currentseconds = 0;
		}
		timerID = $('#timer');
		if(currentseconds < 10 && currentminutes < 10){
			timerID.text("0" + currentminutes + ":" + "0" + currentseconds);
		}
		else if(currentseconds < 10 && currentminutes >= 10){
			timerID.text(currentminutes + ":" + "0" + currentseconds);
		}
		else if(currentseconds >= 10 && currentminutes < 10){
			timerID.text("0" + currentminutes + ":" + currentseconds);
		}
		else{
			timerID.text(currentminutes + ":" + currentseconds);
		}	
	}, 1000);
	
	
	
	socket.emit('setTime', time);
	socket.on('sendOppoTime', function(data){
		socket.emit('sendTime', time);
		opponentTime = data;
		console.log("OPPONENT TIME IS: " + opponentTime);
		}
	);
	socket.on('receiveOpTime', function(t){
		opponentTime = t;
		console.log("OPPONENT TIME IS (RECOPTIME): " + opponentTime);
	});

	//FINISH GAME CHECKS
	socket.on('boardiswrong', function(){
		penalities++;
		console.log(penalities);
		alert("your board is incorrect");
	});
	
	
	socket.on('needTime', function(){
		var finishedtime = new Date().getTime()/1000;
		finishedtime = finishedtime + penalities*30;
		socket.emit('hereTime', finishedtime);
		}
	);
	socket.on('opponentFinishedTime', function(ot){
		opponentTime = ot - opponentTime;
		var current = new Date().getTime()/1000;
		var yourTime = current- time;
		timeremaining = opponentTime- yourTime;
		if(timeremaining <= 0){	//you lose
			socket.emit('result', false);
			console.log("YOUR LOSE: " + yourTime + "  VS  " + opponentTime);
			}
		else{	//you still have time left
			socket.emit('result', true);
			console.log("NEW OPPONENTTIME IS: " + opponentTime);
			console.log("you have: " + Math.ceil(timeremaining) + "  remaining");
			
			
			var tracker = setInterval(function(){
					timeremaining = timeremaining - 1;
					if(timeremaining <= 0){
						socket.emit('result', false);
						console.log("YOUR LOSE: " + Math.ceil(yourTime) + "  VS  " + Math.ceil(opponentTime));
						
						socket.emit("stopallTimers", tracker)
					}
			}, 1000);
		}
	});
	
	socket.on('stoptime', function(data){
		clearInterval(data);
		clearInterval(gametimer);
	
	});
	socket.on('oppoTimeLeft', function(){
		alert("You still have " + Math.ceil(timeremaining) + " seconds left");
	});
	socket.on('gameDONE', function(){
		alert("Congratulations, you win!");
		clearInterval(gametimer);
			socket.disconnect();
	});
	socket.on('gameOver', function(){	//test
		alert("Better luck next time, you lose!");
			socket.disconnect();
	});
	
	socket.on("playerleft", function(){
		alert("your opponent has left, YOU WIN");
	});
});