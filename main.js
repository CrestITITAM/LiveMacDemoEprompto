const { app, Notification , BrowserWindow, screen, ipcMain, net } = require('electron');
const { autoUpdater } = require('electron-updater');
const electron = require('electron');
const remote = require('electron').remote;
const url = require('url'); 
const path = require('path');
const { dialog } = require('electron');
const os = require('os');
const si = require('systeminformation');
const mysql = require('mysql');
const ip = require('ip');
const { session } = require('electron');
const osu = require('node-os-utils');
const request = require("request");
const cron = require('node-cron'); 
const fs = require("fs");
const log = require("electron-log");
const exec = require('child_process').exec;
const AutoLaunch = require('auto-launch');
const nodeDiskInfo = require('node-disk-info');
const mv = require('mv'); 
const uuid = require('node-machine-id');
const csv = require('csvtojson');
const serialNumber = require('serial-number');
const shell = require('node-powershell');
const { spawn } = require('child_process');
const child_process = require('child_process');
// const notifier = require('node-notifier');

const Tray = electron.Tray;
const iconPath = path.join(__dirname,'images/IconTemplate3.png');

global.root_url = 'https://www.eprompto.com/itam_backend_end_user';
// global.root_url = 'https://poc.eprompto.com/itam_backend_end_user';

// global.root_url = 'https://developer.eprompto.com/itam_backend_end_user';
// global.root_url = 'http://localhost/end_user_backend';
// global.root_url = 'http://localhost/eprompto_master';

let reqPath = path.join(app.getAppPath(), '../');
const detail =  reqPath+"syskey.txt";
//var csvFilename = reqPath + 'utilise.csv';
var time_file = reqPath + 'time_file.txt';

let mainWindow;
let categoryWindow;
let settingWindow;
let display;
let width;
let startWindow;
let tabWindow;
let child;
let ticketIssue;
let policyWindow;

let tray = null;
let count = 0;
var crontime_array = [];
var updateDownloaded = false;

let loginWindow;
let regWindow;
let forgotWindow;
let ticketWindow;
let quickUtilWindow;

app.on('ready',function(){

    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
      app.quit();
    }
    
    tray = new Tray(iconPath);
    tray.setIgnoreDoubleClickEvents(true);
    
    app.dock.hide();

    log.transports.file.level = 'info';
    log.transports.file.maxSize = 5 * 1024 * 1024;
    log.transports.file.file = reqPath + '/log.log';
    log.transports.file.streamConfig = { flags: 'a' };
    log.transports.file.stream = fs.createWriteStream(log.transports.file.file, log.transports.file.streamConfig);
    log.transports.console.level = 'debug';
    
        session.defaultSession.cookies.get({ url: 'http://www.eprompto.com' })
        .then((cookies) => {
          console.log(cookies);
          if(cookies.length == 0){
            if(fs.existsSync(detail)){
              fs.readFile(detail, 'utf8', function (err,data) {
              if (err) {
                return console.log(err);
              }
              
               var stats = fs.statSync(detail);
               var fileSizeInBytes = stats["size"];
               if(fileSizeInBytes > 0){
                   const cookie = {url: 'http://www.eprompto.com', name: data, value: '', expirationDate: 99999999999}
                 session.defaultSession.cookies.set(cookie, (error) => {
                  if (error) console.error(error)
                 })
               }
            });
            }
          }else{
            if(fs.existsSync(detail)) {
               var stats = fs.statSync(detail);
             var fileSizeInBytes = stats["size"];
             if(fileSizeInBytes == 0){
                  fs.writeFile(detail, cookies[0].name, function (err) { 
                if (err) return console.log(err);                
              });
             }
            } else {
                fs.writeFile(detail, cookies[0].name, function (err) { 
              if (err) return console.log(err);
            });
            }
             
          }

          SetCron(cookies[0].name); // to fetch utilisation
          
          // checkSecuritySelected(cookies[0].name); //to fetch security detail

        }).catch((error) => {
          console.log(error)
        })

        let autoLaunch = new AutoLaunch({
          name: 'ePrompto',
        });
        autoLaunch.isEnabled().then((isEnabled) => {
          if (!isEnabled) autoLaunch.enable();
        });


      var now_datetime = new Date();
      var options = { hour12: false, timeZone: "Asia/Kolkata" };
      now_datetime = now_datetime.toLocaleString('en-US', options);
      var only_date = now_datetime.split(", ");

        fs.writeFile(time_file, now_datetime, function (err) { 
        if (err) return console.log(err);
      });

      setGlobalVariable();  
      
      // session.defaultSession.clearStorageData([], function (data) {
      //     console.log(data);
      // })
  }); 

//   session.defaultSession.clearStorageData([], function (data) {
//     console.log(data);
// })
// }); 

app.commandLine.appendSwitch('disable-http2');
autoUpdater.requestHeaders = {'Cache-Control' : 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'};


function SetCron(sysKey){

  var body = JSON.stringify({ "funcType": 'crontime', "syskey": sysKey }); 
  const request = net.request({ 
      method: 'POST', 
      url: root_url+'/main.php' 
  }); 
  request.on('response', (response) => {
      //console.log(`STATUS: ${response.statusCode}`)
      response.on('data', (chunk) => {
       console.log("ITAM CRON TIME IS"+`${chunk}`);
        var obj = JSON.parse(chunk);
        if(obj.status == 'valid'){
          crontime_array = obj.result;
          crontime_array.forEach(function(slot){ 
            cron.schedule("0 "+slot[0]+" "+slot[1]+" * * *", function() { 
            session.defaultSession.cookies.get({ url: 'http://www.eprompto.com' })
              .then((cookies) => {
                if(cookies.length > 0){
                  slot_time = slot[1]+':'+slot[0];
                  updateAssetUtilisation(slot_time);
                }
              }).catch((error) => {
                console.log(error)
              })
             }, {
               scheduled: true,
               timezone: "Asia/Kolkata" 
          });
          });
        }
      })
      response.on('end', () => {})
  })
  request.on('error', (error) => { 
      console.log(`ERROR: ${(error)}`) 
  })
  request.setHeader('Content-Type', 'application/json'); 
  request.write(body, 'utf-8'); 
  request.end();
}

function setGlobalVariable(){
  tray.destroy();
  tray = new Tray(iconPath);
  display = electron.screen.getPrimaryDisplay();
  width = display.bounds.width;

  si.system(function(data) {
    sys_OEM = data.manufacturer;
    sys_model = data.model;
    global.Sys_name = sys_OEM+' '+sys_model;
  });

  session.defaultSession.cookies.get({ url: 'http://www.eprompto.com' })
    .then((cookies) => { 
      if(cookies.length > 0){ 
        require('dns').resolve('www.google.com', function(err) {
        if (err) {
           console.log("No connection");
           global.NetworkStatus = 'No';
        } else {
          console.log("CONNECTED");
          global.NetworkStatus = 'Yes';

          var body = JSON.stringify({ "funcType": 'openFunc', "sys_key": cookies[0].name }); 
          const request = net.request({ 
              method: 'POST', 
              url: root_url+'/main.php' 
          }); 
          request.on('response', (response) => {
              //console.log(`STATUS: ${response.statusCode}`)
              response.on('data', (chunk) => { 
                //console.log(`${chunk}`); 
                var obj = JSON.parse(chunk);
                if(obj.status == 'valid'){
                  asset_id = obj.result[0];
                  client_id = obj.result[1];
                  global.clientID = client_id;
                  global.NetworkStatus = 'Yes';
                  global.downloadURL = __dirname;
                  global.assetID = asset_id;
                  global.deviceID = obj.result[2];
                  global.userName = obj.loginPass[0];
                  global.loginid = obj.loginPass[1];
                  global.sysKey = cookies[0].name;
                  updateAsset(asset_id);

                  //SetCron(cookies[0].name);
                  //addAssetUtilisation(asset_id,client_id);
                }
              })
              response.on('end', () => {})
          })
          request.on('error', (error) => { 
             log.info('Error while fetching global data '+error); 
          })
          request.setHeader('Content-Type', 'application/json'); 
          request.write(body, 'utf-8'); 
          request.end();
        }
      });


      // Old ITAM UI dimensions:
      // mainWindow = new BrowserWindow({
      //   width: 392,
      //   height: 520,
      //   icon: __dirname + '/images/ePrompto_png.png',
      //   titleBarStyle: 'hiddenInset',
      //   frame: false,
      //   x: width - 450,
      //   y: 190,
      //   webPreferences: {
      //           nodeIntegration: true,
      //           enableRemoteModule: true,
      //       }
      // });

      //New ITAM UI dimensions:
      mainWindow = new BrowserWindow({
        // width: 392,
        // width: 370,
        width: 277,
        // height: 520,
        height: 250,
        icon: __dirname + '/images/ePrompto_png.png',
        // titleBarStyle: 'hiddenInset',
        // titleBarStyle: 'customButtonsOnHover',
        frame: false,
        resizable:false,
        transparent:true,        
        // x: width - 450,
        x: width - 300,
        // y: 190
        y: 440,
        webPreferences: {
                nodeIntegration: true,
                enableRemoteModule: true,    
            }
      });

      // mainWindow.openDevTools();

      mainWindow.setMenuBarVisibility(false);

      mainWindow.loadURL(url.format({
        pathname: path.join(__dirname,'index.html'),
        protocol: 'file:',
        slashes: true
      }));

        mainWindow.once('ready-to-show', () => { 

        // autoUpdater.setFeedURL('http://developer.eprompto.com/');
        // log.transports.file.level = "debug";
        // autoUpdater.logger = log;
        // autoUpdater.logger.transports.file.level = 'info';
        // log.debug("logger debug");
        // autoUpdater.checkForUpdates();
        autoUpdater.checkForUpdatesAndNotify();
        // log.info("end");
        // autoUpdater.onUpdateAvailable();
      });

      const gotTheLock = app.requestSingleInstanceLock();
      if (!gotTheLock) {
        app.quit();
      }

      tray.on('click', function(e){
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
          }
      });

      // var isAppQuitting = false;
    
      // powerMonitor.on('shutdown', () => {
      //   app.quit();
      //   console.log("powerMonitor on shutdown hit");
      // });

      mainWindow.on('close', function (e) {
        
        // if (!isAppQuitting) {
        //   e.preventDefault();
        //   mainWindow.hide();
        // }
        app.quit();
       });
      
      //mainWindow.on('closed', () => app.quit());
      }
      else{
        startWindow = new BrowserWindow({
        width: 392,
        height: 520,
        icon: __dirname + '/images/ePrompto_png.png',
        //frame: false,
        x: width - 450,
            y: 190,
        webPreferences: {
                nodeIntegration: true,
                enableRemoteModule: true,
            }
      });

      startWindow.setMenuBarVisibility(false);

      startWindow.loadURL(url.format({
        pathname: path.join(__dirname,'are_you_member.html'),
        protocol: 'file:',
        slashes: true
      }));
      }
    }).catch((error) => {
      console.log(error)
    })    
}



