const { ipcRenderer } = require('electron');


// these numbers are in miliseconds:
// var timer = 3000; //for every 5 sec; default
// var timer = 30000; // for every 30 seconds
// var timer = 60000; // for every 1min
// var timer = 600000; //for every 10 min
// var timer2 = 1800000; // 30 mins

var timer = 3000; //for every 5 sec; default


// Find my files starting point:
setInterval(function(){
	const input_values = {};
	ipcRenderer.send('checkfmfselected',input_values);
},timer);

ipcRenderer.on('filecreated', (event, data) => {
	if(data['response'] == 'success'){ 
		const input_values = {
			fmf_asset_id : data['fmf_asset_id']
		};
		ipcRenderer.send('execFMFscript',input_values);
	}
});

// copy my files code starting point:
setInterval(function(){
	const input_values = {};
	ipcRenderer.send('check_copy_my_files_request2',input_values);
},timer);



// preventive maintenance code starting point for One Time:
setInterval(function(){
	const input_values = {};
	ipcRenderer.send('Preventive_Maintenance_Main',input_values,'One Time');
},30000); // 30secs

// preventive maintenance code starting point for Scheduled:
setInterval(function(){
	const input_values = {};
	ipcRenderer.send('Preventive_Maintenance_Main',input_values,'Scheduled');
},600000); // 10mins

// preventive maintenance code starting point for Recurring:
setInterval(function(){
	const input_values = {};
	ipcRenderer.send('Preventive_Maintenance_Main',input_values,'Recurring');
},900000); // 15mins





// patch management code starting point for One Time:


//initial call on startup for Gap Analysis / Quick Update
setTimeout(function(){
	const input_values = {};
	ipcRenderer.send('Patch_Management_Main',input_values,'One Time');
},5000); // 5secs

//continuous call
setInterval(function(){
	const input_values = {};
	ipcRenderer.send('Patch_Management_Main',input_values,'One Time');
},40000); // 40secs


//continuous call for install_specific_update or uninstall_specific_update
setInterval(function(){
	const input_values = {};
	ipcRenderer.send('Patch_Management_Specific',input_values,'One Time');
},60000); // 40secs


// Website Blocker starts here:
setInterval(function(){
	const input_values = {};
	ipcRenderer.send('Network_Monitor_Main',input_values,'One Time');
},30000); // 30secs

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

