var express = require('express'),
    http    = require('http'),
    routes = require('./routes');

var app = module.exports = express();

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'your secret here' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes
app.get('/',routes.index);

var server = http.createServer(app);

// WebSockets/Socket.IO
var io  = require('socket.io').listen(server);

var solution;	//hold the solution of the sudoku generated
var board;		//hold the board with missing cells

io.sockets.on('connection', function (socket) {

	//generate sudoku full board, filter out some cells
	if(solution === undefined && board === undefined){
		solution = CU.Sudoku.generate();
		board = new CU.sudoku.Grid();
		var arr = solution.toArray();
		board.fromArray(arr);
		CU.Sudoku.cull(board, 60);	//empty out some cells
	}
	
	//send to clients the board
	socket.broadcast.emit("loadBoard", board);
	socket.emit("loadBoard", board);
	
	//when a client enters in a number in a cell, update the "opponents" board view of the opponent screen
	socket.on('numberEntered', function(data){
		
	var matches = data.targetID.match(/square_(\d)_(\d)/);
	var x = matches[1];
	var y = matches[2];
	
	if(solution.getValue(y,x) == data.value)
		socket.broadcast.emit('opponentProgress', {flag:true, targetID: data.targetID});
	else
		socket.broadcast.emit('opponentProgress', {flag:false, targetID: data.targetID});
  });
  
  //check that the client's submitted board is correct
  socket.on('checkAnswers', function(data){
  //if correct
  if(data.toString() == solution.toArray().toString()){
	//check that the client that finished first had used less time than the opponent. Otherwise, tell the opponent the amount of time he has left
	socket.emit('needTime');	//set the final time of the client that submitted
	socket.on('hereTime', function(t){	//give the opponent client the amount of time the 1st client took to finish the board
		socket.broadcast.emit('opponentFinishedTime', t);
	});
  }
	else{//if board is wrong, then penality will be 30 seconds added to the client time
		socket.emit('boardiswrong');
	}
  });
  
  /////time functionalities////////
  
	socket.on('setTime', function(data){ 
		socket.broadcast.emit('sendOppoTime', data);
		});
	
	socket.on('sendTime', function(time){
			socket.broadcast.emit('receiveOpTime', time);
			}
		);	
	
	socket.on('result', function(r){
		if(r === true){
		socket.emit('oppoTimeLeft');
		socket.broadcast.emit('stoptime');
		console.log("game is not finished");
		}
		else{
		console.log("GAME IS FINISHED, WE HAVE A WINNER");
		socket.emit('gameOver');
		socket.broadcast.emit('gameDONE');
		}
	});	
  
  socket.on("stopallTimers", function(data){
	socket.broadcast.emit('stoptime', data);
	socket.emit('stoptime', data);
});
  
  socket.on("delete", function(data){
	socket.broadcast.emit("deleteOpponent", data);
	socket.emit("deletePlayer", data);
  });
  
  socket.on("backspace", function(data){
  
	socket.broadcast.emit("backspace", data);
  });
  
  socket.on("change", function(data){
	var newValue = Math.floor((Math.random()*9)+1);
	var correct;
	
	var matches = data.match(/square_(\d)_(\d)/);
	var x = matches[1];
	var y = matches[2];
	
	
	correct = solution.getValue(y,x) == newValue;
	
	socket.broadcast.emit('changeOpponent', {value:newValue, targetID: data});
	socket.emit("opponentProgress", {flag:correct, targetID: data});
  });
  
  socket.on("swap", function(){
	socket.broadcast.emit("swapOpponent");
  });
  socket.on("swapDone", function(data){
	var ID = "square_" + data.First.X + "_" + data.First.Y;
	var ID2 = "square_" + data.Sec.X + "_" + data.Sec.Y;
  
	socket.broadcast.emit("opponentProgress", {flag:false, targetID: ID});
	socket.broadcast.emit("opponentProgress", {flag:false, targetID: ID2});
	
  });
 
  socket.on("getHint", function(data){
	var randomCellSolution = {X: data.X,
							Y: data.Y,
							value: solution.rows[data.X][data.Y]};
	socket.emit("hereHint", randomCellSolution);
	
	var ID = "square_" + data.X + "_" + data.Y;
	
	socket.broadcast.emit("opponentProgress", {flag:true, targetID: ID});
  
  });
  
  socket.on("sendMessage", function(data){
	socket.broadcast.emit('receiveMessage', data);
  });
  
  socket.on('disconnect', function () {
	socket.broadcast.emit("playerleft");
  
  });
  
  
});

server.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode",
              server.address().port, app.settings.env);
});

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

