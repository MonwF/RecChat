var g_msg_no = 0;
var g_icon_show = false;
var g_uin = 0;
var g_nick = '';

function getById = function (id){
    return document.getElementById(id);
}

function no_sp(s){
    console.log('Not supported: ' + s);
}

function update_login_state(){
    var qqwin = document.querySelector("#EQQ_LoginSuccess");
    if(qqwin && !g_icon_show){
        g_icon_show = true;
        chrome.extension.sendMessage({'cmd': 'show'});
    }
    else if(!qqwin && g_icon_show){
        g_icon_show = false;
        chrome.extension.sendMessage({'cmd': 'hide'});
    }
    getQQUser();
    return !!qqwin;
}

function onDOMContentLoaded(){
    var o = document.querySelector("#desktop");
    if(o){
        o.addEventListener("DOMSubtreeModified", function(){
            var isLogin = update_login_state();
            if(isLogin){
                var msgLists = document.querySelectorAll("#desktopsContainer .chatBox_msgList");
                var lenth = msgLists.length;
                for(var i = 0;i < lenth;i++){
                    if(!msgLists[i].getAttribute('chatrec_EventAdded')){
                        msgLists[i].setAttribute('chatrec_EventAdded', "1");
                        msgLists[i].addEventListener("DOMSubtreeModified", function(){
                            onMsgModified(this);
                        }, true);
                    }
                }
            }
        }, true);
    }
}

function getQQUser(){
    var qqImg = getById("EQQ_MyAvatar");
    if(qqImg){
        g_uin = qqImg.getAttribute('uin');
        var qqNick = getById("EQQ_MyNick");
        if(qqNick){
            g_nick = qqNick.innerText;
        }
    }
    else {
        g_uin = 0;
        g_nick = '';
    }
}

function getAppWindow(o){
    for(; o && o !== document.documentElement; o = o.parentNode){
        if(!o.getAttribute){
            no_sp('getAppWindow(o)');
            return null;
        }
        var id = o.getAttribute("id");
        if(id && id.match(/^appWindow_.*/)){
            return o;
        }
    }
    return null;
}

function getText(o){
    return (o.nodeName.toUpperCase() == '#TEXT' ? o.nodeValue : o.innerText);
}