function updateAssetUtilisation(slot){
  
  const cpu = osu.cpu;
  var active_user_name = "";
  var ctr = 0;
  var app_list = [];
  const data = [];
  var app_name_list = "";
  var time_off = "";
  var avg_ctr; 
  var avg_cpu = 0;
  var avg_hdd = 0;
  var avg_ram = 0;

  var todays_date = new Date();
  todays_date = todays_date.toISOString().slice(0,10);

  if(fs.existsSync(time_file)) { 
       var stats = fs.statSync(time_file); 
     var fileSizeInBytes = stats["size"]; 
     if(fileSizeInBytes > 0){
        fs.readFile(time_file, 'utf8', function (err,data) {
          if (err) {
            return console.log(err);
          }
          time_off = data;
        });
     }
    }

  session.defaultSession.cookies.get({ url: 'http://www.eprompto.com' })
    .then((cookies1) => {

    const disks = nodeDiskInfo.getDiskInfoSync();
    total_ram = (os.totalmem()/(1024*1024*1024)).toFixed(1); // total RAM
    free_ram = (os.freemem()/(1024*1024*1024)).toFixed(1); // free RAM
      //tot_mem = (os.totalmem()/(1024*1024*1024)).toFixed(1);
      //utilised_RAM = tot_mem - free_mem; // in GB
    today = Math.floor(Date.now() / 1000);
    utilised_RAM = (((total_ram - free_ram)/total_ram)*100).toFixed(1); // % RAM used

    //used_mem = ((os.totalmem() - os.freemem())/(1024*1024*1024)).toFixed(1);
    hdd_total = hdd_used = 0;
    hdd_name = '';
    for (const disk of disks) {
         if(disk.filesystem == 'Local Fixed Disk'){
           hdd_total = hdd_total + disk.blocks;
           hdd_used = hdd_used + disk.used;
           //free_drive = ((disk.available - disk.used)/(1024*1024*1024)).toFixed(2);
           used_drive = (disk.used/(1024*1024*1024)).toFixed(2); // disk used in GB
           hdd_name = hdd_name.concat(disk.mounted+' '+used_drive+' / ');
       }
          
      }

      hdd_total = hdd_total/(1024*1024*1024);
      hdd_used = hdd_used/(1024*1024*1024);

    // Get_Browser_History_Powershell_Script('Get_Browser_History');

    cpu.usage()
      .then(info => { 
      // info is nothing but CPU utilisation in %
          if(info == 0){
            info = 1; 
          }
          CallUpdateAssetApi(cookies1[0].name,todays_date,slot,info,utilised_RAM,hdd_used,ctr,active_user_name,utilised_RAM,info,hdd_used,total_ram,hdd_total,hdd_name,time_off);           
    })
  }).catch((error) => {
      console.log(error)
  })    
}

function CallUpdateAssetApi(sys_key,todays_date,slot,cpu_used,ram_used,hdd_used,active_usr_cnt,active_usr_nm,csv_ram_util,info,hdd_used,total_mem,hdd_total,hdd_name,time_off){
  
  var filepath1 = 'C:\\ITAMEssential\\EventLogCSV\\BrowserData.csv';    
  newFilePath = filepath1;
  
  if (fs.existsSync(newFilePath)) {
    var final_arr=[];
    var new_Arr = [];
    var ultimate = [];
    const converter=csv({noheader: true,output:"line"})
    .fromFile(newFilePath)      
    .then((json)=>{
      
        if(json != []){  
          console.log(json);                    

            var body = JSON.stringify({ "funcType": 'addassetUtilisation', "sys_key": sys_key, "browser_data":json , "cpu_util": cpu_used, "slot": slot, "ram_util": ram_used,
            "total_mem": total_mem, "hdd_total" : hdd_total, "hdd_used" : hdd_used, "hdd_name" : hdd_name, "timeoff": time_off }); 
          const request = net.request({ 
              method: 'POST', 
              url: root_url+'/asset.php' 
          }); 
          request.on('response', (response) => {
              //console.log(`STATUS: ${response.statusCode}`)
              response.on('data', (chunk) => {
                console.log(`${chunk}`);
                var obj = JSON.parse(chunk);
                if(obj.status == 'invalid'){ 
                  log.info('Error while updating asset detail 1');
                }else{
                  log.info('Updated asset detail successfully 1');
                }
              })
              response.on('end', () => {
                // if (newFilePath != "" ){ // if filepath has been passed and uploading done
                //   fs.unlinkSync(newFilePath); // This deletes the created csv
                //   console.log("BrowserData File Unlinked");
                // }
              })
          })
          request.on('error', (error) => { 
              console.log(`ERROR: ${(error)}`) 
          })
          request.setHeader('Content-Type', 'application/json'); 
          request.write(body, 'utf-8'); 
          request.end();
        }
    })
  }else{
    var body = JSON.stringify({ "funcType": 'addassetUtilisation', "sys_key": sys_key, "cpu_util": cpu_used, "slot": slot, "ram_util": ram_used,
      "total_mem": total_mem, "hdd_total" : hdd_total, "hdd_used" : hdd_used, "hdd_name" : hdd_name, "timeoff": time_off }); 
    const request = net.request({ 
        method: 'POST', 
        url: root_url+'/asset.php' 
    }); 
    request.on('response', (response) => {
        //console.log(`STATUS: ${response.statusCode}`)
        response.on('data', (chunk) => {
          //console.log(`${chunk}`);
          var obj = JSON.parse(chunk);
          if(obj.status == 'invalid'){ 
            log.info('Error while updating asset detail 2');
          }else{
            log.info('Updated asset detail successfully 2');
          }
        })
        response.on('end', () => {})
    })
    request.on('error', (error) => { 
        console.log(`ERROR: ${(error)}`) 
    })
    request.setHeader('Content-Type', 'application/json'); 
    request.write(body, 'utf-8'); 
    request.end();
  }
}

