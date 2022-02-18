<script>window.$ = window.jQuery = require('jquery');</script>
<script>
      const electron = require('electron');
      const {ipcRenderer} = electron;
      const {BrowserWindow} = require('electron').remote;
      const {remote} = require('electron');
      const root_url = remote.getGlobal('root_url');

      const form = document.querySelector('form');
      form.addEventListener('submit',submitForm);

      function submitForm(e){
        e.preventDefault();
          
          var condition = navigator.onLine ? "ONLINE" : "OFFLINE";             
          var error_message = document.getElementById("error_message"); 
          if(condition == 'OFFLINE'){
            error_message.innerHTML = 'No internet connection';
            return false;
          }else{
            error_message.innerHTML = '';
          }

          var sys_key = document.querySelector('#sys_key').value;
          var user_id = document.querySelector('#alloc_users').value; 
          var dev_type = document.querySelector('#device_type').value;
          var client_no = document.querySelector('#client_no').value;
          var token = document.querySelector('#token').value;
          var title_type = document.querySelector('#title_type').value;
          var user_first_name = document.querySelector('#user_first_name').value;
          var user_last_name = document.querySelector('#user_last_name').value;
          var user_email = document.querySelector('#user_email').value;
          var user_contact_no = document.querySelector('#user_contact_no').value;
          document.getElementById('all-loader').style.display='block';
          if(sys_key != '' && user_id != '' && dev_type != '' ){ 
            const input_values = {
              system_key: sys_key, 
              userId : user_id,
              clientno: client_no,
              token: token,
              title: title_type,
              usr_first_name: user_first_name,
              usr_last_name: user_last_name,
              usr_email: user_email,
              usr_contact: user_contact_no,
              device_type : dev_type
            };
            
            ipcRenderer.send('login_data',input_values);
            document.login_form.reset();
          }
        
      }

      function getSystemKey(){ 
        var system_key = Math.floor(Math.random() * (999999 - 10 + 1) + 10); 
        var final_key = 'ePrompt'+system_key;
        
        $.ajax({
            url: root_url+'/check_clientno.php',
            type: 'POST',
            data: {funcType:'checkSysKey',final_key: final_key},
            success: function (data) {
               output = JSON.parse(JSON.stringify(data));
               if(output.status == 'valid'){
                 document.getElementById('sys_key').value = final_key;
               }else{
                  getSystemKey();
               }
            },
            error: function (xhr, status, error) {
                console.log('Error: ' + error.message);
            }
        });

      }

      function loadDevType(isCloudUser){ 
        var select = document.getElementById("device_type");
        document.getElementById("device_type").options.length = 0;
        var options = new Array();
        if(isCloudUser == 'yes'){
     // assign device type id s it is needed in asset table
          options[0] = {name:"Laptop",value: 4};
          options[1] = {name:"Desktop",value: 6};
          //options[2] = {name:"Server",value: 7};
          options[2] = {name:"Cloud Server",value: 16};

        }else{
         options[0] = {name:"Laptop",value: 4};
         options[1] = {name:"Desktop",value: 6};
        }
      
        for (var i = 0; i < options.length; i++) {
          var el = document.createElement("option");
          el.textContent = options[i].name;
          el.value = options[i].value;
          select.appendChild(el);
        }
      }

      function validate(){ 

        var condition = navigator.onLine ? "ONLINE" : "OFFLINE";             
        var error_message = document.getElementById("error_message"); 
        if(condition == 'OFFLINE'){
          error_message.innerHTML = 'No internet connection';
          return false;
        }else{
          error_message.innerHTML = '';
        }

        var email = document.getElementById('member_email_id').value; 
        document.getElementById('err_member_email_id').innerText = '';
        if(email != ''){
          
          var vali_btn_suc =  document.getElementById('btn_validate');
          vali_btn_suc.setAttribute('style', 'display:none !important');
          const input_values = {
             email: email
          };
          ipcRenderer.send('check_member_email',input_values);
        }else{
          document.getElementById('err_member_email_id').innerText = 'Member Email Id Required';
        }
      }
      // function validate(){ 
      //   client_no = document.getElementById('client_no').value;
      //   token = document.getElementById('token').value;

      //   if(client_no != "" && token != ""){
      //     $.ajax({
      //         url: root_url+'/check_clientno.php',
      //         type: 'POST',
      //         data: {funcType: 'checkValidity',clientNum: client_no,Token: token},
      //         success: function (data) { console.log(data);
      //           console.log(data.status);
      //           console.log(data.result[0]);
      //           output = JSON.parse(JSON.stringify(data));
      //           //output = JSON.parse(JSON.stringify(data)); console.log(output);
      //           if(output.status == 'valid'){
      //             user_id = output.result; 
      //             loadAllocUser(user_id[0]);
      //             if(user_id[1] == '2' && user_id[2] == '5'){
      //               loadDevType('yes');
      //             }else{
      //               loadDevType('no');
      //             }
      //             document.getElementById('after_validate').style.display='block';
      //             document.getElementById('allocate_user').style.display='block';
      //           }else{
      //             console.log('invalid');
      //             var select = document.getElementById("alloc_users");
      //             var length = select.options.length;
      //             for (i = length-1; i >= 0; i--) {
      //               select.options[i] = null;
      //             }
      //             window.location = 'invalid.html';
      //           }
      //         },
      //         error: function (xhr, status, error) {
      //             console.log('Error: ' + error.message);
      //         }
      //     });
      //   }

      // }

      // function forgotCredential(){
      //   const input_values = {};
      //   ipcRenderer.send('forgot_credential',input_values);
      // }

      function IsChecked(){
        var checkBox = document.getElementById("is_parent_email");
        if (checkBox.checked == true){
          document.getElementById("user_email").value = document.getElementById("member_email_id").value;
        } else {
          document.getElementById("user_email").value = '';
        }
      }

      function checkDuplication(email){ console.log(email);
         var parent_user_id = document.getElementById("parent_id").value;
         const input_values = {
           email: email,
           parent_id: parent_user_id
         };
         ipcRenderer.send('check_user_email',input_values);
      }

      function backToMain(){
         const input_values = {};
         ipcRenderer.send('cancel_login',input_values);
      }

      function checkNewUser(val){
        if(val == 'new'){
          document.getElementById("user_first_name").required = true;
          document.getElementById("user_last_name").required = true;
          // document.getElementById("user_email").required = true;
          document.getElementById("user_contact_no").required = true;
          document.getElementById('new_user_form').style.display="block";
        }else{
          document.getElementById("user_first_name").required = false;
          document.getElementById("user_last_name").required = false;
          // document.getElementById("user_email").required = false;
          document.getElementById("user_contact_no").required = false;
          document.getElementById('new_user_form').style.display="none";
        }
      }

      ipcRenderer.on('checked_user_email', (event, data) => { 
        if(data == 'invalid'){
          document.getElementById("err_user_email").innerText = 'Email Id already exist';
          document.getElementById("user_email").value = "";
        }else{
          document.getElementById("err_user_email").innerText = '';
        }
      });

       ipcRenderer.on('checked_member_email', (event, data) => { 
        if(data.status == 'invalid'){
          document.getElementById("err_member_email_id").innerText = 'Email Id does not exist';
          var vali_btn_err =  document.getElementById('btn_validate');
          vali_btn_err.setAttribute('style', 'display:block !important');
          //document.getElementById("member_email_id").value = "";
        }else{ 
          document.getElementById("err_member_email_id").innerText = '';
          document.getElementById("parent_id").value = data.user_id;
          document.getElementById("client_no").value = data.client_no;
          document.getElementById("token").value = data.token;
          loadAllocUser(data.user_id);
          if(data.user_type == '2' && data.member_type == '5'){
            loadDevType('yes');
          }else{
            loadDevType('no');
          }
          document.getElementById('after_validate').style.display='block';
          document.getElementById('allocate_user').style.display='block';
        }
      });
</script>