function onMsgModified(o){
    if(g_uin == 0) return ;

    var msgListWin = o;

    var appWin = getAppWindow(msgListWin);
    if(!appWin) {no_sp('^appWindow_.*'); return;}

    if(!msgListWin.id) {no_sp('msgListWin.id'); return;}

    var avatarArea = document.querySelector("#" + appWin.id + " div.chatBox_buddyAvatarArea");
    if(!avatarArea) {no_sp('.chatBox_buddyAvatarArea'); return;}
    var receiver_id = avatarArea.getAttribute('uin');
    if(!receiver_id) {no_sp('receiver_id'); return;}
    //console.log('receiver_id ' + receiver_id);

    var mainName = document.querySelector("#" + appWin.id +" span.chatBox_mainName");
    if(!mainName) {no_sp('span.chatBox_mainName'); return;}
    var receiver_name = getText(mainName);
    if(receiver_name === undefined) {no_sp('receiver_name'); return;}
    //console.log('receiver_name ' + receiver_name);

    var messages = [];
    var messages_ex = [];
    var messages_id = [];
    var msgList = document.querySelectorAll("#" + msgListWin.id + ">dl");
    var msgLLenth = msgList.length;
    for(var i = 0; i < msgLLenth; ++i){
        var msg = msgList[i];
        
        if(!msg.childNodes) {no_sp('msg.childNodes'); continue;}
        var dt = null;
        var dd = null;
        for(var j = 0; j < msg.childNodes.length; ++j)
            if(msg.childNodes[j].nodeName.toUpperCase() == 'DT') {dt = msg.childNodes[j]; break;}
        for(var j = 0; j < msg.childNodes.length; ++j)
            if(msg.childNodes[j].nodeName.toUpperCase() == 'DD') {dd = msg.childNodes[j]; break;}
        if(!dt || !dd) {no_sp('msg.childNodes[dt,dd]'); continue;}
        
        if(!dt.childNodes || dt.childNodes.length < 2) {no_sp('dt.childNodes'); continue;}
        var sender_name = getText(dt.childNodes[0]);
        var time = getText(dt.childNodes[1]);
        var text = dd.innerHTML;

        var sender_id;
        if(msg.className === 'chatBox_myMsg'){
            sender_id = g_uin;	//my uin
        }
        else if(msg.className === 'chatBox_buddyMsg'){
            sender_id = msg.getAttribute('duin');
        }
        
        messages[messages.length] = JSON.stringify({
            "sender_id": sender_id,
            "receiver_id": receiver_id,
            "time": time
        });
        
        messages_ex[messages_ex.length] = JSON.stringify(
        {
            "sender_name": sender_name,
            "receiver_name": receiver_name,
            "text": text
        });
        
        messages_id[messages_id.length] = "";
    }

    var old_messages = msgListWin.parentNode.getAttribute("chatrec_set_DOMSubtreeModified_msg");
    if(!old_messages)
        old_messages = [];
    else
        old_messages = JSON.parse(old_messages);
    var old_messages_ex = msgListWin.parentNode.getAttribute("chatrec_set_DOMSubtreeModified_msg_ex");
    if(!old_messages_ex)
        old_messages_ex = [];
    else
        old_messages_ex = JSON.parse(old_messages_ex);
    var old_messages_id = msgListWin.parentNode.getAttribute("chatrec_set_DOMSubtreeModified_msg_id");
    if(!old_messages_id)
        old_messages_id = [];
    else
        old_messages_id = JSON.parse(old_messages_id);

    var match_len = messages.length;
    var allLenth = messages.length;
    var oldLenth = old_messages.length;
    for(var i = 0; i < allLenth; ++i){
        var match = true;
        for(var index1 = 0; index1 < allLenth - i; ++index1){
            //messages[j] === 
            var index0 = (oldLenth - match_len + i + index1);
            if(index0 < 0 || index0 >= oldLenth) {match = false; break;}
            if(old_messages[index0] !== messages[index1]) {match = false; break;}
        }
        if(match){
            match_len = i;
            break;
        }
    }

    //Modified items
    for(var index1 = 0; index1 < allLenth - match_len; ++index1){
        var index0 = (oldLenth - allLenth + i + index1);
        if(index0 < 0 || index0 >= oldLenth){
            continue;
        }
        else{
            messages_id[index1] = old_messages_id[index0];
        }
        if(old_messages_ex[index0] === messages_ex[index1]){
            continue;
        }

        var msg = messages[index1];
        var msg_ex = messages_ex[index1];
        var msg_id = messages_id[index1];
        msg = JSON.parse(msg);
        msg_ex = JSON.parse(msg_ex);
        
        //console.log('mod ', msg_id, msg.sender_id, msg_ex.sender_name, msg.receiver_id, msg_ex.receiver_name, msg.time, msg_ex.text);
        chrome.extension.sendMessage({
            'cmd': 'mod_rec',
            'my_id': g_uin,
            'my_name': g_nick,
            'msg_id': msg_id,
            'sender_id': msg.sender_id,
            'sender_name': msg_ex.sender_name,
            'receiver_id': msg.receiver_id,
            'receiver_name': msg_ex.receiver_name,
            'time': msg.time,
            'text': msg_ex.text
        });
    }

    //Added items
    for(var i = 0; i < match_len; ++i){
        var index1 = allLenth - match_len + i;
        messages_id[index1] = g_msg_no++;
        if(g_msg_no >= 0x7FFFFFFF) g_msg_no = 0;

        var msg = messages[index1];
        var msg_ex = messages_ex[index1];
        var msg_id = messages_id[index1];
        msg = JSON.parse(msg);
        msg_ex = JSON.parse(msg_ex);
        //console.log('add ', msg_id, msg.sender_id, msg_ex.sender_name, msg.receiver_id, msg_ex.receiver_name, msg.time, msg_ex.text);
        
        chrome.extension.sendMessage({
            'cmd': 'add_rec',
            'my_id': g_uin,
            'my_name': g_nick,
            'msg_id': msg_id,
            'sender_id': msg.sender_id,
            'sender_name': msg_ex.sender_name,
            'receiver_id': msg.receiver_id,
            'receiver_name': msg_ex.receiver_name,
            'time': msg.time,
            'text': msg_ex.text
        });
    }

    msgListWin.parentNode.setAttribute("chatrec_set_DOMSubtreeModified_msg", JSON.stringify(messages));
    msgListWin.parentNode.setAttribute("chatrec_set_DOMSubtreeModified_msg_ex", JSON.stringify(messages_ex));
    msgListWin.parentNode.setAttribute("chatrec_set_DOMSubtreeModified_msg_id", JSON.stringify(messages_id));
}

(function(){
    onDOMContentLoaded();

    chrome.extension.onMessage.addListener(
        function(request, sender, sendResponse){
            if(request.cmd == "get_owner"){
                sendResponse(g_uin);
            }
        });
})();
