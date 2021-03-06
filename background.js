﻿function enc_sql(s){
    return s.replace(/'/g, "''");
}

function enc(s){
    var lenth = s.length;
    var arr = [];
    for(var i = 0;i < lenth; ++i){
        arr[i] = s.charCodeAt(i) + 1;
    }
    return arr.join("/");
}

function db_init(){
    window.db = openDatabase('chatrec', '1.0', 'Chat Record', 20*1024*1024);
    window.db.transaction(function(tx){
        tx.executeSql("CREATE TABLE IF NOT EXISTS MSG ('owner' VARCHAR NOT NULL , 'sender' VARCHAR NOT NULL, 'receiver' VARCHAR NOT NULL, 'time' DATETIME, 'text' VARCHAR);");
    });
    window.db.transaction(function(tx){
        tx.executeSql("INSERT INTO MSG SELECT OWNER,SENDER,RECEIVER,TIME,TEXT FROM CHAT");
        tx.executeSql('DROP TABLE IF EXISTS CHAT');
    });
}

function db_add_record(owner, sender, receiver, time, text){
    window.db.transaction(function(tx){
        tx.executeSql("INSERT INTO MSG ('owner', 'sender', 'receiver', 'time', 'text') VALUES ("
            + "'" + enc_sql(owner) + "', "
            + "'" + enc_sql(enc(sender)) + "', "
            + "'" + enc_sql(enc(receiver)) + "', "
            + "'" + enc_sql(time) + "', "
            + "'" + enc_sql(enc(text)) + "');"
            );
    });
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse){
        if(sender.tab.incognito){
            return true; //Do not support record message in incognito mode
        }
        var cmdType = request.cmd, clcType = '';
        if(cmdType == "storeMessage"){
            db_add_record(
                request.myUin,
                request.sender_name,
                request.receiver_name,
                request.time,
                request.text
            );
        }
        else if(cmdType == "showBrowserIcon"){
            chrome.pageAction.show(sender.tab.id);
            ga('send', 'event', 'webqq', 'login', 'login success');
        }
        else if(cmdType == "hideBrowserIcon"){
            chrome.pageAction.hide(sender.tab.id);
        }
        else if(cmdType == "collect"){
        	clcType = request.ctype
        	if(clcType == 'openwebqq'){
        		ga('send', 'event', 'webqq', 'enter', 'enter webqq page');
        	}
        }
        return true;
    }
);

chrome.pageAction.onClicked.addListener(
    function(tab){
    	ga('send', 'event', 'webqq', 'pageAction', 'click pageAction icon');
        chrome.tabs.sendMessage(tab.id, {cmd: 'getLoginUin'}, function(uin){
            if(uin){
                chrome.tabs.create({url: 'setting.html?' + enc(uin)});
            }
        });
	}
);

db_init();

(function(i, s, o, g, r, a, m){
    i['GoogleAnalyticsObject'] = r;
    i[r] = i[r] || function(){
        (i[r].q = i[r].q || []).push(arguments)
    }, i[r].l = 1 * new Date();
    a = s.createElement(o),
    m = s.getElementsByTagName(o)[0];
    a.async = 1;
    a.src = g;
    m.parentNode.insertBefore(a,m);
})(window, document, 'script', 'analytics.js','ga');
ga('create', 'UA-24091254-4');
ga('set', 'checkProtocolTask', null);

chrome.runtime.onStartup.addListener(function(){
	ga('send', 'event', 'crx', 'startup', 'extension launched');
});

chrome.runtime.onInstalled.addListener(function(details){
	if(details.reason == 'install'){
		ga('send', 'event', 'crx', 'install', 'extension installed');
        ga('send', 'event', 'crx', 'startup', 'extension launched');
	}
});
