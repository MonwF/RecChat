'use strict';
(function (){
    var J = Jx();
    var observerManager = J.event;

    observerManager.addObserver(alloy.portal, "EQQLoginSuccess", onLoginSucc);

    var myUin = 0, myNick = '';
    function onLoginSucc(){
        if(window.EQQ){
            myUin = alloy.portal.getPortalSelf('uin'), myNick = alloy.portal.getPortalSelf('nick');
            sendNotification({'type': 'login', 'uin': myUin});
            observerManager.addObserver(EQQ, 'MessageReceive', onReceiveMessage);
            observerManager.addObserver(EQQ, 'CloseWebQQ', onCloseWebQQ);
            observerManager.addObserver(EQQ, 'ChatBoxShow', onStartObserveSend);
        }
    }

    function onStartObserveSend(){
        observerManager.removeObserver(EQQ, 'ChatBoxShow', onStartObserveSend);
        observerManager.addObserver(EQQ.View.ChatBox, 'SendMsg', onMessageSend);
    }

    function onReceiveMessage(msgs){
        var msgUin = msgs.uin || msgs.gid || msgs.did, msgList = msgs.msgList;
        var isMsg = true, frdInfo = null, s = null, msg = null;
        for(var i=0, len=msgList.length;i < len;i++){
            isMsg = true, msg = msgList[i];
            s = {time: msg.time || J.date.format(new Date(), "YYYY-MM-DD hh:mm:ss")};
            switch (msg.type) {
                case "single":
                    s.sender_uin = msgUin, s.sender_name = msg.sender ? msg.sender.showName || msgUin : msgUin;
                    s.receiver_uin = msgUin, s.receiver_name = s.sender_name;
                    s.content = EQQ.util.trimChatMsg(msg);
                    break;
                case "group":
                    if (!EQQ.Model.BuddyList.isGroupPrompt(msgUin)) {
                        isMsg = false;
                        break ;
                    }
                    frdInfo = EQQ.Model.BuddyList.getGroupByGid(msgUin);
                    s.receiver_uin = msgUin;
                    s.receiver_name = frdInfo ? frdInfo.showName || msgUin : msgUin;
                    s.sender_uin = msg.sender_uin;
                    s.sender_name = msg.sender ? msg.sender.showName || msg.sender_uin : msg.sender_uin;
                    s.content = EQQ.util.trimChatMsg(msg);
                    break;
                case "discu":
                    if (!EQQ.Model.BuddyList.isDiscuPrompt(msgUin)) {
                        isMsg = false;
                        break ;
                    }
                    frdInfo = EQQ.Model.BuddyList.getDiscuById(msgUin);
                    s.receiver_uin = msgUin;
                    s.receiver_name = frdInfo ? frdInfo.showName || msgUin : msgUin;
                    s.sender_uin = msg.sender_uin;
                    s.sender_name = msg.sender ? msg.sender.showName || msg.sender_uin : msg.sender_uin;
                    s.content = EQQ.util.trimChatMsg(msg);
                    break;
            }

            isMsg && sendNotification({'type': 'storeMessage', 'msg': s});
        }
    }

    function removeDel(a){
       return a.length > 0 && (a[a.length-1] = a[a.length-1].replace(/\n+?$/,""));
    }
    function onMessageSend(a){
        if(EQQ.Model.BuddyList.getSelfState() == "offline") return ;
        var b = [], e = [], d = /\[.*?\]/, g = /\[face(\d{1,3})\]/, f = /\[自定义表情(\d{1,10})\]/, j = /\[发送图片([/\-a-z0-9A-z]{1,50})\]/, 
        v = /\[图片[/.a-z0-9A-z]{1,50}\]/, o = '', l, i = a.editor.getText(), z = EQQ.Model.ChatMsg.getCustomFaceList(), k = EQQ.Model.ChatMsg.getSendPicList(),
        t = false;
        for (var D = 0, m = 0;e = i.match(d);){
            if(l = e[0], g.test(l)){
                e.index && b.push(i.slice(0, e.index));
                o = RegExp.$1;
                o < 135 ? b.push(['face', EQQ.CONST.TRANSFER_TABLE[o]]) : b.push("[face" + o + "]"), i = i.slice(e.index + l.length);
            }
            else if(f.test(l)){
                t = true;
                e.index && b.push(i.slice(0, e.index));
                o = RegExp.$1, o = z[o][0];
                a.chatBoxType === "single" ? b.push(["cface", o]) : (b.push(["cface", "group", o])), i = i.slice(e.index + l.length);
            }
            else if(j.test(l)) {
                D++;
                if(D > 10) //单次最多发送10张图片
                    return ;
                e.index && b.push(i.slice(0, e.index));
                o = RegExp.$1;
                if(o == "loading")
                    return ;
                m += k[o].filesize;
                if(m > 1258291.2) //图片大小超过限制
                    return ;
                b.push(["offpic", o, k[o].filename, k[o].filesize]);
                i = i.slice(e.index + l.length);
            } 
            else {
                if(v.test(l)){
                    t = true;
                    e.index && b.push(i.slice(0, e.index));
                    o = RegExp.$1;
                    a.chatBoxType === "single" ? b.push(["cface", o]) : b.push(["cface", "group", o]);
                    i = i.slice(e.index + l.length);
                }
                else {
                    o = e.index + l.length, b.push(i.slice(0, o)), i = i.slice(o);
                }
            }
        }
        b.push(i);
        var msg = {
            'time': J.date.format(new Date(), "YYYY-MM-DD hh:mm:ss"),
            'sender_uin': myUin,
            'sender_name': myNick
        };
        if(a.chatBoxType == "single"){
            t = EQQ.Model.BuddyList.getUserByUin(a.uin);
            msg.receiver_uin = a.uin;
            msg.receiver_name = t.showName;
            if(t.isFirstSend){
                removeDel(b), b.push('\n--- 提示：此用户正在使用Q+ Web：http://web2.qq.com/'), t.isFirstSend = false;
            }
        }
        else {
            g = {};
            if(a.chatBoxType == 'group'){
                g = EQQ.Model.BuddyList.getGroupByGid(a.gid);
                msg.receiver_uin = a.gid;
                msg.receiver_name = g.showName;
            }
            else {
                g = EQQ.Model.BuddyList.getDiscuById(a.uin);
                msg.receiver_uin = a.uin;
                msg.receiver_name = g.topic;
            }
            if(g.isFirstSend){
                removeDel(b), b.push('\n--- 提示：此用户正在使用Q+ Web：http://web2.qq.com/'), g.isFirstSend = false;
            }
        }
        msg.content = EQQ.util.translateChatMsg({'content': b, 'type': a.chatBoxType}, true);
        sendNotification({'type': 'storeMessage', 'msg': msg});
    }

    function onCloseWebQQ(){
        sendNotification({'type': 'logout'});
        observerManager.removeObserver(EQQ, 'MessageReceive', onReceiveMessage);
        observerManager.removeObserver(EQQ, 'CloseWebQQ', onCloseWebQQ);
        observerManager.removeObserver(EQQ.View.ChatBox, 'SendMsg', onMessageSend);
        EQQ.View.ChatBox && observerManager.removeObserver(EQQ.View.ChatBox, 'SendMsg', onMessageSend);
        observerManager.removeObserver(EQQ, 'ChatBoxShow', onStartObserveSend);
    }

    function sendNotification(notify){
        window.postMessage(JSON.stringify(notify), alloy.CONST.MAIN_URL);
    }
})();
