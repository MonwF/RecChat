'use strict';
function db_init(){
    window.db = openDatabase('chatrec', '1.0', 'Chat Record', 20*1024*1024);
}
db_init();

function $(s){
    return document.getElementById(s);
}

function enc_sql(s){
    return s.replace(/'/g, "''");
}

function enc_html(s){
    s = s.replace(/&/g, "&amp;");
    s = s.replace(/</g, "&lt;");
    s = s.replace(/>/g, "&gt;");
    s = s.replace(/"/g, "&#34;");
    s = s.replace(/'/g, "&#39;");
    s = s.replace(/\//g, "&#47;");
    return s;
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

function get_owner_id(){
    var v = dec(location.search.replace(/^\?/, ""));
    if(/(\d+)/.test(v)){
        return RegExp.$1;
    }
    return null;
}

$.css = {
    hasClass:function(obj,n){
        if(!obj.className) return false;
        var name = obj.className.split(' ');
        for (var i=0,len=name.length;i<len;i++){
            if (n==name[i]) return true;    
        }
        return false;
    },
    /**
     * 添加样式名
     *
     * @param {Object} obj html对象
     * @param {String} n=名称 
     * @example
     *      $.css.addClass($('test'),'f-hover');
     */
    addClass:function(obj,n){
         $.css.updateClass(obj,n,false);
    },
    /**
     * 删除样式名
     *
     * @param {Object} obj html对象
     * @param {String} n=名称 
     * @example
     *      $.css.addClass($('test'),'f-hover');
     */
    removeClass:function(obj,n){
        $.css.updateClass(obj,false,n);
    },
    /**
     * 更新样式名
     *
     * @param {Object} obj html对象
     * @param {String} addClass
     * @param {String} removeClass, 
     * @example
     *      $.css.addClass($('test'),'f-hover asdf','remove1 remove2');
     */
    updateClass:function(obj,addClass,removeClass){
        var name = obj.className.split(' ');
        var objName = {}, i=0, len = name.length;
        for(;i<len;i++){
            name[i] && (objName[name[i]] = true);   
        }
        
        if (addClass){
            var addArr = addClass.split(' ');
            for(i=0,len=addArr.length;i<len;i++){
                addArr[i] && (objName[addArr[i]] = true);   
            }           
        }

        if (removeClass){
            var removeArr = removeClass.split(' ');
            for(i=0,len=removeArr.length;i<len;i++){
                removeArr[i] && (delete objName[removeArr[i]]); 
            }           
        }
        
        var res = [];
        for (var k in objName){
            res.push(k);
        }
        
        obj.className = res.join(' ');
    }
};

var owner_id = get_owner_id();
var g_receiver = '';
var g_receiver_start = 0;
var g_receiver_count = 0;
var g_current_page = 0;
var g_search_keyword = "";
var msg_count_per_page = 2;
var max_pages_in_title = 10;

var elmCrtReceiver = null;

window.db.transaction(function(tx){
   get_receiver_list(tx, owner_id, function(rows){
       var s = '';
       var lenth = rows.length;
       var receiver = '';
       for(var i = 0; i < lenth; ++i){
           receiver = dec(rows.item(i).receiver);
           s += ('<p class="receiver">' + enc_html(receiver) + '</p>');
       }
       $('receiver_list').innerHTML = s;
       
       if(lenth > 0){
           elmCrtReceiver = $('receiver_list').firstChild;
           $.css.addClass(elmCrtReceiver, 'cur-receiver');
           g_receiver = elmCrtReceiver.innerText;
           g_receiver_start = 0;
           g_search_keyword = "";
           load_receiver(tx);
       }
   });
});

$('receiver_list').onclick = function (e){
    var _target = e.target;
    if(_target.nodeName == 'P' && !$.css.hasClass(_target, 'cur-receiver')){
        $.css.removeClass(elmCrtReceiver, 'cur-receiver');
        elmCrtReceiver = _target;
        $.css.addClass(elmCrtReceiver, 'cur-receiver');
        g_receiver = _target.innerText;
        g_receiver_start = 0;
        g_search_keyword = "";
        $('btn-delall').style.display = 'inline-block';
        load_receiver_ex();
        $('q').value = '';
    }
};
$('message_page_title').onclick = function (e){
    var _target = e.target;
    var eid = _target.id;
    if(_target.nodeName == 'A' && eid != 'curPage'){
        e.preventDefault();
        if(/pg(\d+)/.test(eid)){
            load_record_tx(parseInt(RegExp.$1));
        }
        else if(eid == 'pgnew'){
            navPage(-1);
        }
        else if(eid == 'pgold'){
            navPage(1);
        }
    }
};
$('search-btn').onclick = search;
$('btn-delsel').onclick = delete_select;
$('btn-delpage').onclick = delete_page;
$('btn-delall').onclick = delete_receiver;

function get_receiver_list(tx, owner_id, on_get){
    tx.executeSql("SELECT DISTINCT receiver FROM MSG WHERE owner=" + owner_id + ";", [], 
        function(tx, result){
            on_get(result.rows);
        },
        function(tx, error){}
    );
}

function get_message_count(tx, owner_id, receiver, search_keyword, on_get){
    var sql;
    if(search_keyword === "")
        sql = "SELECT * FROM MSG WHERE owner=" + owner_id + " AND receiver='" + enc_sql(enc(receiver)) + "';";
    else{
        if(receiver === "") receiver = "%";
        else receiver = "%" + enc_sql(enc(receiver)) + "%";

        search_keyword = enc_sql('%'+enc(search_keyword)+'%');
        search_keyword = search_keyword.replace(/\/(33\/)+/g, '/%');

        sql = "SELECT * FROM MSG WHERE owner=" + owner_id + " AND receiver LIKE '" + receiver + "' AND (text LIKE '" + search_keyword + "' OR sender LIKE '" + search_keyword + "');";
    }

    tx.executeSql(sql, [], function(tx, result){
            on_get(result.rows.length);
        },
        function(tx, error){}
    );
}

function get_message_list(tx, owner_id, receiver, search_keyword, start, count, on_get){
    var sql;
    if(search_keyword === ""){
        sql = "SELECT * FROM MSG WHERE owner=" + owner_id + " AND receiver='" + enc_sql(enc(receiver)) + "' "
            + "ORDER BY time LIMIT '" + count + "' "
            + "OFFSET '" + start + "';";
    }
    else{
        if(receiver === "") receiver = "%";
        else receiver = "%" + enc_sql(enc(receiver)) + "%";

        search_keyword = enc_sql('%'+enc(search_keyword)+'%');
        search_keyword = search_keyword.replace(/\/(33\/)+/g, '/%');

        sql = "SELECT * FROM MSG WHERE owner=" + owner_id + " AND receiver LIKE '" + receiver + "' AND (text LIKE '" + search_keyword + "' OR sender LIKE '" + search_keyword + "') "
            + "ORDER BY time LIMIT '" + count + "' "
            + "OFFSET '" + start + "';";
    }

    tx.executeSql(sql, [], function(tx, result){
            on_get(result.rows);
        },
        function(tx, error){}
    );
}


function load_record(tx){
    if(g_receiver == '' && g_search_keyword === ""){
        $('message_list').innerHTML = '聊天记录不存在';
        return;
    }

    var receiver = g_receiver;

    var reverse_start = g_receiver_count - g_receiver_start - msg_count_per_page;
    var reverse_count = (reverse_start < 0 ? msg_count_per_page + reverse_start : msg_count_per_page);
    if(reverse_start < 0) reverse_start = 0;
    if(reverse_count < 0) reverse_count = 0;

    get_message_list(tx, owner_id, receiver, g_search_keyword, reverse_start, reverse_count, function(rows){
        var s = '<form name="fm">';
        var lenth = rows.length;
        for(var i = lenth;i-- > 0;){
            s += '<div class="msg_item">';
            s += '<input name="check_delete" type="checkbox"' + '" msg_time="' + enc_html(rows.item(i).time) + '" />';
            s += '<span class="msg_sender">' + enc_html(dec(rows.item(i).sender)) + '</span>';
            s += '<span class="msg_time">' + enc_html(rows.item(i).time) + '</span>';
            s += '<p class="msg_text">' + dec(rows.item(i).text) + '</p>';
            s += '</div>';
        }
        s += "</form>";
        $('message_list').innerHTML = s;
    });
}

function load_record_tx(toPage){
    var oldE = $("curPage");
    oldE.id = "pg" + g_current_page;
    oldE.setAttribute("href", '#');
    
    g_current_page = toPage;
    g_receiver_start = g_current_page * msg_count_per_page;
    
    var newE = $("pg" + g_current_page);
    newE.id = 'curPage';
    newE.removeAttribute("href");
    
    window.db.transaction(function(tx){
        load_record(tx);
    });
}

function navPage(iDirect){
    var title_page_start = Math.floor(g_current_page / max_pages_in_title);
    g_current_page = (title_page_start + iDirect) * max_pages_in_title;
    show_title();
    g_receiver_start = g_current_page * msg_count_per_page;
    window.db.transaction(function(tx){
        load_record(tx);
    });
}

function show_title(){
    var s = '';
    var title_page_start = Math.floor(g_current_page / max_pages_in_title) * max_pages_in_title;

    if(title_page_start > 0){
        s += '<a id="pgnew" href="#" class="pagnav-btn">更近</a>';
    }
    var maxPage = Math.min(g_receiver_count/msg_count_per_page, title_page_start + max_pages_in_title);
    for(var i = title_page_start;i < maxPage;i++){
        if(i != g_current_page){
            s += '<a id="pg' + i +'" href="#">' + (i+1) + '</a>';
        }
        else {
            s += '<a id="curPage">' + (i+1) + '</a>';
        }
    }
    if(i * msg_count_per_page < g_receiver_count){
        s += '<a id="pgold" href="#" class="pagnav-btn">更早</a>';
    }

    $('message_page_title').innerHTML = s;
}

function load_receiver(tx){
    var receiver = g_receiver;
    get_message_count(tx, owner_id, receiver, g_search_keyword, function(count){
        g_receiver_count = count;
        g_current_page = Math.floor(g_receiver_start / msg_count_per_page);
        show_title();
        load_record(tx);
    });
}

function load_receiver_ex(){
    window.db.transaction(function(tx){
        load_receiver(tx);
    });
}

function delete_select(){
    var checks = document.getElementsByName("check_delete");
    var select_length = 0;
    var lenth = checks.length;
    for(var i = 0; i < lenth; ++i)
    {
        if(checks[i].checked)
            ++select_length;
    }
    if(select_length == 0)
    {
        alert("请先选择您要删除的记录。");
        return;
    }
    if(!confirm("确定要删除选中的 "+select_length+"条记录吗？"))
        return;

    window.db.transaction(function(tx)
    {
        for(var i = 0; i < lenth; ++i)
        {
            if(checks[i].checked)
            {
                var tab_id = checks[i].getAttribute('msg_tab_id');
                var msg_id = checks[i].getAttribute('msg_msg_id');
                var time = checks[i].getAttribute('msg_time');
                tx.executeSql("DELETE FROM MSG WHERE owner=" + owner_id + " "
                    + "AND tab_id=" + tab_id + " "
                    + "AND time='" + enc_sql(time) + "';", [], 
                    function(tx, result){
                        load_receiver(tx);
                    },
                    function(tx, error){
                        load_receiver(tx);
                    }
                );
            }
        }
    });
}

function delete_page(){
    if(!confirm("确定要删除本页的所有记录吗？"))
        return;

    var checks = document.getElementsByName("check_delete");
    var lenth = checks.length;
    window.db.transaction(function(tx){
        for(var i = 0; i < lenth; ++i){
            var tab_id = checks[i].getAttribute('msg_tab_id');
            var msg_id = checks[i].getAttribute('msg_msg_id');
            var time = checks[i].getAttribute('msg_time');
            tx.executeSql("DELETE FROM MSG WHERE owner=" + owner_id + " "
                + "AND msg_id=" + msg_id + " "
                + "AND time='" + enc_sql(time) + "';", [], 
                function(tx, result){
                    load_receiver(tx);
                },
                function(tx, error){
                    load_receiver(tx);
                }
            );
        }
    });
}

function delete_receiver(){
    var receiver = g_receiver;
    if(!confirm("确定要删除 " + receiver + " 的所有记录吗？")){
        return;
    }

    window.db.transaction(function(tx)
    {
        tx.executeSql("DELETE FROM MSG WHERE owner=" + owner_id + " "
            + "AND receiver='" + enc_sql(enc(receiver)) + "';", [], 
            function(tx, result){
                g_receiver_start = 0;
                g_current_page = 0;
                g_search_keyword = "";
                load_receiver(tx);
            },
            function(tx, error){
                load_receiver(tx);
            }
        );
    });
}

function search(){
    var search_keyword = $('q').value;
    g_search_keyword = search_keyword.replace(/^\s*|\s*$/g, "");
    if(g_search_keyword === ""){
        alert("请输入您要搜索的聊天内容！");
        $('q').focus();
    }
    else{
        load_receiver_ex();
        $('btn-delall').style.display = 'none';
    }
}