function readCSVUtilisation(){
  //var inputPath = reqPath + '/utilise.csv';

  var current_date = new Date();
  var month = current_date.getMonth()+ 1;
  var day = current_date.getDate();
  var year = current_date.getFullYear();
    current_date = day+'-0'+month+'-'+year; //change the format as per excel to compare thee two dates

    first_active_usr_cnt = sec_active_usr_cnt = third_active_usr_cnt = frth_active_usr_cnt = '';
  first_active_usrname = sec_active_usrname = third_active_usrname = frth_active_usrname = '';
  first_app_used = sec_app_used = third_app_used = frth_app_used = '';

  first_avg_ctr = first_avg_cpu = first_avg_ram = first_avg_hdd = 0;
  sec_avg_ctr = sec_avg_cpu = sec_avg_ram = sec_avg_hdd = 0;
  third_avg_ctr = third_avg_cpu = third_avg_ram = third_avg_hdd = 0;
  frth_avg_ctr = frth_avg_cpu = frth_avg_ram = frth_avg_hdd = 0;

  var csv_array = [];

  session.defaultSession.cookies.get({ url: 'http://www.eprompto.com' })
    .then((cookies) => {
        require_path = reqPath + 'utilise.csv';
             
      if (fs.existsSync(require_path)){ 
        const converter=csv()
        .fromFile(reqPath + '/utilise.csv')
        .then((json)=>{
          if(json != []){

            for (j = 0; j < json.length; j++) {
              if(json[j]['date'] == current_date ){ 
                if(json[j]['time_slot'] == 'first'){ 
                  first_avg_ctr = Number(first_avg_ctr) + 1; 
                  first_avg_cpu = first_avg_cpu + Number(json[j]['cpu']);
                  first_avg_ram = first_avg_ram + Number(json[j]['ram']);
                  first_avg_hdd = first_avg_hdd + Number(json[j]['hdd']);
                  first_active_usr_cnt = json[j]['active_user'];
                  first_active_usrname = json[j]['active_user_name'];
                  first_app_used = json[j]['app_used'];

                }else if(json[j]['time_slot'] == 'second'){ 
                  sec_avg_ctr = Number(sec_avg_ctr) + 1; 
                  sec_avg_cpu = sec_avg_cpu + Number(json[j]['cpu']);
                  sec_avg_ram = sec_avg_ram + Number(json[j]['ram']);
                  sec_avg_hdd = sec_avg_hdd + Number(json[j]['hdd']);
                  sec_active_usr_cnt = json[j]['active_user'];
                  sec_active_usrname = json[j]['active_user_name'];
                  sec_app_used = json[j]['app_used'];
                }else if(json[j]['time_slot'] == 'third'){ 
                  third_avg_ctr = Number(third_avg_ctr) + 1; 
                  third_avg_cpu = third_avg_cpu + Number(json[j]['cpu']);
                  third_avg_ram = third_avg_ram + Number(json[j]['ram']);
                  third_avg_hdd = third_avg_hdd + Number(json[j]['hdd']);
                  third_active_usr_cnt = json[j]['active_user'];
                  third_active_usrname = json[j]['active_user_name'];
                  third_app_used = json[j]['app_used'];
                }else if(json[j]['time_slot'] == 'fourth'){ 
                  frth_avg_ctr = Number(frth_avg_ctr) + 1; 
                  frth_avg_cpu = frth_avg_cpu + Number(json[j]['cpu']);
                  frth_avg_ram = frth_avg_ram + Number(json[j]['ram']);
                  frth_avg_hdd = frth_avg_hdd + Number(json[j]['hdd']);
                  frth_active_usr_cnt = json[j]['active_user'];
                  frth_active_usrname = json[j]['active_user_name'];
                  frth_app_used = json[j]['app_used'];
                }

                csv_array['date'] = json[j]['date'];
              }

            }

            if(first_avg_ctr != 0){

              first_avg_cpu = first_avg_cpu/first_avg_ctr;
              first_avg_ram = first_avg_ram/first_avg_ctr;
              first_avg_hdd = first_avg_hdd/first_avg_ctr;

              csv_array['first'] = {
                time_slot : 'first',
                cpu : first_avg_cpu,
                ram : first_avg_ram,
                hdd : first_avg_hdd,
                active_user : first_active_usr_cnt,
                active_user_name : first_active_usrname,
                app_used : first_app_used
              }
            }
            

            if(sec_avg_ctr != 0){

              sec_avg_cpu = sec_avg_cpu/sec_avg_ctr;
              sec_avg_ram = sec_avg_ram/sec_avg_ctr;
              sec_avg_hdd = sec_avg_hdd/sec_avg_ctr;

              csv_array['second'] = {
                time_slot : 'second',
                cpu : sec_avg_cpu,
                ram : sec_avg_ram,
                hdd : sec_avg_hdd,
                active_user : sec_active_usr_cnt,
                active_user_name : sec_active_usrname,
                app_used : sec_app_used
              }
            }

            if(third_avg_ctr != 0){

              third_avg_cpu = third_avg_cpu/third_avg_ctr;
              third_avg_ram = third_avg_ram/third_avg_ctr;
              third_avg_hdd = third_avg_hdd/third_avg_ctr;

              csv_array['third'] = {
                time_slot : 'third',
                cpu : third_avg_cpu,
                ram : third_avg_ram,
                hdd : third_avg_hdd,
                active_user : third_active_usr_cnt,
                active_user_name : third_active_usrname,
                app_used : third_app_used
              }
            }

            if(frth_avg_ctr != 0){

              frth_avg_cpu = frth_avg_cpu/frth_avg_ctr;
              frth_avg_ram = frth_avg_ram/frth_avg_ctr;
              frth_avg_hdd = frth_avg_hdd/frth_avg_ctr;

              csv_array['fourth'] = {
                time_slot : 'fourth',
                cpu : frth_avg_cpu,
                ram : frth_avg_ram,
                hdd : frth_avg_hdd,
                active_user : frth_active_usr_cnt,
                active_user_name : frth_active_usrname,
                app_used : frth_app_used
              }
            }

            const disks = nodeDiskInfo.getDiskInfoSync();
            //total_mem = (os.totalmem()/(1024*1024*1024)).toFixed(1);
            hdd_total = hdd_used = 0;
            hdd_name = '';
            for (const disk of disks) {
               hdd_total = hdd_total + disk.blocks;
               used_drive = (disk.used/(1024*1024*1024)).toFixed(2);
               hdd_name = hdd_name.concat(disk.mounted+' '+used_drive);
            }

            hdd_total = hdd_total/(1024*1024*1024);

            var body = JSON.stringify({ "funcType": 'fetchfromCSV', "sys_key": cookies[0].name, "data": csv_array, "total_mem": total_mem, "hdd_total": hdd_total, "hdd_name": hdd_name }); 
            const request = net.request({ 
                method: 'POST', 
                url: root_url+'/utilisation.php' 
            }); 
            request.on('response', (response) => {
                //console.log(`STATUS: ${response.statusCode}`)
                response.on('data', (chunk) => {
                  //console.log(`${chunk}`);
                  var obj = JSON.parse(chunk);
                  if(obj.status == 'valid'){
                    log.info('Successfully inserted data to database');
                  }
                })
                response.on('end', () => {})
            })
            request.on('error', (error) => { 
                log.info('Error while fetchfromCSV '+`${(error)}`)
            })
            request.setHeader('Content-Type', 'application/json'); 
            request.write(body, 'utf-8'); 
            request.end();

          }
            
        })
      }

     }).catch((error) => {
        log.info('Session error occured in readCSVUtilisation function '+error);
     })
}

function MoveFile(){
  require_path = reqPath + '/utilise.csv';
             
  if (fs.existsSync(require_path)){
      const converter=csv()
      .fromFile(reqPath + '/utilise.csv')
      .then((json)=>{
        if(json != []){
          var datetime = new Date();
          datetime = datetime.toISOString().slice(0,10);
            
          var oldPath = reqPath + '/utilise.csv';
          require_path = reqPath + '/utilisation';

          if (!fs.existsSync(require_path)){
              fs.mkdirSync(require_path);
          } 

            var newPath = require_path + '/utilise_'+datetime+'.csv';

            mv(oldPath, newPath, err => {
                if (err) log.info('Error while moving csv file to utilisation folder '+error);
                log.info('Succesfully moved to Utilisation tab');
            }); 

        }
    })
  }

}

function addAssetUtilisation(asset_id,client_id){
  const cpu = osu.cpu;

  cpu.usage()
    .then(info => {
      free_mem = (os.freemem()/(1024*1024*1024)).toFixed(1);
      tot_mem = (os.totalmem()/(1024*1024*1024)).toFixed(1)
      utilised_RAM = tot_mem - free_mem; // in GB
      today = Math.floor(Date.now() / 1000);

      var body = JSON.stringify({ "funcType": 'assetUtilisation', "clientID": client_id, 
        "assetID": asset_id, "cpu_util": info, "ram_util": utilised_RAM }); 
      const request = net.request({ 
          method: 'POST', 
          url: root_url+'/asset.php' 
      }); 
      request.on('response', (response) => {
          //console.log(`STATUS: ${response.statusCode}`)
          response.on('data', (chunk) => {
          })
          response.on('end', () => {})
      })
      request.on('error', (error) => { 
          log.info('Error while adding asset '+`${(error)}`) 
      })
      request.setHeader('Content-Type', 'application/json'); 
      request.write(body, 'utf-8'); 
      request.end();

    }) 
}

