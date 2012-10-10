var g_msg_no = 0;
var g_icon_show = false;
var g_uin = 0;
var g_nick = '';

function getById(id){
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
    var bd = document.body;
    var id = 0;
    for(;o !== document.body;o = o.parentNode){
        id = o.getAttribute("id");
        if(id && /^appWindow_\w+/.test(id)){
            return o;
        }
    }
    return null;
}

function onMsgModified(msgListCtn){
    if(g_uin == 0) return ;

    var appWin = getAppWindow(msgListCtn);

    var avatarArea = document.querySelector("#" + appWin.id + " .chatBox_buddyAvatarArea");
    var receiver_id = avatarArea.getAttribute('uin');

    var mainName = document.querySelector("#" + appWin.id + " .chatBox_mainName");
    var receiver_name = mainName.innerText;

    var newestMsg = msgListCtn.lastChild;
    var dt = newestMsg.firstChild;
    var dd = newestMsg.children[1];
    var sender_name = dt.title;
    var time = dt.children[0].innerText;
    var text = dd.innerHTML;
    var sender_id = 0;
    if(newestMsg.className === 'chatBox_myMsg'){
        sender_id = g_uin;   //my uin
    }
    else {
        sender_id = newestMsg.getAttribute('duin');
    }

    chrome.extension.sendMessage({
            'cmd': 'add_rec',
            'my_id': g_uin,
            'my_name': g_nick,
            'sender_id': sender_id,
            'sender_name': sender_name,
            'receiver_id': receiver_id,
            'receiver_name': receiver_name,
            'time': time,
            'text': text
    });
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
