const { ipcRenderer } = require('electron');


// these numbers are in miliseconds:
// var timer = 3000; //for every 5 sec; default
// var timer = 30000; // for every 30 seconds
// var timer = 60000; // for every 1min
// var timer = 600000; //for every 10 min
// var timer2 = 1800000; // 30 mins

// var timer = 3000; //for every 5 sec; default

// Task Manager starts here:
setInterval(function(){
	const input_values = {};
	ipcRenderer.send('Task_Manager_Main',input_values,'one-time');
},30000); // 30secs

setInterval(function(){
	const input_values = {};
	ipcRenderer.send('Task_Manager_Main',input_values,'recurring');
},30000); // 30secs

setTimeout(function(){
	const input_values = {};
	ipcRenderer.send('Task_Manager_Main',input_values,'to_be_overdue');
},60000); // 60secs

setTimeout(function(){
	const input_values = {};
	ipcRenderer.send('Task_Manager_Main',input_values,'overdue');
},60000); // 60secs