function updateAsset(asset_id){
  global.assetID = asset_id;
  system_ip = ip.address();

  if(asset_id != null){
    si.osInfo(function(data) {
      os_release = data.kernel;
        os_bit_type = data.arch;
        os_serial = data.serial;
        os_version = data.release;
        os_name = data.distro;
        os_OEM = data.codename;

        os_data = os_name+' '+os_OEM+' '+os_bit_type+' '+os_version;

        
        var body = JSON.stringify({ "funcType": 'osInfo', "asset_id": asset_id, "version" : os_data}); 
        const request = net.request({ 
            method: 'POST', 
            url: root_url+'/asset.php' 
        }); 
        request.on('response', (response) => {
            //console.log(`STATUS: ${response.statusCode}`)
            response.on('data', (chunk) => {
            })
            response.on('end', () => {})
        })
        request.on('error', (error) => { 
            log.info('Error while updating osInfo '+`${(error)}`) 
        })
        request.setHeader('Content-Type', 'application/json'); 
        request.write(body, 'utf-8'); 
        request.end();
    });

    si.bios(function(data) {
       bios_name = data.vendor;
       bios_version = data.bios_version;
       bios_released = data.releaseDate;

      var body = JSON.stringify({ "funcType": 'biosInfo',  "asset_id": asset_id, "biosname": bios_name, "sys_ip": system_ip,
        "serialNo": bios_version, "biosDate": bios_released }); 
      const request = net.request({ 
          method: 'POST', 
          url: root_url+'/asset.php' 
      }); 
      request.on('response', (response) => {
          //console.log(`STATUS: ${response.statusCode}`)
          response.on('data', (chunk) => {
          })
          response.on('end', () => {})
      })
      request.on('error', (error) => { 
          log.info('Error while updating biosInfo '+`${(error)}`) 
      })
      request.setHeader('Content-Type', 'application/json'); 
      request.write(body, 'utf-8'); 
      request.end();

    });

    si.cpu(function(data) {
      processor_OEM = data.vendor;
      processor_speed_ghz = data.speed;
      processor_model = data.brand;

      var body = JSON.stringify({ "funcType": 'cpuInfo',"asset_id": asset_id,"processor" : processor_OEM, "brand": processor_model, "speed": processor_speed_ghz }); 
      const request = net.request({ 
          method: 'POST', 
          url: root_url+'/asset.php' 
      }); 
      request.on('response', (response) => {
          //console.log(`STATUS: ${response.statusCode}`)
          response.on('data', (chunk) => {
          })
          response.on('end', () => {})
      })
      request.on('error', (error) => { 
          log.info('Error while updating cpu '+`${(error)}`) 
      })
      request.setHeader('Content-Type', 'application/json'); 
      request.write(body, 'utf-8'); 
      request.end();

    });

    si.system(function(data) {
      sys_OEM = data.manufacturer;
        sys_model = data.model;
        device_name = os.hostname();
        cpuCount = os.cpus().length;
        itam_version = app.getVersion();
      serialNumber(function (err, value) {

        var body = JSON.stringify({ "funcType": 'systemInfo',"asset_id": asset_id, "make" : sys_OEM,
          "model": sys_model, "serial_num": value, "device_name": device_name, "cpu_count": cpuCount, "version": itam_version }); 
        const request = net.request({ 
            method: 'POST', 
            url: root_url+'/asset.php' 
        }); 
        request.on('response', (response) => {
            //console.log(`STATUS: ${response.statusCode}`)
            response.on('data', (chunk) => {
            })
            response.on('end', () => {})
        })
        request.on('error', (error) => { 
            log.info('Error while updating systemInfo '+`${(error)}`) 
        })
        request.setHeader('Content-Type', 'application/json'); 
        request.write(body, 'utf-8'); 
        request.end();

      });
    });

    
    exec(`system_profiler SPApplicationsDataType | grep -B8 -E \'()[^/]*\\\.app\' | awk \'/:$/ {printf $0}; /Version: / {print "",$2,$3}\'`, function(error, stdout, stderr) {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      // console.log(`stdout: ${stdout}`);
      // console.error(`stderr: ${stderr}`);

      var app_list = [];
      var version ="";
      var i=0;
      res = stdout.split('\n'); 
      version = '[';
      res.forEach(function(line) {
        i=Number(i)+Number(1);
        line = line.trim();
        //var newStr = line.replace(/  +/g, ' ');
          // var parts = line.split(/  +/g);
          var parts = line.split(': ');
          if(parts[0] != 'DisplayName' && parts[0] != '-----------' && parts[0] != '' && parts[1] != 'DisplayVersion'){
            version += '{"name":"'+parts[0]+'","version":"'+parts[1]+'"},';
          }
      });
      version += '{}]';
      var output = JSON.stringify(version);
      output = JSON.parse(output);
      console.log("output is"+output);
      require('dns').resolve('www.google.com', function(err) {
      if (err) {
        console.log("No connection");
      } else {
        var body = JSON.stringify({ "funcType": 'softwareList', "asset_id": asset_id, "result": output }); 
        const request = net.request({ 
            method: 'POST', 
            url: root_url+'/asset.php' 
        }); 
        request.on('response', (response) => {
            //console.log(`STATUS: ${response.statusCode}`)
            response.on('data', (chunk) => {
              console.log(`${chunk}`);
            })
            response.on('end', () => {})
        })
        request.on('error', (error) => { 
            console.log(`ERROR: ${(error)}`) 
        })
        request.setHeader('Content-Type', 'application/json'); 
        request.write(body, 'utf-8'); 
        request.end();
      }
      });
    });



    
  } 
}


ipcMain.on("open_policy", (event, info) => { 
  policyWindow = new BrowserWindow({
    width: 1500,
    height: 1500,
    icon: __dirname + '/images/ePrompto_png.png',
    webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
        }
  });

  policyWindow.setMenuBarVisibility(false);

  policyWindow.loadURL(url.format({
    pathname: path.join(__dirname,'policy.html'),
    protocol: 'file:',
    slashes: true
  }));

  policyWindow.on('close', function (e) {
    policyWindow = null;
  });
});

ipcMain.on("download", (event, info) => { 
  var newWindow = BrowserWindow.getFocusedWindow();
  var filename = reqPath + '/output.csv';

  let options  = {
   buttons: ["OK"],
   message: "Downloaded Successfully. Find the same in Download folder"
  }

  let alert_message = dialog.showMessageBox(options);

  var output_one = [];
  var data = [];
  var space = '';

  session.defaultSession.cookies.get({ url: 'http://www.eprompto.com' })
    .then((cookies1) => {
      if(cookies1.length > 0){
        if(info['tabName'] == 'usage'){

          var body = JSON.stringify({ "funcType": 'cpuDetail', "sys_key": cookies1[0].name, 
            "from_date": info['from'], "to_date": info['to']  }); 
          const request = net.request({ 
              method: 'POST', 
              url: root_url+'/download.php' 
          }); 
          request.on('response', (response) => {
              //console.log(`STATUS: ${response.statusCode}`)
              response.on('data', (chunk) => {
                //console.log(`${chunk}`);
                var obj = JSON.parse(chunk);
                if(obj.status == 'valid'){
                  data = obj.result;
                  output_one = ['Date,Slot Time,Total Ram(GB),Total HDD(GB),HDD Name,CPU(%),RAM(%),HDD(GB),App'];
                
                  data.forEach((d) => {
                    output_one.push(d[0]);
                      d['detail'].forEach((dd) => {
                        output_one.push(dd.join()); // by default, join() uses a ','
                      });
                    });
                
                  fs.writeFileSync(filename, output_one.join(os.EOL));
                    var datetime = new Date();
                    datetime = datetime.toISOString().slice(0,10);

                    var oldPath = reqPath + '/output.csv';
                    require_path = 'C:/Users/'+ os.userInfo().username +'/Downloads';
                 
                    if (!fs.existsSync(require_path)){
                        fs.mkdirSync(require_path);
                    } 

                    var newPath = 'C:/Users/'+ os.userInfo().username +'/Downloads/perfomance_report_of_'+os.hostname()+'_'+datetime+'.csv';
                    mv(oldPath, newPath, err => {
                        if (err) return console.error(err);
                        console.log('success!');
                        console.log(alert_message);
                    });
                }
              })
              response.on('end', () => {})
          })
          request.on('error', (error) => { 
              console.log(`ERROR: ${(error)}`) 
          })
          request.setHeader('Content-Type', 'application/json'); 
          request.write(body, 'utf-8'); 
          request.end();

        }else if(info['tabName'] == 'app'){ 
           filename = reqPath + '/app_output.csv';
           var body = JSON.stringify({ "funcType": 'appDetail', "sys_key": cookies1[0].name, "from_date": info['from'], "to_date": info['to']  }); 
            const request = net.request({ 
                method: 'POST', 
                url: root_url+'/download.php' 
            }); 
            request.on('response', (response) => {
                //console.log(`STATUS: ${response.statusCode}`)
                response.on('data', (chunk) => {
                  //console.log(`${chunk}`);
                  var obj = JSON.parse(chunk);
                  if(obj.status == 'valid'){
                    data = obj.result;
                    output_one = ['Date,Detail']; 
                    data.forEach((d) => {
                         output_one.push(d.join()); // by default, join() uses a ','
                      });
                  
                    fs.writeFileSync(filename, output_one.join(os.EOL));
                      var datetime = new Date();
                      datetime = datetime.toISOString().slice(0,10);

                      var oldPath = reqPath + '/app_output.csv';
                      require_path = 'C:/Users/'+ os.userInfo().username +'/Downloads';
                   
                    if (!fs.existsSync(require_path)){
                        fs.mkdirSync(require_path);
                    } 

                      var newPath = 'C:/Users/'+ os.userInfo().username +'/Downloads/app_used_report_of_'+os.hostname()+'_'+datetime+'.csv';
                      mv(oldPath, newPath, err => {
                          if (err) return console.error(err);
                          console.log('success!');
                          console.log(alert_message);
                      });
                  }
                })
                response.on('end', () => {})
            })
            request.on('error', (error) => { 
                console.log(`ERROR: ${(error)}`) 
            })
            request.setHeader('Content-Type', 'application/json'); 
            request.write(body, 'utf-8'); 
            request.end();
        }
      }
    }).catch((error) => {
      console.log(error)
    })

});

ipcMain.on('app_version', (event) => {
  event.sender.send('app_version', { version: app.getVersion() });
});

ipcMain.on('openTabs',function(e,form_data){  
  tabWindow = new BrowserWindow({
    width: 1500,
    height: 1500,
    icon: __dirname + '/images/ePrompto_png.png',
    webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
        }
  });

  tabWindow.setMenuBarVisibility(false);

  tabWindow.loadURL(url.format({
    pathname: path.join(__dirname,'setting/all_in_one.html'),
    protocol: 'file:',
    slashes: true
  }));

  tabWindow.on('close', function (e) {
    // if (electron.app.isQuitting) {
    //  return
    // }
    // e.preventDefault();
    tabWindow = null;
  });
});


