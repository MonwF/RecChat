function db_init(){
    window.db = openDatabase('chatrec', '1.0', 'Char Record', 20*1024*1024);
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

var owner_id = get_owner_id();
var receivers = [];
var g_receiver_index = 0;
var g_receiver_start = 0;
var g_receiver_count = 0;
var g_current_page = 0;
var g_search_keyword = "";
var msg_count_per_page = 20;
var max_pages_in_title = 12;

window.db.transaction(function(tx){
   get_receiver_list(tx, owner_id, function(rows){
       var s = '';
       var lenth = rows.length;
       for(var i = 0; i < lenth; ++i){
           var receiver = dec(rows.item(i).receiver);
           receivers[receivers.length] = receiver;
           s += '<div class="receiver">';
           s += '<a href=\'javascript:select_receiver('+i+')\'>' + enc_html(receiver) + '</a>';
           s += '</div>';
       }
       $('receiver_list').innerHTML = s;
       
       if(lenth > 0){
           g_receiver_index = 0;
           g_receiver_start = 0;
           g_search_keyword = "";
           load_receiver(tx);
       }
   });
});

function get_receiver_list(tx, owner_id, on_get){
    tx.executeSql("SELECT DISTINCT receiver FROM 'chat' WHERE owner=" + owner_id + ";", [], 
        function(tx, result){
            on_get(result.rows);
        },
        function(tx, error){}
    );
}

function get_message_count(tx, owner_id, receiver, search_keyword, on_get){
    var sql;
    if(search_keyword === "")
        sql = "SELECT * FROM 'chat' WHERE owner=" + owner_id + " AND receiver='" + enc_sql(enc(receiver)) + "';";
    else
    {
        if(receiver === "") receiver = "%";
        else receiver = "%" + enc_sql(enc(receiver)) + "%";

        search_keyword = enc_sql('%'+enc(search_keyword)+'%');
        search_keyword = search_keyword.replace(/\/(33\/)+/g, '/%');

        sql = "SELECT * FROM 'chat' WHERE owner=" + owner_id + " AND receiver LIKE '" + receiver + "' AND (text LIKE '" + search_keyword + "' OR sender LIKE '" + search_keyword + "');";
    }

    tx.executeSql(sql,
        [], 
        function(tx, result)
        {
            on_get(result.rows.length);
        },
        function(tx, error){}
    );
}

function get_message_list(tx, owner_id, receiver, search_keyword, start, count, on_get){
    var sql;
    if(search_keyword === "")
        sql = "SELECT * FROM 'chat' WHERE owner=" + owner_id + " AND receiver='" + enc_sql(enc(receiver)) + "' "
            + "ORDER BY time, msg_id "
            + "LIMIT '" + count + "' "
            + "OFFSET '" + start + "';";
    else
    {
        if(receiver === "") receiver = "%";
        else receiver = "%" + enc_sql(enc(receiver)) + "%";

        search_keyword = enc_sql('%'+enc(search_keyword)+'%');
        search_keyword = search_keyword.replace(/\/(33\/)+/g, '/%');

        sql = "SELECT * FROM 'chat' WHERE owner=" + owner_id + " AND receiver LIKE '" + receiver + "' AND (text LIKE '" + search_keyword + "' OR sender LIKE '" + search_keyword + "') "
            + "ORDER BY time, msg_id "
            + "LIMIT '" + count + "' "
            + "OFFSET '" + start + "';";
    }

    tx.executeSql(sql, [], 
        function(tx, result)
        {
            on_get(result.rows);
        },
        function(tx, error){}
    );
}


function load_record(tx){
    if((g_receiver_index < 0 || g_receiver_index >= receivers.length) && g_search_keyword === "")
    {
        $('message_list').innerHTML = '聊天记录不存在';
        return;
    }

    var receiver = "";
    if(g_receiver_index >= 0 && g_receiver_index < receivers.length)
        receiver = receivers[g_receiver_index];

    var reverse_start = g_receiver_count - g_receiver_start - msg_count_per_page;
    var reverse_count = (reverse_start < 0 ? msg_count_per_page + reverse_start : msg_count_per_page);
    if(reverse_start < 0) reverse_start = 0;
    if(reverse_count < 0) reverse_count = 0;

    get_message_list(tx, owner_id, receiver, g_search_keyword, reverse_start, reverse_count, function(rows)
    {
        var s = '<form name="fm">';
        var lenth = rows.length;
        for(var i = lenth; i-- > 0; )
        {
            s += '<div class="msg_item">';
            s += '<input name="check_delete" type="checkbox" msg_tab_id="' + rows.item(i).tab_id + '" msg_msg_id="' + rows.item(i).msg_id + '" msg_time="' + enc_html(rows.item(i).time) + '" />';
            s += '<div class="msg_sender">' + enc_html(dec(rows.item(i).sender)) + '</div>';
            s += '<div class="msg_time">' + enc_html(rows.item(i).time) + '</div>';
            s += '<div class="msg_text">' + dec(rows.item(i).text) + '</div>';
            s += '</div>';
        }
        s += "</form>";
        $('message_list').innerHTML = s;
    });
}

function load_record_tx(toPage){
    var oldE = $("curPage");
    oldE.setAttribute("id", "pg" + g_current_page);
    oldE.setAttribute("href", 'javascript:' + enc_html('load_record_tx(' + g_current_page +');'));
    
    g_current_page = toPage;
    g_receiver_start = g_current_page * msg_count_per_page;
    
    var newE = $("pg" + g_current_page);
    newE.setAttribute("id", "curPage");
    newE.removeAttribute("href");
    
    window.db.transaction(function(tx)
    {
        load_record(tx);
    });
}

function show_title_closer(){
    g_current_page -= max_pages_in_title;
    if(g_current_page < 0)
        g_current_page = 0;
    show_title();
}

function show_title_ealier(){
    g_current_page += max_pages_in_title;
    if(g_current_page * msg_count_per_page < g_receiver_count)
        show_title();
}

function show_title(){
    var s = '';
    var i;

    var title_page_start = Math.floor(g_current_page / max_pages_in_title) * max_pages_in_title;

    if(title_page_start > 0)
        s += '<a href="javascript:'+enc_html('show_title_closer();')+'">更近</a>';

    for(i = title_page_start; i * msg_count_per_page < g_receiver_count && i < title_page_start + max_pages_in_title; ++i){
        if(i != g_current_page){
            s += '<a id="pg' + i +'" href="javascript:' + enc_html('load_record_tx(' + i +');')+'">' + (i+1) + '</a>';
        }
        else {
            s += '<a id="curPage">' + (i+1) + '</a>';
        }
    }
    if(i * msg_count_per_page < g_receiver_count)
        s += '<a href="javascript:'+enc_html('show_title_ealier();')+'">更早</a>';

    $('message_page_title').innerHTML = s;

}

function load_receiver(tx){
    var receiver = "";
    if(g_receiver_index >= 0 && g_receiver_index < receivers.length)
        receiver = receivers[g_receiver_index];

    get_message_count(tx, owner_id, receiver, g_search_keyword, function(count){
        g_receiver_count = count;
        var s = '';
        var i;

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
                tx.executeSql("DELETE FROM 'chat' WHERE owner=" + owner_id + " "
                    + "AND tab_id=" + tab_id + " "
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
            tx.executeSql("DELETE FROM 'chat' WHERE owner=" + owner_id + " "
                + "AND tab_id=" + tab_id + " "
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
    if(g_receiver_index < 0 || g_receiver_index >= receivers.length)
        return;
    var receiver = receivers[g_receiver_index];
    if(!confirm("确定要删除 " + receiver + " 的所有记录吗？")){
        return;
    }

    window.db.transaction(function(tx)
    {
        tx.executeSql("DELETE FROM 'chat' WHERE owner=" + owner_id + " "
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

function refresh_page(){
    window.location.reload();
}

function select_receiver(receiver_index){
    g_receiver_index = receiver_index;
    g_receiver_start = 0;
    g_search_keyword = "";
    load_receiver_ex();
    $('but_del_all').style.display = 'table-cell';
    $('q').value = '';
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
        $('but_del_all').style.display = 'none';
    }
}