'use strict';

var g_uin = 0;

window.addEventListener('message', 
    function (evt){
        var data = {};
        try{
            data = JSON.parse(evt.data);
        }
        catch (e){}
        var dataType = data.type;
        if(dataType){
            if(dataType == 'login'){
                g_uin = data.uin + '';
                chrome.runtime.sendMessage({'cmd': 'showBrowserIcon'});
            }
            else if(dataType == 'logout'){
                g_uin = '';
                chrome.runtime.sendMessage({'cmd': 'hideBrowserIcon'})
            }
            else if(dataType == 'storeMessage'){
                data = data.msg;
                chrome.runtime.sendMessage({
                        'cmd': 'storeMessage',
                        'myUin': g_uin,
                        'sender_uin': data.sender_uin,
                        'sender_name': data.sender_name,
                        'receiver_uin': data.receiver_uin,
                        'receiver_name': data.receiver_name,
                        'time': data.time,
                        'text': data.content
                });
            }
        }
    }, 
    false
);

// ----------------app start---------------
var elmScript = document.createElement('script');
elmScript.type = 'text/javascript';
elmScript.onload = function (){
    document.head.removeChild(elmScript);
    elmScript.onload = null;
};
elmScript.src = chrome.extension.getURL('webqq_hook.js');
document.head.appendChild(elmScript);

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse){
        if(request.cmd == "getLoginUin"){
            sendResponse(g_uin);
        }
        else {
            return true;
        }
    }
);

chrome.runtime.sendMessage({
    'cmd': 'collect',
    'ctype': 'openwebqq'
});