ipcMain.on('tabData',function(e,form_data){ 
  session.defaultSession.cookies.get({ url: 'http://www.eprompto.com' })
    .then((cookies1) => {
      if(cookies1.length > 0){
        if(form_data['tabName'] == 'ticket'){

          var body = JSON.stringify({ "funcType": 'ticketDetail', "sys_key": cookies1[0].name, "clientid": form_data['clientid'] }); 
          const request = net.request({ 
              method: 'POST', 
              url: root_url+'/ticket.php' 
          }); 
          request.on('response', (response) => {
              //console.log(`STATUS: ${response.statusCode}`)
              response.on('data', (chunk) => {
                //console.log(`${chunk}`);
                var obj = JSON.parse(chunk);
                if(obj.status == 'valid'){
                  e.reply('tabTicketReturn', obj.result) ;
                }else if(obj.status == 'invalid'){
                  e.reply('tabTicketReturn', obj.result) ;
                }
              })
              response.on('end', () => {})
          })
          request.on('error', (error) => { 
              log.info('Error while fetching ticket detail'+`${(error)}`)
          })
          request.setHeader('Content-Type', 'application/json'); 
          request.write(body, 'utf-8'); 
          request.end();

        }else if(form_data['tabName'] == 'task')
        {
            var body = JSON.stringify({ "funcType": 'TaskManagerTable', "sys_key": cookies1[0].name}); 
            const request = net.request({ 
                method: 'POST', 
                url: root_url+'/task_manager.php' 
            });
            request.on('response', (response) => {
              // console.log(`STATUS: ${response.statusCode}`)
              response.on('data',(chunk) => {
                // console.log(chunk);
                // console.log(`${chunk}`);
                // console.log(chunk.toString('utf8'));
                var obj = JSON.parse(chunk);
                
                 if(obj.status == 'valid'){
                  // console.log(obj);
                   e.reply('tabTaskReturn',obj.result);
                 }
                 else if(obj.status == 'invalid'){
                  e.reply('tabTaskReturn', obj.result) ;
                }
              })
              response.on('end', () => {})
          })
              request.on('error', (error) => { 
              log.info('Error while fetching task detail'+`${(error)}`)
          })
          request.setHeader('Content-Type', 'application/json'); 
          request.write(body, 'utf-8'); 
          request.end();
        }else if(form_data['tabName'] == 'asset'){

          var body = JSON.stringify({ "funcType": 'assetDetail', "clientID": form_data['clientid'] }); 
          const request = net.request({ 
              method: 'POST', 
              url: root_url+'/asset.php' 
          }); 
          request.on('response', (response) => {
              //console.log(`STATUS: ${response.statusCode}`)
              response.on('data', (chunk) => {
                //console.log(`${chunk}`);
                var obj = JSON.parse(chunk);
                 if(obj.status == 'valid'){
                   e.reply('tabAssetReturn', obj.result[0]) ;
                 }
              })
              response.on('end', () => {})
          })
          request.on('error', (error) => { 
              log.info('Error while fetching asset detail '+`${(error)}`)
          })
          request.setHeader('Content-Type', 'application/json'); 
          request.write(body, 'utf-8'); 
          request.end();
          
        }else if(form_data['tabName'] == 'user'){

          var body = JSON.stringify({ "funcType": 'userDetail', "clientID": form_data['clientid'] }); 
          const request = net.request({ 
              method: 'POST', 
              url: root_url+'/user.php' 
          }); 
          request.on('response', (response) => {
              //console.log(`STATUS: ${response.statusCode}`)
              response.on('data', (chunk) => {
                //console.log(`${chunk}`);
                var obj = JSON.parse(chunk);
                 if(obj.status == 'valid'){
                   if(obj.result[0][2] == ''){
                      obj.result[0][2] = 'Not Available';
                    }

                    if(obj.result[0][3] == ''){
                      obj.result[0][3] = 'Not Available';
                    }

                  e.reply('tabUserReturn', obj.result[0]);
                 }
              })
              response.on('end', () => {})
          })
          request.on('error', (error) => { 
              log.info('Error while fetching user detail '+`${(error)}`)
          })
          request.setHeader('Content-Type', 'application/json'); 
          request.write(body, 'utf-8'); 
          request.end();
          
        }else if(form_data['tabName'] == 'usage'){
           e.reply('tabUtilsReturn', '') ;
        }else if(form_data['tabName'] == 'app'){ 
           session.defaultSession.cookies.get({ url: 'http://www.eprompto.com' })
             .then((cookies1) => {
              if(cookies1.length > 0){
                request({
                uri: root_url+"/utilisation.php",
                method: "POST",
                form: {
                  funcType: 'appDetail',
                  sys_key: cookies1[0].name,
                  from_date: form_data['from'],
                  to_date: form_data['to']
                }
              }, function(error, response, body) { 
                if(error){
                  log.info('Error while fetching app detail '+error);
                }else{
                  if(body != '' || body != null){ 
                    output = JSON.parse(body); 
                    if(output.status == 'valid'){ 
                      e.reply('tabAppReturn', output.result) ;
                    }else if(output.status == 'invalid'){
                      e.reply('tabAppReturn', output.result) ;
                    }
                  }
                }
              });
              }
          }).catch((error) => {
            console.log(error)
          })
        
        }else if(form_data['tabName'] == 'quick_util'){ 
          var result = [];
          const cpu = osu.cpu;
          const disks = nodeDiskInfo.getDiskInfoSync();

          total_ram = (os.totalmem()/(1024*1024*1024)).toFixed(1);
          free_ram = (os.freemem()/(1024*1024*1024)).toFixed(1);
          utilised_RAM = (total_ram - free_ram).toFixed(1);
          
          result['total_ram'] = total_ram;
          result['used_ram'] = utilised_RAM;

          hdd_total = hdd_used = 0;
          hdd_name = '';

          for (const disk of disks) {
               if(disk.filesystem == 'Local Fixed Disk'){
                 hdd_total = hdd_total + disk.blocks;
                 hdd_used = hdd_used + disk.used;
                 used_drive = (disk.used/(1024*1024*1024)).toFixed(2); 
                 hdd_name = hdd_name.concat(disk.mounted+' '+used_drive+'  GB/ ');
             }
                
          }

          hdd_total = (hdd_total/(1024*1024*1024)).toFixed(1);
          hdd_used = (hdd_used/(1024*1024*1024)).toFixed(1);

          result['hdd_total'] = hdd_total;
          result['hdd_used'] = hdd_used;
          result['hdd_name'] = hdd_name;

          
          cpu.usage()
            .then(info => { 

              if(info == 0){
                info = 1;
              }

              result['cpu_usage'] = info;
              e.reply('setInstantUtil',result);
          })
        }
      }
  }).catch((error) => {
      console.log(error)
    })
});

ipcMain.on('form_data',function(e,form_data){  
  type = form_data['type']; 
  category = form_data['category'];
  
  loginid = form_data['user_id'];

  calendar_id = 0; //value has to be given
  client_id = form_data['clientid']; //value has to be given
  user_id = form_data['user_id']; //value has to be given
  //engineer_id = "";
  partner_id = 0;
  status_id = 4;
  external_status_id = 6;
  internal_status_id = 5
  issue_type_id ="";
  //is_media = null;
  catgory = 0;
  asset_id = form_data['assetID']; //value has to be given
  //address_id = null;
  description = form_data['desc'];
  ticket_no = Math.floor(Math.random() * (9999 - 10 + 1) + 10);
  resolution_method_id = 1;
  


  if(form_data['disp_type'] == 'PC' ){
    if(type == '1'){
      issue_type_id ="1,13,"+category;
    }else if(type == '2'){
      issue_type_id ="2,15,"+category;
    }else if(type == '3'){
      issue_type_id ="556,557,"+category;
    }
  }
  else if(form_data['disp_type'] == 'WiFi'){
    issue_type_id ="1,13,47,179,"+category;
  }
  else if(form_data['disp_type'] == 'Network'){
    issue_type_id ="1,13,47,"+category;
  }
  else if(form_data['disp_type'] == 'Antivirus'){
    issue_type_id ="1,13,56,156,265,"+category;
  }
  else if(form_data['disp_type'] == 'Application'){
    issue_type_id ="1,13,56,156,"+category;
  }
  else if(form_data['disp_type'] == 'Printers'){
    issue_type_id ="6,22,42,"+category;
  }

  estimated_cost = 0;
  //request_id = null;
  is_offer_ticket = 2;
  is_reminder = 0;
  is_completed = 3;
  res_cmnt_confirm  = 0;
  res_time_confirm  = 0;
  is_accept = 0;
  resolver_wi_step = 0;
  is_partner_ticket = 2;
  created_by = user_id;
  created_on = Math.floor(Date.now() / 1000); 
  updated_by = user_id;
  updated_on = Math.floor(Date.now() / 1000);

  var body = JSON.stringify({ "funcType": 'ticketInsert', "tic_type": form_data['type'], "loginID": loginid, "calender": calendar_id,
    "clientID": client_id, "userID": user_id, "partnerID": partner_id, "statusID": status_id, "exstatusID": external_status_id, "instatusID": internal_status_id,
    "catgory": catgory, "asset_id": asset_id, "desc": description, "tic_no": ticket_no, "resolution": resolution_method_id, "issue_type": issue_type_id, "est_cost": estimated_cost,
    "offer_tic": is_offer_ticket, "reminder": is_reminder, "complete": is_completed, "cmnt_confirm": res_cmnt_confirm, "time_confirm": res_time_confirm,
    "accept": is_accept, "wi_step": resolver_wi_step, "partner_tic": is_partner_ticket }); 
  
  const request = net.request({ 
      method: 'POST', 
      url: root_url+'/ticket.php' 
  }); 
  request.on('response', (response) => {
      //console.log(`STATUS: ${response.statusCode}`)
      response.on('data', (chunk) => {
        //console.log(`${chunk}`);
        var obj = JSON.parse(chunk);
        var result = [];
        if(obj.status == 'valid'){
          global.ticketNo = obj.ticket_no;
          result['status'] = 1;
          result['ticketNo'] = ticketNo;
          e.reply('ticket_submit',result);
        }else{
          result['status'] = 0;
          result['ticketNo'] = '';
          e.reply('ticket_submit',result);
          
        }
      })
      response.on('end', () => {})
  })
  request.on('error', (error) => { 
      log.info('Error while inserting ticket '+`${(error)}`)
  })
  request.setHeader('Content-Type', 'application/json'); 
  request.write(body, 'utf-8'); 
  request.end();

});

