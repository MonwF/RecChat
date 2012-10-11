function enc_sql(s){
    return s.replace(/'/g, "''");
}

function enc(s){
    var lenth = s.length;
    var arr = [];
    for(var i = 0; i < lenth; ++i){
        arr[i] = s.charCodeAt(i) + 1;
    }
    return arr.join("/");
}

function dec(s){
    var rt = "";
    var arr = s.split("/");
    var lenth = s.length;
    for(var i = 0; i < lenth; ++i){
        if(arr[i]){
            rt += String.fromCharCode(arr[i] - 1);
        }
    }
    return rt;
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

chrome.extension.onMessage.addListener(
    function(request, sender, sendResponse){
        if(sender.tab.incognito){
            return; //Do not support record message in incognito mode
        }
        if(request.cmd == "add_rec"){
            db_add_record(
                request.my_id,
                request.sender_name,
                request.receiver_name,
                request.time,
                request.text);
        }
        else if(request.cmd == "show"){
            chrome.pageAction.show(sender.tab.id);
        }
        else if(request.cmd == "hide"){
            chrome.pageAction.hide(sender.tab.id);
        }
        else{
            sendResponse({}); // snub them.
        }
});

chrome.pageAction.onClicked.addListener(
    function(tab){
        if(tab.incognito){
            alert('不支持在隐身模式下记录聊天信息。您看到的将是之前正常模式下记录的聊天信息。');
        }
        else {
            chrome.tabs.sendMessage(tab.id, {cmd: 'get_owner'}, function(uin){
                if(uin > 0){
                    chrome.tabs.create({url: 'setting.html?' + enc(uin)});
                }
            });
        }
});

db_init();