if(!CU)
	var CU = { };

	CU.Sudoku = {
	/**
	 * Generate a CU.sudoku.Grid
	 * @return CU.sudoku.Grid a new random sudoku puzzle
	 */
	
	generate: function() {
		var grid = new CU.sudoku.Grid();
	
		//We need to keep track of all numbers tried in every cell
		var cellNumbers = [];
		for(var i = 0; i < 81; i++)
		{
			cellNumbers[i] = [1,2,3,4,5,6,7,8,9];
		}

		for(var i = 0; i < 81; i++)
		{	
			var found = false;
			var row = Math.floor(i / 9);
			var col = i - (row * 9);
			
			while(cellNumbers[i].length > 0)
			{
				//Pick a random number to try
				var rnd = Math.floor(Math.random() * cellNumbers[i].length);
				var num = cellNumbers[i].splice(rnd, 1)[0];
				
				grid.setValue(col, row, num);
				
				if(!grid.cellConflicts(col, row)) 
				{
					found = true;						
					break;
				}
				else
				{
					grid.setValue(col, row, 0);
					found = false;
					continue;
				}
			}
			
			//If a possible number was not found, backtrack			
			if(!found)
			{
				//After backtracking we can try all numbers here again
				cellNumbers[i] = [1,2,3,4,5,6,7,8,9];
				
				//Reduce by two, since the loop increments by one
				i -= 2;
			}
		}
			
		return grid;
	},
	
	/**
	 * Clear N cells from the sudoku grid randomly
	 * @param {CU.sudoku.Grid} grid
	 * @param {Number} amount
	 */
	cull: function(grid, amount) {
		var cells = [];
		for(var i = 0; i < 81; i++)
			cells.push(i);
			
		for(var i = 0; i < amount; i++)
		{
			var rnd = Math.floor(Math.random() * cells.length);
			var value = cells.splice(rnd, 1);
			var row = Math.floor(value / 9);
			var col = value - (row * 9);
			
			grid.setValue(col, row, 0);	
		}
	}
};

CU.sudoku = { };

/**
 * A class for representing sudoku puzzle grids
 * @constructor
 */
CU.sudoku.Grid = function() {
	this.rows = [];
	for(var row = 0; row < 9; row++)
	{
		var cols = [];
		for(var col = 0; col < 9; col++)
			cols[col] = 0;
			
		this.rows[row] = cols;
	}
};

CU.sudoku.Grid.prototype = {
	rows: [],
	
	/**
	 * Return value of a col,row in the grid
	 * @method
	 * @param {Number} col
	 * @param {Number} row
	 * @return {Number} 0 to 9, 0 meaning empty
	 */
	getValue: function(col, row) {
		return this.rows[row][col];
	},
	
	/**
	 * Set value of col,row in the grid.
	 * @method
	 * @param {Number} column
	 * @param {Number} row
	 * @param {Number} value 0 to 9, 0 meaning empty
	 */
	setValue: function(column, row, value) {
		this.rows[row][column] = value;
	},

	/**
	 * Does a specific cell conflict with another?
	 * @method
	 * @param {Number} column
	 * @param {Number} row
	 * @return {Boolean}
	 */
	cellConflicts: function(column, row) {
		var value = this.rows[row][column];
		
		if(value == 0)
			return false;
			
		for(var i = 0; i < 9; i++)
		{
			if(i != row && this.rows[i][column] == value) 
			{
				return true;
			}

			if(i != column && this.rows[row][i] == value)
			{
				return true;				
			}
		}

		//At this point, everything else is checked as valid except the 3x3 grid		
		return !this._miniGridValid(column, row);
	},
	
	/**
	 * Checks if the inner 3x3 grid a cell resides in is valid
	 * @method
	 * @private
	 * @param {Number} column
	 * @param {Number} row
	 * @return {Boolean}
	 */
	_miniGridValid: function(column, row) {		
		//Determine 3x3 grid position
		var mgX = Math.floor(column / 3);
		var mgY = Math.floor(row / 3);
		
		var startCol = mgX * 3;
		var startRow = mgY * 3;
		
		var endCol = (mgX + 1) * 3;
		var endRow = (mgY + 1) * 3;
		
		var numbers = [];
		for(var r = startRow; r < endRow; r++)
		{
			for(var c = startCol; c < endCol; c++)
			{
				var value = this.rows[r][c];
				if(value == 0)
					continue;
					
				if(numbers.indexOf(value) != -1)
					return false;
					
				numbers.push(value);			
			}
		}
		
		return true;
	},
	
	/**
	 * Return a string representation of the grid.
	 * @method
	 * @return {String}
	 */
	toString: function() {
		var str = '';
		for(var i = 0; i < 9; i++)
		{
			str += this.rows[i].join(' ') + "\r\n";
		}
		
		return str;
	},
	
	/**
	 * Return the puzzle as an array, for example for saving
	 * @method
     * @return {Array}
     */
	toArray: function() {
		var cells = [];
		for(var row = 0; row < 9; row++)
		{
			for(var col = 0; col < 9; col++)
				cells.push(this.rows[row][col]);
		}
		
		return cells;
	},
	
	/**
	 * Fill the puzzle from an array
	 * @method
	 * @param {Array} cells
	 * @return {CU.sudoku.Grid}
	 */
	fromArray: function(cells) {
		if(cells.length != 81)
			throw new Error('Array length is not 81');
			
		for(var i = 0; i < 81; i++)
		{
			var row = Math.floor(i / 9);
			var col = i - (row * 9);
			
			this.rows[row][col] = cells[i];
		}
		
		return this;
	}
};