ipcMain.on('getUsername',function(e,form_data){ 

  var body = JSON.stringify({ "funcType": 'getusername', "clientID": form_data['clientid'] }); 
  const request = net.request({ 
      method: 'POST', 
      url: root_url+'/user.php' 
  }); 
  request.on('response', (response) => {
      //console.log(`STATUS: ${response.statusCode}`)
      response.on('data', (chunk) => { 
        //console.log(`${chunk}`);
         var obj = JSON.parse(chunk);
         if(obj.status == 'valid'){
           e.reply('returnUsername', obj.result) ;
         }
      })
      response.on('end', () => {})
  })
  request.on('error', (error) => { 
      log.info('Error while fetching user name '+`${(error)}`)
  })
  request.setHeader('Content-Type', 'application/json'); 
  request.write(body, 'utf-8'); 
  request.end();

});

function getIssueTypeData(type,callback){
  
  $query = 'SELECT `estimate_time`,`device_type_id`,`impact_id` FROM `et_issue_type_master` where `it_master_id`="'+type+'"';
  connection.query($query, function(error, results, fields) {
      if (error) {
        return connection.rollback(function() {
          throw error;
        });
      }else{
        callback(null,results);
      }
      
  });
}

function getMaxId($query,callback){
  connection.query($query, function(error, results, fields) {
      if (error) {
        return connection.rollback(function() {
          throw error;
        });
      }else{
        callback(null,results);
      }
      
  });
}

ipcMain.on('openHome',function(e,data){
  display = electron.screen.getPrimaryDisplay();
    width = display.bounds.width;
  mainWindow = new BrowserWindow({
    width: 392,
    height: 520,
    icon: __dirname + '/images/ePrompto_png.png',
    frame: false,
    x: width - 450,
    y: 190,
    webPreferences: {
        nodeIntegration: true,
        enableRemoteModule: true,
    }
  });

  // mainWindow.openDevTools();


  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname,'index.html'),
    protocol: 'file:',
    slashes: true
  }));
  //mainWindow.setMenu(null);

  //categoryWindow.close();
  categoryWindow.on('close', function (e) {
    categoryWindow = null;
  });
});

ipcMain.on('internet_reconnect',function(e,data){ 
  
  session.defaultSession.cookies.get({ url: 'http://www.eprompto.com' })
    .then((cookies) => {
      if(cookies.length > 0){
        SetCron(cookies[0].name);
      }
    }).catch((error) => {
      console.log(error)
    })
    setGlobalVariable();
});

ipcMain.on('getSystemKey',function(e,data){

  var body = JSON.stringify({ "funcType": 'getSysKey' }); 
  const request = net.request({ 
      method: 'POST', 
      url: root_url+'/login.php'    
  }); 
  request.on('response', (response) => {
      //console.log(`STATUS: ${response.statusCode}`)
      response.on('data', (chunk) => {
        var obj = JSON.parse(chunk);
        if(obj.sys_key != '' || obj.sys_key != null){
          e.reply('setSysKey', obj.sys_key);
        }
      })
      response.on('end', () => {})
  })
  request.on('error', (error) => { 
      log.info('Error while fetching system key '+`${(error)}`)
  })
  request.setHeader('Content-Type', 'application/json'); 
  request.write(body, 'utf-8'); 
  request.end();

});

ipcMain.on('loadAllocUser',function(e,data){ 

  var body = JSON.stringify({ "funcType": 'getAllocUser', "userID": data.userID }); 
  const request = net.request({ 
      method: 'POST', 
      url: root_url+'/login.php' 
  }); 
  request.on('response', (response) => {
      //console.log(`STATUS: ${response.statusCode}`)
      response.on('data', (chunk) => {
        var obj = JSON.parse(chunk);
        if(obj.status == 'valid'){
          e.reply('setAllocUser', obj.result);
        }else{
          e.reply('setAllocUser', '');
        }
      })
      response.on('end', () => {})
  })
  request.on('error', (error) => { 
      log.info('Error while getting allocated user detail '+`${(error)}`)
  })
  request.setHeader('Content-Type', 'application/json'); 
  request.write(body, 'utf-8'); 
  request.end();

});

ipcMain.on('login_data',function(e,data){ 

  // console.log(data); // comment out
  var system_ip = ip.address();
  var asset_id = "";
  var machineId = uuid.machineIdSync({original: true});
  hdd_total = 0;
    RAM = (os.totalmem()/(1024*1024*1024)).toFixed(1);
    const disks = nodeDiskInfo.getDiskInfoSync();

    for (const disk of disks) {
        if(disk.filesystem == 'Local Fixed Disk'){
           hdd_total = hdd_total + disk.blocks;
        }
    }
    hdd_total = hdd_total/(1024*1024*1024);

    var body = JSON.stringify({ "funcType": 'loginFunc', "userID": data.userId,
      "sys_key": data.system_key, "dev_type": data.device_type, "ram" : RAM, "hdd_capacity" : hdd_total,
      "machineID" : machineId, "title": data.title, "user_fname": data.usr_first_name, "user_lname": data.usr_last_name,
      "user_email": data.usr_email,"user_mob_no": data.usr_contact,"token": data.token,"client_no": data.clientno,"ip": system_ip }); 
    const request = net.request({ 
        method: 'POST', 
        url: root_url+'/login.php' 
    }); 
    request.on('response', (response) => {
        //console.log(`STATUS: ${response.statusCode}`)
        response.on('data', (chunk) => {
          // console.log(`${chunk}`); // comment out
          var obj = JSON.parse(chunk);
          if(obj.status == 'valid'){
            const cookie = {url: 'http://www.eprompto.com', name: data.system_key, value: data.system_key, expirationDate:9999999999 }
            session.defaultSession.cookies.set(cookie, (error) => {
              if (error) console.error(error)
            })

            fs.writeFile(detail, data.system_key, function (err) {
              if (err) return console.log(err);
            });

            global.clientID = obj.result;
            global.userName = obj.loginPass[0];
            global.loginid = obj.loginPass[1];
            asset_id = obj.asset_maxid;
            updateAsset(asset_id);
            //addAssetUtilisation(output.asset_maxid,output.result[0]);
            global.deviceID = data.device_type;
   
            mainWindow = new BrowserWindow({
              width: 392,
              height: 520,
              icon: __dirname + '/images/ePrompto_png.png',
              frame: false,
              x: width - 450,
                y: 190,
              webPreferences: {
                    nodeIntegration: true,
                    enableRemoteModule: true,
                }
            });

            // mainWindow.openDevTools();


            mainWindow.setMenuBarVisibility(false);

            mainWindow.loadURL(url.format({
              pathname: path.join(__dirname,'index.html'),
              protocol: 'file:',
              slashes: true
            }));

            child = new BrowserWindow({ 
              parent: mainWindow,
              icon: __dirname + '/images/ePrompto_png.png', 
              modal: true, 
              show: true,
              width: 370,
              height: 100,
              frame: false,
              x: width - 450,
                  y: 190,
              webPreferences: {
                      nodeIntegration: true,
                      enableRemoteModule: true,
                  }
            });

            child.setMenuBarVisibility(false);

            child.loadURL(url.format({
              pathname: path.join(__dirname,'modal.html'),
              protocol: 'file:',
              slashes: true
            }));
            child.once('ready-to-show', () => {
              child.show()
            });

              
            loginWindow.close();
            // loginWindow.on('close', function (e) {
            //   loginWindow = null;
            // });

            tray.on('click', function(e){
                if (mainWindow.isVisible()) {
                  mainWindow.hide();
                } else {
                  mainWindow.show();
                }
            });

            mainWindow.on('close', function (e) {
            // if (process.platform !== "darwin") {
              app.quit();
            // }
            // // if (electron.app.isQuitting) {
            // //  return
            // // }
            // e.preventDefault()
            // mainWindow.hide()
            // // if (child.isVisible()) {
            // //     child.hide()
            // //   } 
            // //mainWindow = null;
           });
          }
        })
        response.on('end', () => {})
    })
    request.on('error', (error) => { 
      log.info('Error in login function '+`${(error)}`);
    })
    request.setHeader('Content-Type', 'application/json'); 
    request.write(body, 'utf-8'); 
    request.end();

});


ipcMain.on('create_new_member',function(e,form_data){  
  regWindow = new BrowserWindow({
    width: 392,
    height: 520,
    icon: __dirname + '/images/ePrompto_png.png',
    //frame: false,
    x: width - 450,
        y: 190,
    webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
        }
  });

  regWindow.setMenuBarVisibility(false);

  regWindow.loadURL(url.format({
    pathname: path.join(__dirname,'new_member.html'),
    protocol: 'file:',
    slashes: true
  }));

  startWindow.close();
  // startWindow.on('close', function (e) {
  //   startWindow = null;
  // });

});

ipcMain.on('cancel_reg',function(e,form_data){  
  startWindow = new BrowserWindow({
    width: 392,
    height: 520,
    icon: __dirname + '/images/ePrompto_png.png',
    //frame: false,
    x: width - 450,
        y: 190,
    webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
        }
  });

  startWindow.setMenuBarVisibility(false);

  startWindow.loadURL(url.format({
    pathname: path.join(__dirname,'are_you_member.html'),
    protocol: 'file:',
    slashes: true
  }));

  regWindow.close();
  // regWindow.on('close', function (e) {
  //   regWindow = null;
  // });
});

ipcMain.on('update_member',function(e,form_data){  
  loginWindow = new BrowserWindow({
    width: 392,
    height: 520,
    icon: __dirname + '/images/ePrompto_png.png',
    //frame: false,
    x: width - 450,
        y: 190,
    webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
        }
  });

  loginWindow.setMenuBarVisibility(false);

  loginWindow.loadURL(url.format({
    pathname: path.join(__dirname,'login.html'),
    protocol: 'file:',
    slashes: true
  }));

  startWindow.close();
  // startWindow.on('close', function (e) {
  //   startWindow = null;
  // });
});

ipcMain.on('cancel_login',function(e,form_data){  
  startWindow = new BrowserWindow({
    width: 392,
    height: 520,
    icon: __dirname + '/images/ePrompto_png.png',
    //frame: false,
    x: width - 450,
        y: 190,
    webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
        }
  });

  startWindow.setMenuBarVisibility(false);

  startWindow.loadURL(url.format({
    pathname: path.join(__dirname,'are_you_member.html'),
    protocol: 'file:',
    slashes: true
  }));

  loginWindow.close();
  // loginWindow.on('close', function (e) {
  //   //loginWindow = null;
  //   if(process.platform != 'darwin')
 //        app.quit();
  // });
});

ipcMain.on('check_email',function(e,form_data){ 
  
  var body = JSON.stringify({ "funcType": 'checkemail', "email": form_data['email'] }); 
  const request = net.request({ 
      method: 'POST', 
      url: root_url+'/login.php' 
  }); 
  request.on('response', (response) => {
      //console.log(`STATUS: ${response.statusCode}`)
      response.on('data', (chunk) => {
        var obj = JSON.parse(chunk);
        if(obj.status == 'valid'){
          e.reply('checked_email', obj.status);
        }else if(obj.status == 'invalid'){
          e.reply('checked_email', obj.status);
        }
      })
      response.on('end', () => {})
  })
  request.on('error', (error) => { 
    log.info('Error n login function '+`${(error)}`)
  })
  request.setHeader('Content-Type', 'application/json'); 
  request.write(body, 'utf-8'); 
  request.end();

});

ipcMain.on('check_user_email',function(e,form_data){ 
  
  var body = JSON.stringify({ "funcType": 'check_user_email', "email": form_data['email'], "parent_id": form_data['parent_id'] }); 
  const request = net.request({ 
      method: 'POST', 
      url: root_url+'/login.php' 
  }); 
  request.on('response', (response) => {
      //console.log(`STATUS: ${response.statusCode}`)
      response.on('data', (chunk) => {
        var obj = JSON.parse(chunk);
        if(obj.status == 'valid'){
          e.reply('checked_user_email', obj.status);
        }else if(obj.status == 'invalid'){
          e.reply('checked_user_email', obj.status);
        }
      })
      response.on('end', () => {})
  })
  request.on('error', (error) => { 
    log.info('Error n login function '+`${(error)}`)
  })
  request.setHeader('Content-Type', 'application/json'); 
  request.write(body, 'utf-8'); 
  request.end();
    
});

ipcMain.on('check_member_email',function(e,form_data){ 

  var body = JSON.stringify({ "funcType": 'checkmemberemail', "email": form_data['email'] }); 
  const request = net.request({ 
      method: 'POST', 
      url: root_url+'/login.php'   
  }); 
  request.on('response', (response) => {
      //console.log(`STATUS: ${response.statusCode}`)
      response.on('data', (chunk) => {
        var obj = JSON.parse(chunk);
        if(obj.status == 'valid'){
          e.reply('checked_member_email', obj);
        }else if(obj.status == 'invalid'){
          e.reply('checked_member_email', obj);
        }
      })
      response.on('end', () => {})
  })
  request.on('error', (error) => { 
    log.info('Error while checking member email '+`${(error)}`)
  })
  request.setHeader('Content-Type', 'application/json'); 
  request.write(body, 'utf-8'); 
  request.end();
  
});

ipcMain.on('member_registration',function(e,form_data){ 
  var system_ip = ip.address();
  RAM = (os.totalmem()/(1024*1024*1024)).toFixed(1);
  const disks = nodeDiskInfo.getDiskInfoSync();
  hdd_total = 0;
  
  for (const disk of disks) {
      if(disk.filesystem == 'Local Fixed Disk'){
         hdd_total = hdd_total + disk.blocks;
      }
  }
  hdd_total = hdd_total/(1024*1024*1024);

  var body = JSON.stringify({ "funcType": 'member_register', "title": form_data['title'], "first_name": form_data['mem_first_name'], "last_name": form_data['mem_last_name'],
    "email": form_data['mem_email'], "contact": form_data['mem_contact'], "company": form_data['mem_company'], "dev_type": form_data['device_type'], "ip": system_ip,
    "ram": RAM, "hdd_capacity" : hdd_total, "otp": form_data['otp']}); 
  const request = net.request({ 
      method: 'POST', 
      url: root_url+'/login.php'   
  }); 
  request.on('response', (response) => {
      //console.log(`STATUS: ${response.statusCode}`)
      response.on('data', (chunk) => {
        var obj = JSON.parse(chunk);
        if(obj.status == 'valid'){ 
          global.clientID = obj.result;
          global.userName = obj.loginPass[0];
            global.loginid = obj.loginPass[1];
            asset_id = obj.asset_maxid;
            global.NetworkStatus = 'Yes';
            global.assetID = asset_id;
            global.sysKey = obj.sysKey;
            updateAsset(asset_id);
            //addAssetUtilisation(output.asset_maxid,output.result[0]);
            const cookie = {url: 'http://www.eprompto.com', name: obj.sysKey , value: obj.sysKey, expirationDate:9999999999 }
          session.defaultSession.cookies.set(cookie, (error) => {
            if (error) console.error(error)
          })

          fs.writeFile(detail, obj.sysKey, function (err) {
            if (err) return console.log(err);
          });

          global.deviceID = form_data['device_type'];

          mainWindow = new BrowserWindow({
            width: 392,
            height:520,
            icon: __dirname + '/images/ePrompto_png.png',
            frame: true,
            x: width - 450,
              y: 190,
            webPreferences: {
                  nodeIntegration: true,
                  enableRemoteModule: true,
              }
          });

          mainWindow.setMenuBarVisibility(false);

          mainWindow.loadURL(url.format({
            pathname: path.join(__dirname,'index.html'),
            protocol: 'file:',
            slashes: true
          }));

          child = new BrowserWindow({ 
            parent: mainWindow,
            icon: __dirname + '/images/ePrompto_png.png', 
            modal: true, 
            show: true,
            width: 380,
            height: 100,
            frame: false,
            x: width - 450,
                y: 190,
            webPreferences: {
                    nodeIntegration: true,
                    enableRemoteModule: true,
                }
          });

          child.setMenuBarVisibility(false);

          child.loadURL(url.format({
            pathname: path.join(__dirname,'modal.html'),
            protocol: 'file:',
            slashes: true
          }));
          child.once('ready-to-show', () => {
            child.show()
          });
              
          regWindow.close();
         
          tray.on('click', function(e){
              if (mainWindow.isVisible()) {
                mainWindow.hide()
              } else {
                mainWindow.show()
              }
          });

          mainWindow.on('close', function (e) {
            // if (process.platform !== "darwin") {
              app.quit();
            // }
          });
        }else if(obj.status == 'wrong_otp'){
          e.reply('otp_message', 'OTP entered is wrong');
        }
     
      })
      response.on('end', () => {})
  })
  request.on('error', (error) => { 
    log.info('Error n member registration function '+`${(error)}`);
    require('dns').resolve('www.google.com', function(err) {
      if (err) {
        e.reply('error_message', 'No internet connection');
      } else {
        e.reply('error_message', 'Request not completed');
      }
      global.NetworkStatus = 'No';
    });
  })
  request.setHeader('Content-Type', 'application/json'); 
  request.write(body, 'utf-8'); 
  request.end();



});

ipcMain.on('check_forgot_email',function(e,form_data){ 

  request({
    uri: root_url+"/login.php",
    method: "POST",
    form: {
      funcType: 'check_forgot_cred_email',
      email: form_data['email']
    }
  }, function(error, response, body) { 
    output = JSON.parse(body); 
    e.reply('checked_forgot_email', output.status);
  });
});

ipcMain.on('sendOTP',function(e,form_data){ 
  
  var body = JSON.stringify({ "funcType": 'sendOTP', "email": form_data['emailID'], "mem_name": form_data['name'] }); 
  const request = net.request({ 
      method: 'POST', 
      url: root_url+'/login.php' 
  }); 
  request.on('response', (response) => {
      //console.log(`STATUS: ${response.statusCode}`)
      response.on('data', (chunk) => {
        //console.log(`${chunk}`);
        var obj = JSON.parse(chunk);
        e.reply('sendOTP_status', obj.status);
      })
      response.on('end', () => {})
  })
  request.on('error', (error) => { 
      log.info('Error while sending OTP '+`${(error)}`) 
  })
  request.setHeader('Content-Type', 'application/json'); 
  request.write(body, 'utf-8'); 
  request.end();

});


ipcMain.on('forgot_cred_email_submit',function(e,form_data){ 
//not used
  request({
    uri: root_url+"/check_clientno.php",
    method: "POST",
    form: {
      funcType: 'forgot_cred_email',
      email: form_data['email']
    }
  }, function(error, response, body) { 
    output = JSON.parse(body); 
    e.reply('forgot_cred_email_submit_response', output.status);
    //forgotWindow.close();
    
  });

});

ipcMain.on('ticketform',function(e,form_data){ 
  ticketWindow = new BrowserWindow({
    width: 392,
    height: 520,
    icon: __dirname + '/images/ePrompto_png.png',
    x: width - 450,
    y: 190,
    webPreferences: {
            nodeIntegration: true
        }
  });

  ticketWindow.setMenuBarVisibility(false);

  ticketWindow.loadURL(url.format({
    pathname: path.join(__dirname,'category/pc_laptop.html'),
    protocol: 'file:',
    slashes: true
  }));

  ticketWindow.webContents.on('did-finish-load', ()=>{
    ticketWindow.webContents.send('device_type_ticket', form_data['issueType']);
  });

  mainWindow.close();
  // mainWindow.on('close', function (e) {
  //   mainWindow = null;
  // });

});

ipcMain.on('back_to_main',function(e,form_data){ 

  mainWindow = new BrowserWindow({
    width: 392,
    height: 520,
    icon: __dirname + '/images/ePrompto_png.png',
    x: width - 450,
    y: 190,
    webPreferences: {
            nodeIntegration: true
        }
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname,'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  ticketWindow.close();
  // ticketWindow.on('close', function (e) {
  //   //ticketWindow = null;
  //   if(process.platform != 'darwin')
 //        app.quit();
  // });

});

ipcMain.on('thank_back_to_main',function(e,form_data){ 

  mainWindow = new BrowserWindow({
    width: 392,
    height: 520,
    icon: __dirname + '/images/ePrompto_png.png',
    x: width - 450,
    y: 190,
    webPreferences: {
            nodeIntegration: true
        }
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname,'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  categoryWindow.close();
  // categoryWindow.on('close', function (e) {
  //   categoryWindow = null;
  // });

});

ipcMain.on('update_is_itam_policy',function(e,form_data){ 

  var body = JSON.stringify({ "funcType": 'update_itam_policy', "clientId": form_data['clientID'] }); 
  const request = net.request({ 
      method: 'POST', 
      url: root_url+'/main.php' 
  }); 
  request.on('response', (response) => {
      //console.log(`STATUS: ${response.statusCode}`)
      response.on('data', (chunk) => {
        //console.log(`${chunk}`);
        var obj = JSON.parse(chunk);
        if(obj.status == 'invalid'){
          log.info('Error occured on updating itam policy');
        }
      })
      response.on('end', () => {})
  })
  request.on('error', (error) => { 
    log.info('Error occured on updating client master '+`${(error)}`);
  })
  request.setHeader('Content-Type', 'application/json'); 
  request.write(body, 'utf-8'); 
  request.end();

});

app.on('window-all-closed', function () {
  // if (process.platform != 'darwin') {
    app.quit();
  // }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on('app_version', (event) => {
  event.sender.send('app_version', { version: app.getVersion() });
});

autoUpdater.on('error', (err) => {
  log.info("autoupdater error"+err);
});


autoUpdater.on('update-not-available', (info) => {
  log.info("autoupdater update-not-available event"+info);
})




//autoUpdater.on('update-downloaded', () => {
  //updateDownloaded = true;
  //mainWindow.webContents.send('update_downloaded');
//});

// ipcMain.on('restart_app', () => {
//   autoUpdater.quitAndInstall();
// });

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall();

});

ipcMain.on('Task_Manager_Main',function(e,form_data,task_type_call) {
  // console.log("Task_Manager_Main Type: "+task_type_call);
  
    require('dns').resolve('www.google.com', function(err) {
      if (err) {
          console.log("No connection");
      } else {
        session.defaultSession.cookies.get({ url: 'http://www.eprompto.com' })
        .then((cookies) => {
        if(cookies.length > 0){
          var body = JSON.stringify({ "funcType": 'getTaskManagerList',"sys_key": cookies[0].name,"task_type_call":task_type_call}); 
          const request = net.request({ 
              method: 'POST', 
              url: root_url+'/task_manager.php' 
          }); 
        request.on('response', (response) => {
            
            response.on('data', (chunk) => {
              // console.log(`${chunk}`);         // comment out
              var obj = JSON.parse(chunk);
              if(obj.status == 'valid'){
                
                const output_data = [];
                output_data['mapping_id'] = obj.result.mapping_id;
                output_data['task_id']   = obj.result.task_id;    
                output_data['task_type']   = obj.result.task_type;    
                output_data['custom_title']   = obj.result.custom_title;
                output_data['custom_description']   = obj.result.custom_description;
                output_data['task_title']   = obj.result.task_title;
                output_data['task_description']   = obj.result.task_description;
                output_data['task_priority']   = obj.result.task_priority;
                output_data['task_status']   = obj.result.task_status;
                output_data['task_department']   = obj.result.task_department; // department_id
                output_data['task_start_date']   = obj.result.task_start_date;
                output_data['task_due_date']   = obj.result.task_due_date; 
                output_data['task_updated_status']   = obj.result.task_updated_status; 
                output_data['task_remark']   = obj.result.task_remark;               
                output_data['asset_id']   = obj.result.asset_id;    
                output_data['userid']   = obj.result.userid;    
                output_data['clientid']   = obj.result.clientid; // the user's own clientid , not external clients from task manager
               


                if (!!obj.result.task_title) {
                  output_data['task_title']   = obj.result.task_title;
                  output_data['task_description']   = obj.result.task_description;
                }else{
                  output_data['task_title']   = obj.result.custom_title;
                  output_data['task_description']   = obj.result.custom_description;                                
                }

                console.log(output_data); // comment out

                  if (task_type_call == 'one-time'){
                  Task_Manager_Notification('New Task', output_data);                             
                  }
                  if (task_type_call == 'recurring'){
                  Task_Manager_Notification('New Task', output_data);                             
                  }                
                  if (task_type_call == 'to_be_overdue'){
                  Task_Manager_Notification('to_be_overdue', output_data);                             
                  }                
                  if (task_type_call == 'overdue'){
                  Task_Manager_Notification('overdue', output_data);                             
                  }                
              }
            })
            response.on('end', () => {});
        })
        request.on('error', (error) => { 
            console.log(`ERROR: ${(error)}`);
        })
        request.setHeader('Content-Type', 'application/json'); 
        request.write(body, 'utf-8'); 
        request.end();
      }
    });
    };
    });
  // }});
})



function Task_Manager_Notification(Task_Type,output_res=[]){  

  console.log("Inside Task_Manager_Notification function :");
  
  console.log(Task_Type);

  if(Task_Type == 'New Task'){    

    title = 'New Task: '+output_res['task_title']     
    body = 'Date Range: '+output_res['task_start_date']+' - '+output_res['task_due_date'] +'\n'+'Description: '+output_res['task_description']+'\n'+'Click to Accept This Task.';

  notification = new Notification({title ,body});

  notification.show();

  notification.on('click', (event, arg)=>{
    console.log("clicked")
            output_res['task_status'] = 'In-Progress';
            output_res['task_remark'] = 'Task In-Progress.';
            updateTaskManager(output_res);
  });

  }
  if(Task_Type == 'to_be_overdue'){    
        
    title = 'Task Due Reminder : '+output_res['task_title']+' '+output_res['task_title'];
    body = 'Date Range: '+output_res['task_start_date']+' - '+output_res['task_due_date'] +'\n'+'Description: '+output_res['task_description'];

    notification = new Notification({title ,body});

    notification.show();
  
    notification.on('click', (event, arg)=>{
      console.log("clicked")
              output_res['task_status'] = 'In-Progress';
              output_res['task_remark'] = 'Task In-Progress.';
              updateTaskManager(output_res);
    });
  
    }
  if(Task_Type == 'overdue'){    
        
    title = 'Task Overdue : '+output_res['task_title']+' '+output_res['task_title'];
    body = 'Date Range: '+output_res['task_start_date']+' - '+output_res['task_due_date'] +'\n'+'Description: '+output_res['task_description'];

      
    notification = new Notification({title ,body});

    notification.show();

    notification.on('click', (event, arg)=>{
      console.log("clicked")
              output_res['task_status'] = 'In-Progress';
              output_res['task_remark'] = 'Task In-Progress.';
              updateTaskManager(output_res);
    });

    }
}


// for failed scripts
function updateTaskManager(output_res=[]){
  console.log("Inside updateTaskManager function");
  console.log(output_res);

  var body = JSON.stringify({ "funcType": 'updateActivity',
                              // "result_data" : output_res['result_data'],
                              "asset_id" : output_res['asset_id'],
                              "task_id" : output_res['task_id'],
                              "userid" : output_res['userid'],
                              "task_status" : output_res['task_status'],
                              "task_remark" : output_res['task_remark']                                                               
                            }); 
  const request = net.request({ 
      method: 'POST', 
      url: root_url+'/task_manager.php' 
  }); 
  request.on('response', (response) => {
      // console.log(response);
      //console.log(`STATUS: ${response.statusCode}`)
      response.on('data', (chunk) => {
        console.log(`${chunk}`);   
        // console.log(chunk);
      })
      response.on('end', () => {        
      });
  })
  request.on('error', (error) => { 
      log.info('Error while updating PM outputs '+`${(error)}`) 
  })
  request.setHeader('Content-Type', 'application/json'); 
  request.write(body, 'utf-8'); 
  request.end();

};

ipcMain.on('Task_Tab_Update',function(e,form_data){ 

  var body = JSON.stringify({ "funcType": 'Task_Tab_Update', "global_sys_key": global.sysKey, "form_data": form_data}); 
  const request = net.request({ 
      method: 'POST', 
      url: root_url+'/task_manager.php' 
  }); 
  request.on('response', (response) => {
      //console.log(`STATUS: ${response.statusCode}`)
      response.on('data', (chunk) => {
        console.log(`${chunk}`);
        var obj = JSON.parse(chunk);
        if(obj.status == 'success'){
          log.info('Data Updated Sucesfully');
        }
        if(obj.status == 'failed'){
          log.info('Error occured on updating itam policy');
        }
      })
      response.on('end', () => {})
  })
  request.on('error', (error) => { 
    log.info('Error occured on updating client master '+`${(error)}`);
  })
  request.setHeader('Content-Type', 'application/json'); 
  request.write(body, 'utf-8'); 
  request.end();
});


