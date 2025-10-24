importClass(android.content.Intent);
importClass(android.net.Uri);
importClass(java.io.File);
importClass(java.lang.Long);
importClass(java.lang.Integer);
importClass(android.content.Context);

const DB = require('DBManager').DBManager;

var { KakaoApiService, KakaoShareClient } = require('kakaolink');
var { formatResponse, shbot_ai } = require('Gemini');

const KAKAOLINK_PATH = "sdcard/kakaolink";
const IMGBB_KEY = "8080e762bce97982fa25924d1845eb58";

/**
 * 여기에 들어가는 인자는 https://nyangbotlab.github.io/dbdoc/v2/interfaces/types_manager.InstanceType.html 참고
 */

var DBListener = DB.getInstance({});
/*
const service = KakaoApiService.createService();
const client = KakaoShareClient.createClient();

const cookies = service.login({
    signInWithKakaoTalk: true
})

client.init('9183603ef31a83adf45e56fe85620de1', 'https://naver.com', cookies);
*/
var fs = {
  write: function (path, str) {
    return FileStream.write(path, str);
  },
  read: function (path) {
    return FileStream.read(path);
  },

  append: function (path, str) {
    return FileStream.append(path, str);
  },

  remove: function (path) {
    return FileStream.remove(path);
  },

  list: function (path) {
    return java.io.File(path).listFiles();
  }
};

/*var sendLink = function (room, tempId, args) {
  if (typeof args !== 'object' || args === null) {
    args = {};
  }
 
  if (typeof tempId !== 'number') {
    return "올바른 템플릿 아이디를 입력해주세요.";
  }

  return client.sendLink(room, {
    templateId: tempId,
    templateArgs: args
  }, 'custom').awaitResult(); 
};*/

var path = "sdcard/shbot_db/";

var gpt_key = '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';
var line = '\n' + '\u2501'.repeat(14) + '\n';
var Line = '\n' + '\u2501'.repeat(21) + '\n';
var Lw = '\u200b'.repeat(500);
var Lq = "\u200b".repeat(1);
var InfoM = '\n\n\n이 정보는 2024.07.22 이후부터 수집된 정보입니다.';
var amt = ['1', '4'];

const eu = 'eu';

function onNotificationPosted(sbn) {
  DBListener.addChannel(sbn);
  var packageName = sbn.getPackageName();
  if (!packageName.startsWith("com.kakao.tal")) return;
  var actions = sbn.getNotification().actions;
  if (actions == null) return;
  for (var n = 0; n < actions.length; n++) {
    var action = actions[n];
    if (action.getRemoteInputs() == null) continue;
    var notification = sbn.getNotification();
    var bundle = sbn.getNotification().extras;
    var room = bundle.getString("android.subText");
    if (room == null) room = bundle.getString("android.summaryText");

    com.xfl.msgbot.application.service.NotificationListener.Companion.setSession(packageName, room, action);
  }
}

DBListener.on("message", (chat, channel) => {
  let isReply = chat.isReply();
  let isAdmin = amt.includes(String(chat.user.memberType));
  let isMention = !!chat.mentions.length;
  let Info = Info_read(channel.id); //방 info
  let user_list = user_read(channel.id); //유저 정보 배열
  let chatlog = Chatlog(channel.id); //채팅기록
  let chatrank = Rank_read(channel.id); //채팅순위
  let call_room = Call_room(); //등록 방 배열
  let delay = Date.now();
  let user = read(channel.id, chat.raw.user_id); //유저정보

  let dS = getdS();

  if (!Info) {
    let data = {
      "Name": channel.name,
      "RoomID": channel.id,
      "set": {
        "del": true,
        "hide": true,
        "io": true,
        "cr": true,
        "game": false,
        "Reg": false
      },
      "Link": (!channel.openLink ? null : channel.openLink.url)
    }
    fs.write(path + channel.id + "/RoomInfo.txt", JSON.stringify(data, null, 4));
    Info = data;
  }

  if (!call_room) {
    let a = [];
    fs.write(path + "/Local/call_room.txt", JSON.stringify(a, null, 4));
    call_room = a;
  }

  if (!chatlog) {
    let a = [];
    fs.write(path + channel.id + "/chatlog.txt", JSON.stringify(a, null, 4));
  }

  if (!chatrank) {
    let a = {};
    fs.write(path + channel.id + "/chatRank.txt", JSON.stringify(a, null, 4));
    chatrank = a;
  }

  if (!user_list) {
    let a = [];
    fs.write(path + channel.id + "/user_Data.txt", JSON.stringify(a, null, 4));
    user_list = a;
  }

  if (!user) {
    let data = {
      "userID": chat.raw.user_id,
      "ID": generateId(),
      "name": chat.user.name,
      "Ban": false,
      "admin": false,
      "join": { "f": eu, "r": null, "count": 1 },
      "leave": { "r": null, "count": 0 },
      "chat": { "f": chat.text, "ft": dS, "r": chat.text, "rt": dS, "count": 0 },
      "mention": { "set_count": 100, "count": 0, "log": [] },
      "memo": null,
      "warn": 0,
      "nc": [],
      "e_log": [],
      "code": null
    }

    while (user_list.find(e => e.Id === data.ID)) {
      data.ID = generateId();
    }

    let Data = {
      'name': chat.user.name,
      'Id': data.ID,
      'userId': chat.raw.user_id
    }

    chatrank[chat.user.name] = data.chat_count;
    user_list.push(Data);
    fs.write(path + channel.id + "/" + chat.raw.user_id + ".txt", JSON.stringify(data, null, 4));
    Rank_save(channel.id, chatrank);
    user_save(channel.id, user_list);
    user = data;
  }

  if (!user.chat.f) user.chat.f = chat.text;
  if (!user.chat.ft) user.chat.ft = dS;
  user.chat.r = chat.text;
  user.chat.rt = dS;
  user.chat.count++;
  chatrank[chat.user.name] = user.chat.count;
  Rank_save(channel.id, chatrank);
  save(channel.id, chat.raw.user_id, user);
  
  if (chat.text.startsWith("!")) {
    if (user.Ban) {
      channel.send("관리자에 의해 봇 사용이 금지되었습니다.");
      return;
    }
  }

  if (user.name != chat.user.name) {
    user.nc.push("[ " + dS + " ]  " + user.name + " → " + chat.user.name);
    user.name = chat.user.name;
    save(channel.id, chat.raw.user_id, user);
  }

  if (Info.Name != channel.name) {
    Info.Name = channel.name;
    Info_save(channel.id, Info);
  }

  /*if (self_delete) {
    if (chatlog.length > 1487) {
      channel.send("채팅기록이 1500개를 넘어 자동으로 삭제합니다.");
      chatlog = [];
      save_chatlog(channel.id, chatlog);
    }
  }*/

  if (chat.text == '!테스트') {
    channel.send('테스트 성공!\n [ ' + ((Date.now() - delay) - 5) / 1000 + 's ]');
  }

  if (chat.text === ".인증") {
    if (user.admin) {
      channel.send(chat.user.name + "님은 이미 인증을 완료하였습니다.");
      return;
    } else {
      let code;
      if (user.code == null) {
        code = createSC();
        channel.send("관리자방으로 인증코드가 전송되었습니다.");
        Log.d(chat.user.name + ": " + code);
        Api.replyRoom("서형봇 관리자방", "인증 요청 방: " + channel.name + "\n요청유저: " + chat.user.name + "\n인증코드 : " + code);
        user.code = code;
        save(channel.id, chat.raw.user_id, user);
        return;
      } else {
        channel.send("이미 인증코드가 발급되었습니다.");
        return;
      }
    }
  }

  if (chat.text.startsWith(".인증 ")) {
    if (user.code == null) {
      channel.send(chat.user.name + "님은 인증코드를 발급받지 않았습니다.\n'.인증'을 사용하여 인증코드를 먼저 받아주세요.");
      return;
    } else if (user.code != chat.text.substr(4)) {
      channel.send("인증코드가 올바르지 않습니다.\n코드를 다시 발급 해주세요.");
      user.code = null;
      save(channel.id, chat.raw.user_id, user);
      return;
    } else if (user.code == chat.text.substr(4)) {
      channel.send("관리자 인증이 완료되었습니다.");
      user.code = null;
      user.admin = true;
      save(channel.id, chat.raw.user_id, user);
      return;
    }
  }

  if (chat.text == ".인증초기화") {
    if (!user.admin) {
      channel.send(chat.user.name + "님은 인증을 하지 않았습니다.");
      return;
    } else {
      channel.send(chat.user.name + "님의 인증정보를 초기화하였습니다.\n다시 인증을 해주세요.");
      user.admin = false;
      save(channel.id, chat.raw.user_id, user);
      return;
    }
  }

  if (chat.text.startsWith("ev.")) {
    if (user.admin) {
      try {
        channel.send(eval(chat.text.substr(3)));
        java.lang.Thread.sleep(235);
        channel.send((Date.now() - delay - 235) / 1000 + 's');
      } catch (e) {
        channel.send('오류가 발생하였습니다.' + Lw + '\n' + Line +
          '[Error Name] : ' + ("" + e).split(':')[0].replace('E', ' E') +
          '\n[Error Message] : ' + e.message +
          '\n[Error Line] : ' + e.lineNumber +
          '\n[Code] :\n' + chat.text.substr(3) + Line +
          '\n[Stack]\n' + e.stack);
        return;
      }
      return;
    } else {
      channel.send("권한이 없습니다");
      return;
    }
  }

  if (chat.isReply() && chat.text === "!윗메") {
    channel.send(chat.source.getPrevChat().user.name + " : " + chat.source.getPrevChat().text);
    return;
  }

  if (chat.isReply() && chat.text === "!밑메") {
    channel.send(chat.source.getNextChat().user.name + " : " + chat.source.getNextChat().text);
    return;
  }

  if (chat.text == '!시간') {
    channel.send('날짜: ' + new Date().getFullYear() + '년 ' + (new Date().getMonth() + 1) + '월 ' + new Date().getDate() + '일\n시간: ' + new Date().getHours() + '시 ' + new Date().getMinutes() + '분 ' + new Date().getSeconds() + '초');
  }

  if (chat.text == ".방 등록") {
    if (user.admin) {
      if (Info.set.Reg) {
        channel.send("이미 방 등록이 완료되었습니다.");
        return;
      } else {
        Info.set.Reg = true;
        call_room.push(channel.name);
        Info_save(channel.id, Info);
        S_call_room(call_room);
        channel.send("방 등록이 완료되었습니다.");
        Api.replyRoom("서형봇 관리자방", "🔹𝑹𝒐𝒐𝒎 𝒓𝒆𝒈𝒊𝒔𝒕𝒓𝒂𝒕𝒊𝒐𝒏 𝒄𝒐𝒎𝒑𝒍𝒆𝒕𝒆🔹\n\n𝒓𝒐𝒐𝒎 : " + channel.name + "\n𝒓𝒐𝒐𝒎𝑰𝑫 : " + channel.id + "\n𝑳𝒊𝒏𝒌 : " + channel.openLink.url);
        Api.replyRoom("서형봇 테스트방", "🔹𝑹𝒐𝒐𝒎 𝒓𝒆𝒈𝒊𝒔𝒕𝒓𝒂𝒕𝒊𝒐𝒏 𝒄𝒐𝒎𝒑𝒍𝒆𝒕𝒆🔹\n\n𝒓𝒐𝒐𝒎 : " + channel.name + "\n𝒓𝒐𝒐𝒎𝑰𝑫 : " + channel.id);
      }
    } else {
      channel.send("권한이 없습니다");
    }
  }

  if (chat.text == ".방 삭제") {
    if (user.admin) {
      if (!Info.set.Reg) {
        channel.send("방이 등록되지 않았습니다.");
        return;
      } else {
        call_room.splice(call_room.indexOf(channel.name), 1);
        Info.set.Reg = false;
        Info_save(channel.id, Info);
        S_call_room(call_room);
        channel.send("방 삭제가 완료되었습니다.");
        Api.replyRoom("서형봇 관리자방", "🔸𝑹𝒐𝒐𝒎 𝒅𝒆𝒍𝒆𝒕𝒆𝒅🔸\n\n𝒓𝒐𝒐𝒎 : " + channel.name + "\n𝒓𝒐𝒐𝒎𝑰𝑫 : " + channel.id);
        Api.replyRoom("서형봇 테스트방", "🔸𝑹𝒐𝒐𝒎 𝒅𝒆𝒍𝒆𝒕𝒆𝒅🔸\n\n𝒓𝒐𝒐𝒎 : " + channel.name + "\n𝒓𝒐𝒐𝒎𝑰𝑫 : " + channel.id);
      }
    } else {
      channel.send("권한이 없습니다");
    }
  }

  if (chat.text.startsWith(".정보 ")) {
    if (user.admin || isAdmin) {
      if (isMention) {
        let taget_id = chat.mentions[0].raw.id;
        let taget_user = read(channel.id, taget_id);

        if (!taget_user) {
          channel.send('해당 유저의 정보가 없습니다.\n해당 유저의 채팅여부를 확인해주세요.');
          return;
        }

        channel.send('[ ' + taget_user.name + ' ] 님의 정보입니다.' + Lw + user_Info(taget_user));
      } else {
        let taget_user;
        let taget_code = chat.text.replace('.정보 ', '');

        try {
          taget_user = read(channel.id, user_list.find(e => e.Id == taget_code).userId);
        } catch (e) {
          channel.send('해당 코드와 일치하는 유저의 정보가 없습니다.\n코드를 올바르게 입력하셨는지 확인해주세요.');
          return;
        }

        if (!taget_user) {
          channel.send('해당 코드와 일치하는 유저의 정보가 없습니다.\n코드를 올바르게 입력하셨는지 확인해주세요.');
          return;
        }

        channel.send(" [ " + taget_user.name + " ] 님의 정보입니다." + Lw + user_Info(taget_user));
        return;
      }
    } else {
      channel.send("권한이 없습니다");
      return;
    }
  }

  if (chat.text == ".Info") {
    if (user.admin) {
      try {
        let nt = new Date().getFullYear() + ". " + (new Date().getMonth() + 1) + ". " + new Date().getDate() + ". " + new Date().getHours() + ':' + new Date().getMinutes() + ':' + new Date().getSeconds();
        channel.send('𝗣𝗲𝗿𝗰𝗲𝗶𝘃𝗲𝗱 𝗜𝗻𝗳𝗼𝗿𝗺𝗮𝘁𝗶𝗼𝗻' + Lw + '\n' + line +
          '\n𝗥𝗼𝗼𝗺 𝗡𝗮𝗺𝗲: ' + channel.name +
          '\n                        ㄴ ' + Info.Name +
          '\n𝗥𝗲𝗴𝗶𝘀𝘁𝗿𝗮𝘁𝗶𝗼𝗻 𝗦𝘁𝗮𝘁𝘂𝘀: ' + Info.set.Reg +
          '\n𝗥𝗼𝗼𝗺 𝗟𝗶𝗻𝗸: ' + Info.Link +
          '\n𝗶𝘀𝗖𝗥: ' + Info.set.cr + "\n" + line +
          '\n𝗨𝘀𝗲𝗿 𝗡𝗮𝗺𝗲: ' + chat.user.name +
          '\n                     ㄴ ' + user.name +
          '\n𝗖𝗵𝗮𝘁 𝗖𝗼𝘂𝗻𝘁: ' + user.chat.count + '회' +
          '\n𝗙𝗶𝗿𝘀𝘁 𝗖𝗵𝗮𝘁 𝗧𝗶𝗺𝗲: ' + user.chat.ft + '\n' + line +
          '\n𝗖𝘂𝗿𝗿𝗲𝗻𝘁 𝗧𝗶𝗺𝗲: ' + new Date() +
          '\n                         ㄴ ' + nt);
      } catch (e) {
        channel.send(e);
      }
    } else {
      channel.send("권한이 없습니다");
    }
  }

  if (/^!CR (.+)/.test(chat.text)) {
    let s = RegExp.$1.toLowerCase();

    if (user.admin || isAdmin) {
    
      switch (s) {
        case 'on':
          if (Info.set.cr) {
            channel.send('이미 채팅순위가 켜져있습니다.');
            return;
          }
          Info.set.cr = true;
          Info_save(channel.id, Info);
          channel.send('채팅순위가 켜졌습니다.');
          break;

        case 'off':
          if (!Info.set.cr) {
          channel.send('이미 채팅순위가 꺼져있습니다.');
          return;
          }
          Info.set.cr = false;
          Info_save(channel.id, Info);
          channel.send('채팅순위가 꺼졌습니다.');
          break;
      }
    }else{
      channel.send('권한이 없습니다.');
      return;
    }
  }

  if (chat.text == "!정보") {
    channel.send(" [ " + chat.user.name + " ] 님의 정보입니다." + Lw + user_Info(user));
    return;
  }

  if (chat.text == "!관리자 호출") {
    Api.replyRoom("서형봇 테스트방", "[서형봇]\n" + chat.user.name + "님이 " + "관리자를 호출하였습니다." + line + "ㆍ호출 방 : " + channel.id + "\n" + "ㆍ호출 닉네임 : " + chat.user.name + "(" + user.ID + ")\n" + "ㆍ호출시각: " + dS);
    Api.replyRoom("서형봇 관리자방", "[서형봇]\n" + chat.user.name + "님이 " + "관리자를 호출하였습니다." + line + "ㆍ호출 방 : " + channel.id + "\n" + "ㆍ호출 닉네임 : " + chat.user.name + "(" + user.ID + ")\n" + "ㆍ호출시각: " + dS);
  }

  if (chat.text == '!봇') {
    channel.send('[서형봇 디바이스 정보]\n\n' +
      '📱: Android ' + Device.getAndroidVersionName() +
      '\n🔋: ' + Device.getBatteryLevel() +
      "%\n🌡: " + Device.getBatteryTemperature() / 10 +
      '°C\n🔌: ' + ((Device.isCharging() == true) ? '충전중' : '충전중 아님') +
      "\n⚡️: " + Device.getBatteryVoltage() + "mV" +
      "\n📶 : " + Api.getContext().getSystemService(Context.WIFI_SERVICE).getConnectionInfo().getLinkSpeed() + "Mbps");
  }

  if (chat.text == "!채팅청소") {
    if (user.admin || isAdmin) {
      for (i = 0; i < 2; i++)  channel.send("ᅠᅠᅠᅠᅠᅠᅠᅠᅠᅠᅠᅠᅠᅠᅠᅠᅠᅠ‍");
      channel.send("❗채팅청소가 완료되었습니다❗");
    } else {
      channel.send("권한이 없습니다.");
    }
  }

  if (chat.text == '!채팅순위') {
    if (Info.set.cr == false) {
      channel.send('채팅순위 기능이 꺼져있습니다.');
      return;
    }
    let list = [];
    for (i in chatrank) list.push(i + ' - 채팅횟수: ' + chatrank[i] + '회');
    channel.send('[' + channel.name + '] 의 채팅순위입니다' + Lw + '\n\n' + list.sort((a, b) => b.split(' - 채팅횟수: ')[1].split('회')[0] - a.split(' - 채팅횟수: ')[1].split('회')[0]).map(e => (list.indexOf(e) + 1) + '위ㅣ' + e).join('\n\n'));
    return;
  }

  if (/^\.밴 @?(.+)$/.test(chat.text) || /^\.ban @?(.+)$/.test(chat.text)) {
    if (user.admin || isAdmin) {
      if (isMention) {
        let taget_id = chat.mentions[0].raw.id;
        let taget_user = read(channel.id, taget_id);

        if (!taget_user) {
          channel.send('해당 유저의 정보가 없습니다.\n해당 유저의 채팅여부를 확인해주세요.');
          return;
        }

        if (taget_user.admin) {
          channel.send("[경고]\n관리자는 밴을 할 수 없습니다.");
          return;
        }

        if (taget_user.Ban) {
          channel.send(taget_user.name + '님은 이미 밴(BAN) 상태입니다.');
          return;
        }

        taget_user.Ban = true;
        save(channel.id, taget_id, taget_user);
        channel.send(taget_user.name + '님이 관리자에 의해 밴(BAN) 되었습니다.\n이후 봇 사용이 제한됩니다.');
      } else {
        let taget_code = chat.text.replace('.밴 ', '').replace('.ban ', '');
        let taget_user = read(channel.id, user_list.find(e => e.Id === taget_code).userId);

        if (!taget_user) {
          channel.send('해당 코드와 일치하는 유저의 정보가 없습니다.\n코드를 올바르게 입력하셨는지 확인해주세요.');
          return;
        }

        if (taget_user.admin) {
          channel.send("[경고]\n관리자는 밴을 할 수 없습니다.");
          return;
        }

        if (taget_user.Ban) {
          channel.send(taget_user.name + '님은 이미 밴(BAN) 상태입니다.');
          return;
        }

        taget_user.Ban = true;
        save(channel.id, taget_id, taget_user);
        channel.send(taget_user.name + "님이 관리자에 의해 밴(BAN) 되었습니다.\n이후 봇 사용이 제한됩니다.");
        return;
      }
    } else {
      channel.send("권한이 없습니다");
      return;
    }
  }

  if (/^\.밴해제 @?(.+)$/.test(chat.text)) {
    if (user.admin || isAdmin) {
      if (isMention) {
        let taget_id = chat.mentions[0].raw.id;
        let taget_user = read(channel.id, taget_id);

        if (!taget_user) {
          channel.send('해당 유저의 정보가 없습니다.\n해당 유저의 채팅여부를 확인해주세요.');
          return;
        }

        if (!taget_user.Ban) {
          channel.send(taget_user.name + '님은 밴(BAN) 상태가 아닙니다.');
          return;
        }

        taget_user.Ban = false;
        save(channel.id, taget_id, taget_user);
        channel.send(taget_user.name + '님이 관리자에 의해 밴(BAN) 해제 되었습니다.\n이후 봇 사용이 가능합니다.');
      } else {
        let taget_code = chat.text.replace('.밴해제 ', '');
        let taget_user = read(channel.id, user_list.find(e => e.Id === taget_code).userId);

        if (!taget_user) {
          channel.send('해당 코드와 일치하는 유저의 정보가 없습니다.\n코드를 올바르게 입력하셨는지 확인해주세요.');
          return;
        }

        if (!taget_user.Ban) {
          channel.send(taget_user.name + '님은 밴(BAN) 상태가 아닙니다.');
          return;
        }

        taget_user.Ban = false;
        save(channel.id, taget_user.userID, taget_user);
        channel.send(taget_user.name + '님이 관리자에 의해 밴(BAN) 해제 되었습니다.\n이후 봇 사용이 가능합니다.');
        return;
      }
    } else {
      channel.send("권한이 없습니다");
      return;
    }
  }

  if (/^\.경고 @?(.+)\s(\d+)/.test(chat.text)) {
    let a = RegExp.$1; //사용자가 입력한 문자
    let b = RegExp.$2; //사용자가 입력한 숫자
    if (user.admin || isAdmin) {
      if (isMention) {
        let taget_id = chat.mentions[0].raw.id;
        let taget_user = read(channel.id, taget_id);

        if (!taget_user) {
          channel.send('해당 유저의 정보가 없습니다.\n해당 유저의 채팅여부를 확인해주세요.');
          return;
        }

        if(Number(b)<1){
          channel.send("[🚨오류🚨]\n1 이상의 유효한 숫자를 입력하세요.");
          return;
        }
        
        taget_user.warn += Number(b);
        save(channel.id, taget_id, taget_user);
        channel.send("[🚨경고 지급됨🚨]\n" + taget_user.name + "님에게 경고 " + b + "회가 지급되었습니다.");
        return;
      } else {
        let taget_code = a;
        let taget_user = read(channel.id, user_list.find(e => e.Id === taget_code).userId);

        if (!taget_user) {
          channel.send('해당 코드와 일치하는 유저의 정보가 없습니다.\n코드를 올바르게 입력하셨는지 확인해주세요.');
          return;
        }

        taget_user.warn += Number(b);
        save(channel.id, taget_user.userID, taget_user);
        channel.send("[🚨경고 지급됨🚨]\n" + taget_user.name + "님에게 경고 " + b + "회가 지급되었습니다.");
        return;
      }

    } else {
      channel.send("[🚫권한없음🚫]\n관리자만 경고를 지급 할 수 있습니다.");
      return;
    }
  }

  if (/^\.경고삭제 @?(.+)/.test(chat.text)) {
    let a = RegExp.$1; //사용자가 입력한 문자

    if (user.admin || isAdmin) {
      if (isMention) {
        let taget_id = chat.mentions[0].raw.id;
        let taget_user = read(channel.id, taget_id);

        if (!taget_user) {
          channel.send('해당 유저의 정보가 없습니다.\n해당 유저의 채팅여부를 확인해주세요.');
          return;
        }

        taget_user.warn = 0;
        save(channel.id, taget_id, taget_user);
        channel.send("[🚨경고 삭제됨🚨]\n" + taget_user.name + "님의 경고 수가 모두 삭제되었습니다.");
        return;
      } else {
        let taget_code = a;
        let taget_user = read(channel.id, user_list.find(e => e.Id === taget_code).userId);

        if (!taget_user) {
          channel.send('해당 코드와 일치하는 유저의 정보가 없습니다.\n코드를 올바르게 입력하셨는지 확인해주세요.');
          return;
        }

        taget_user.warn = 0;
        save(channel.id, taget_user.userID, taget_user);
        channel.send("[🚨경고 삭제됨🚨]\n" + taget_user.name + "님의 경고 수가 모두 삭제되었습니다.");
        return;
      }

    } else {
      channel.send("[🚫권한없음🚫]\n관리자만 경고를 지급 할 수 있습니다.");
      return;
    }
  }

  if (chat.text.startsWith("!노래 ")) {
    channel.send(songF(chat.text.substr(4)));
  }

  if(chat.text.startsWith("형봇아 ")){
    if (user.Ban) {
      channel.send("관리자에 의해 봇 사용이 금지되었습니다.");
      return;
    }

    var prompt = chat.text.replace("형봇아 ", "");

    if(!prompt||prompt==""){
      channel.send("❌ 실행할 코드를 입력해주세요.");
      return;
    }else{
      channel.send(shbot_ai(prompt, chat.user.name)); 
    }
  }

  if(chat.text=="!명령어"){
    channel.send("서형봇 명령어는 아래에서 확인하세요!\n\nhttps://shbot.mogo.kr/commands/");
  }
  
  if(chat.text === "!이미지검색"){
    let DEF_SITE = "https://shbot.mogo.kr"
    if(!chat.source || chat.source.raw.type !== 2){
      channel.send("검색하려는 이미지에 답장하는 형식으로 명령어를 사용해주세요.");
      return;
    }
    let url = chat.source.attachment.url
    let type = chat.source.attachment.mt
    if(Number(url.split("&")[1].substr(8))*1000 < Date.now()){
      channel.send("해당 이미지가 이미 만료되었습니다.\n만료일은 전송일로부터 3일 후 입니다.");
      return;
    }
  
    let data;
    try{
      let stream = new java.net.URL(url).openConnection().getInputStream()
      let html = requestImgSearch(stream, (type === "image/jpg"?"image/jpeg":type))
      stream.close();

      data = parseImgSearch(html, 3);
      }catch(e){
        Log.d(e);
        channel.send("이미지 검색 중 문제가 발생했습니다.");
        return;
      }

      if(!data.length){
        channel.send("검색 결과가 없습니다.");
        return;
      }

      while(data.length < 3){
        data.list.push({
          img: null,
          siteName: "-",
          desc: "-",
          site: DEF_SITE
        });
      }

      try{
        sendKakaoLink(channel.name, {
          templateId: "117161",
          templateArgs: {
          'desc1': data[0].desc,
          'siteName1':data[0].siteName,
          'img1':data[0].img.get(),
          'url1':data[0].site,
        
          'desc2': data[1].desc,
          'siteName2':data[1].siteName,
          'img2':data[1].img.get(),
          'url2':data[1].site,
        
          'desc3': data[2].desc,
          'siteName3':data[2].siteName,
          'img3':data[2].img.get(),
          'url3':data[2].site
        }});
        return;
    }catch(e){
      Log.d(e);
      channel.send("카카오링크 전송중 문제가 발생했습니다.");
      return;
    }
  }
  
  if(chat.text.startsWith('!노래검색 ')) {
    let a = searchMelon(chat.text.substr(6));
    if(!a.length || a.length < 2){ channel.send('검색결과가 없습니다.'); return; }
    
    try{
      sendKakaoLink(channel.name, {
        templateId: 97132,
        templateArgs: {
          'a1_title':a[0].SONGNAME,
          'a1_artist':a[0].ARTISTNAME,
          'a1_img':a[0].ALBUMIMG,
          'a2_title':a[1].SONGNAME,
          'a2_artist':a[1].ARTISTNAME,
          'a2_img':a[1].ALBUMIMG
        }
      });
        return;
    }catch(e){
      Log.d(e);
      channel.send("카카오링크 전송중 문제가 발생했습니다.");
      return;
    }
  }
});

/**
 * 오픈채팅에 들어왔을 때 반응
 */
DBListener.on("join", (chat, channel) => {
  let user_list = user_read(channel.id); //유저 정보 배열
  let Info = Info_read(channel.id);

  let dS = getdS();

  let user = read(channel.id, chat.joinUsers[0].userId); //유저정보

  if (!user) {
    let data = {
      "userID": chat.joinUsers[0].userId,
      "ID": generateId(),
      "name": chat.joinUsers[0].nickName,
      "Ban": false,
      "admin": false,
      "join": { "f": dS, "r": dS, "count": 0 },
      "leave": { "r": null, "count": 0 },
      "e_log": [],
      "chat": { "f": null, "ft": null, "r": null, "rt": null, "count": 0 },
      "memo": null,
      "mention": { "set_count": 100, "count": 0, "log": [] },
      "warn": 0,
      "nc": [],
      "code": null
    }

    while (user_list.find(e => e.Id === data.ID)) {
      data.ID = generateId();
    }

    let Data = {
      'name': chat.joinUsers[0].nickName,
      'Id': data.ID,
      'userId': chat.joinUsers[0].userId
    }

    user_list.push(Data);
    fs.write(path + channel.id + "/" + data.userID + ".txt", JSON.stringify(data, null, 4));

    user_save(channel.id, user_list);
    user = data;
  }

  user.join.r = dS;
  user.join.count++;

  user.e_log.push('[ ' + dS + ' ] ' + chat.joinUsers[0].nickName + ' | 입장');

  save(channel.id, user.userID, user);

  if (!Info.set.io || !Info.set.Reg) return;

  channel.send(chat.joinUsers[0].nickName + "님의 " + user.join.count + "번째 입장입니다" + Lw + user_Info(user));
});

DBListener.on("invite", (chat, channel) => {
  channel.send(chat.inviteUser.nickName + "님이" + chat.invitedUsers.map((e) => e.nickName).join(", ") + "님을 초대했습니다");
});

/**
 * 톡방에서 나갈 때
 */
DBListener.on("leave", (chat, channel) => {
  if (chat.isKicked()) {
    channel.send(chat.leaveUser.nickName + "님이 강퇴당했어요");
  } else {
    let Info = Info_read(channel.id); //방 info
    let user_list = user_read(channel.id); //유저 정보 배열
    let chatrank = Rank_read(channel.id);

    let dS = getdS();

    let user = read(channel.id, chat.leaveUser.userId); //유저정보

    if (!user) {
      let data = {
        "userID": chat.leaveUser.userId,
        "ID": generateId(),
        "name": chat.leaveUser.nickName,
        "Ban": false,
        "admin": false,
        "join": { "f": eu, "r": null, "count": 1 },
        "leave": { "r": dS, "count": 0 },
        "e_log": [],
        "chat": { "f": null, "ft": null, "r": null, "rt": null, "count": 0 },
        "memo": null,
        "mention": { "set_count": 100, "count": 0, "log": [] },
        "warn": 0,
        "nc": [],
        "code": null
      }

      while (user_list.find(e => e.Id === data.ID)) {
        data.ID = generateId();
      }

      let Data = {
        'name': chat.leaveUser.nickName,
        'Id': data.ID,
        'userId': chat.leaveUser.userId
      }

      user_list.push(Data);
      fs.write(path + channel.id + "/" + chat.leaveUser.userId + ".txt", JSON.stringify(data, null, 4));
      user_save(channel.id, user_list);
      user = data;
    }

    user.leave.r = dS;
    user.leave.count++;

    delete chatrank[user.name];

    user.e_log.push('[ ' + dS + ' ] ' + chat.leaveUser.nickName + ' | 퇴장');
    save(channel.id, user.userID, user);
    Rank_save(channel.id, chatrank);


    if (!Info.set.io || !Info.set.Reg) return;

    channel.send(chat.leaveUser.nickName + '님의 ' + user.leave.count + '번째 퇴장입니다' + Lw + user_Info(user));
  }
});
/**
 * 톡방에서 강퇴 당할 때
 */
DBListener.on("kick", (chat, channel) => {

  let Info = Info_read(channel.id); //방 info
  let user_list = user_read(channel.id); //유저 정보 배열
  let chatrank = Rank_read(channel.id);

  let dS = getdS();

  let user = read(channel.id, chat.kickedUser.userId); //유저정보

  if (!user) {
    let data = {
      "userID": chat.kickedUser.userId,
      "ID": generateId(),
      "name": chat.kickedUser.nickName,
      "Ban": false,
      "admin": false,
      "join": { "f": eu, "r": null, "count": 0 },
      "leave": { "r": dS, "count": 0 },
      "e_log": [],
      "chat": { "f": null, "ft": null, "r": null, "rt": null, "count": 0 },
      "memo": null,
      "mention": { "set_count": 100, "count": 0, "log": [] },
      "warn": 0,
      "nc": [],
      "code": null
    }

    while (user_list.find(e => e.Id === data.ID)) {
      data.ID = generateId();
    }

    let Data = {
      'name': chat.kickedUser.nickName,
      'Id': data.ID,
      'userId': chat.kickedUser.userId
    }

    user_list.push(Data);
    fs.write(path + channel.id + "/" + chat.kickedUser.userId + ".txt", JSON.stringify(data, null, 4));
    user_save(channel.id, user_list);
    user = data;
  }

  user.leave.r = dS;
  user.leave.count++;
  delete chatrank[user.name];

  user.e_log.push('[ ' + dS + ' ] ' + chat.kickedUser.nickName + ' | 강제퇴장');
  save(channel.id, chat.kickedUser.userId, user);
  Rank_save(channel.id, chatrank);

  if (!Info.set.io || !Info.set.Reg) return;

  channel.send(chat.kickedBy.name + "님이 " + chat.kickedUser.nickName + "님을 내보냈습니다" + Lw + user_Info(user));
});

/**
 * 누군가 메시지를 지웠을 때
 */
DBListener.on("delete", (chat, channel) => {
  let Info = Info_read(channel.id); //방 info
  if (!Info.set.del) return;
  channel.send(chat.deletedChat.user.name + "님이 메시지를 지웠어요");
});

/**
 * 방장이나 부방장이 메시지를 가렸을 때
 */
DBListener.on("hide", (chat, channel) => {
  let Info = Info_read(channel.id); //방 info
  if (!Info.set.hide || !Info.set.Reg) return;
  channel.send(chat.user.name + "님이 메시지를 가렸어요");
});

/**
 * 권한이 바뀔 때
 */
DBListener.on("member_type_change", (chat, channel) => {
  if (chat.isDemote()) {
    channel.send(chat.demoteUser.nickName + "님이 부방장에서 내려왔어요");
  } else if (chat.isPromote()) {
    channel.send(chat.promoteUser.nickName + "님이 부방장이 되었어요");
  } else if (chat.isHandover()) {
    channel.send(chat.newHost.nickName + "님이 새 방장이 되었어요");
  }
});

/**
 * 오픈채팅방에서 프로필을 바꿀 때
 */
DBListener.on("open_profile_change", (beforeUser, afterUser, channel) => {

  var dS = getdS();

  let user_list = user_read(channel.id); //유저 정보 배열
  let chatrank = Rank_read(channel.id); //채팅순위
  let user = read(channel.id, beforeUser.user_id); //유저정보

  if (!user) {
    let data = {
      "userID": afterUser.user_id,
      "ID": generateId(),
      "name": afterUser.name,
      "Ban": false,
      "admin": false,
      "join": { "f": eu, "r": null, "count": 0 },
      "leave": { "r": null, "count": 0 },
      "e_log": [],
      "chat": { "f": null, "ft": null, "r": null, "rt": null, "count": 0 },
      "memo": null,
      "mention": { "set_count": 100, "count": 0, "log": [] },
      "warn": 0,
      "nc": [],
      "code": nul
    }

    while (user_list.find(e => e.Id === data.ID)) {
      data.ID = generateId();
    }

    let Data = {
      'name': afterUser.name,
      'Id': data.ID,
      'userId': afterUser.user_id
    }

    user_list.push(Data);
    fs.write(path + channel.id + "/" + afterUser.user_id + ".txt", JSON.stringify(data, null, 4));
    user_save(channel.id, user_list);
    user = data;
  }
  
  //if(beforeUser.name===afterUser.name&&) return;
  
  
  user.nc.push("[ " + dS + " ]  " + beforeUser.name + " → " + afterUser.name);
  user_list.find(e => e.userId == afterUser.user_id).name = afterUser.name;
  delete chatrank[user.name];
  user.name = afterUser.name;
  user_save(channel.id, user_list);
  save(channel.id, afterUser.user_id, user);
  Rank_save(channel.id, chatrank);
  
  java.lang.Thread.sleep(105);
  channel.send("프로필 변경이 감지됐어요!\n" + beforeUser.name + " → " + afterUser.name);
  //java.lang.Thread.sleep(105);
  //channel.send(JSON.stringify(beforeUser)+"\n\n"+JSON.stringify(afterUserUser));
});

DBListener.start();

/** 유저정보 읽는 함수 */
function read(rId, Id) {
  return JSON.parse(fs.read(path + rId + "/" + Id + ".txt"));
}

/** 유저정보 저장하는 함수 */
function save(rId, Id, ob) {
  if (!read(rId, Id)) return false;

  fs.write(path + rId + "/" + Id + ".txt", JSON.stringify(ob, null, 4));
  return true;
}

/** 유저리스트 읽는 함수 */
function user_read(rId) {
  return JSON.parse(fs.read(path + rId + "/user_Data.txt"));
}

/** 유저리스트 저장하는 함수 */
function user_save(rId, ob) {
  if (!user_read(rId)) return false;

  fs.write(path + rId + "/user_Data.txt", JSON.stringify(ob, null, 4));
  return true;
}

/** 방 정보 읽는 함수 */
function Info_read(rId) {
  return JSON.parse(fs.read(path + rId + "/RoomInfo.txt"));
}

/** 방 정보 저장하는 함수 */
function Info_save(rId, ob) {
  fs.write(path + rId + "/RoomInfo.txt", JSON.stringify(ob, null, 4));
  return true;
}

/** 채팅기록 읽는 함수 */
function Chatlog(rId) {
  return JSON.parse(fs.read(path + rId + "/chatlog.txt"));
}

/** 채팅기록 저장하는 함수 */
function save_chatlog(rId, ob) {
  if (!Chatlog(rId)) return false;

  fs.write(path + rId + "/chatlog.txt", JSON.stringify(ob, null, 4));
  return true;
}

/** 방 배열 읽는 함수 */
function Call_room() {
  return JSON.parse(fs.read(path + "Local/call_room.txt"));
}

/** 방 배열 저장하는 함수 */
function S_call_room(ob) {
  fs.write(path + "Local/call_room.txt", JSON.stringify(ob));
  return true;
}

/** 채팅횟수 파일 읽는 함수 */
function Rank_read(rId) {
  return JSON.parse(fs.read(path + rId + "/ChatRank.txt"));
}

/** 채팅횟수 파일 저장하는 함수 */
function Rank_save(rId, ob) {
  if (!Rank_read(rId)) return false;

  fs.write(path + rId + "/ChatRank.txt", JSON.stringify(ob, null, 4));
  return true;
}

/** 보안코드 생성 함수 */
function createSC() {
  let result = '';
  let characters = '1BCD0FGHIJK4LMNO5QRTUVWXYZA23S678P9E';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/** text 정렬 함수 */
function chunkSubstr(str, size) {
  return str.match(new RegExp('.{1,' + size + '}', 'g'));
}

/** 고유ID 생성 함수 */
function generateId() {
  let result = '';
  let characters = 'AqBz1wCDxe2acEbbFGv3HsIJKdL5fMtN4pgOnPQmRSrhT6jUVoWkXyYiZ0l78u9';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function getLyrics(songId) {
  try{
    return org.jsoup.Jsoup.connect("https://www.melon.com/song/detail.htm?songId=" + songId).ignoreContentType(true).get().select("div#d_video_summary").html().split("--> ")[1].replace(/<br>/g, "");
  }catch(e){
    Log.e(e);
    return "가사 등록이 되지 않았어요!";
  }
}

function searchMelon(title, count) {
  let result;
  try {
    let R = JSON.parse(org.jsoup.Jsoup.connect("https://www.melon.com/search/keyword/index.json?j&query=" + title).ignoreContentType(true).execute().body());
    result = R.SONGCONTENTS.slice(0, count);
  } catch (e) {
    return;
  }
  return result;
}

function songF(title) {
  try {
    const data = searchMelon(title)[0];
  } catch (e) {
    return '검색결과가 없습니다.';
  }
  if (!data) {
    return '검색결과가 없습니다.';
  }
  return "\ud83c\udfb6" + data.ARTISTNAME + " - " + data.SONGNAME + "\ud83c\udfb6" + Lw + "\n" + Line + "\n" + getLyrics(data.SONGID);
}

function getdS() {
  let year = new Date().getFullYear().toString();
  let month = (new Date().getMonth() + 1).toString().padStart(2, "0");
  let day = new Date().getDate().toString().padStart(2, "0");
  let hours = new Date().getHours().toString().padStart(2, "0");
  let minutes = new Date().getMinutes().toString().padStart(2, "0");
  let seconds = new Date().getSeconds().toString().padStart(2, "0");
  return year + "." + month + "." + day + "  " + hours + ":" + minutes + ":" + seconds;
}

function sendKakaoLink(room, config){
  let data = {
    room: room,
    config: config
  }

  fs.write(
    KAKAOLINK_PATH+"/"+(Math.floor(Math.random()*99999)+1).toString()+Date.now().toString()+".json",
    JSON.stringify(data)
  );
}

function sendKaling(room, tempId, args){
  try{
    let scope = Bridge.getScopeOf("kakaolink-v2");
    scope.send(room, tempId, args || {});
  }catch(e){
    Log.d(e);
  }
}

/**
 * @param {object} user_data 
 * @returns {string}
 * 
 * 유저정보 출력 함수
 */
function user_Info(user_data) {
  return "\n\n[ 이름 ] : " + user_data.name +
    "\n[ ID ] : " + user_data.ID +
    "\n[ 봇 관리자 여부 ] : " + user_data.admin +
    "\n[ 경고 ] : " + user_data.warn + "회" +
    "\n[ 채팅횟수 ] : " + user_data.chat.count + "회" + '\n' +
    "\n[ 첫 채팅 ] : " + ((!user_data.chat.f) ? '첫 채팅을 감지하지 못했어요!' : user_data.chat.f) +
    "\n[ 첫 채팅 일시 ] : " + ((!user_data.chat.ft) ? '첫 채팅을 감지하지 못했어요!' : user_data.chat.ft) +
    "\n[ 최근 채팅 ] : " + ((!user_data.chat.r) ? '최근 채팅을 감지하지 못했어요!' : user_data.chat.r) +
    "\n[ 최근 채팅 일시 ] : " + ((!user_data.chat.rt) ? '최근 채팅을 감지하지 못했어요!' : user_data.chat.rt) +
    "\n\n[ 첫 입장 ] : " + ((user_data.join.f == eu) ? '첫 입장을 감지하지 못했어요!' : user_data.join.f) +
    "\n[ 최근 입장 ] : " + ((!user_data.join.r) ? '최근 입장을 감지하지 못했어요!' : user_data.join.r) +
    "\n\n[ 입퇴장 기록 ] :\n" + (!!user_data.e_log.length ? user_data.e_log.join('\n') : '입퇴장 기록이 없어요!') +
    "\n\n[ 닉네임 변경 기록 ] :\n" + (!!user_data.nc.length ? user_data.nc.join('\n') : '닉네임 변경 기록이 없어요!') + '\n' +
    InfoM;
}

//expiration: 시간 단위

function hostImage(image) {
    return java.util.concurrent.CompletableFuture.supplyAsync(() => JSON.parse(org.jsoup.Jsoup.connect("https://astraloa.mogo.kr/api/v1/image/create").requestBody(JSON.stringify({image: image})).ignoreHttpErrors(true).ignoreContentType(true).post().text()).image);
}



function requestImgSearch(stream, type) {
    try {
        let res = org.jsoup.Jsoup.connect("https://lens.google.com/v3/upload?hl=ko&st=" + Date.now()).ignoreContentType(true).data("encoded_image", "아라면먹고싶다", stream, type).method(org.jsoup.Connection.Method.POST).execute();

        let cookie = res.cookies()
        let url = res.parse().select(".crJ18e>div>div>a").get(3).attr("abs:href")

        return org.jsoup.Jsoup.connect(url).cookies(cookie).get();
    }
    catch (e) {
        throw e;
    }
}


function parseImgSearch(html, cnt) {
    try {
        let list = html.select(".kb0PBd.cvP2Ce:has(.vEWxFf)");
        let res = [];
        for (let i = 0; res.length < cnt; i++) {
            if (i >= list.length) {
                break;
            }
            let item = list.get(i);
            let site = item.select(".LBcIee").get(0).attr("href").trim();
            if (site.startsWith("/")) {
                continue;
            }
            let id = item.select(".gdOPf>img").attr("id");
            let img = item.select("script[nonce]").html().split(id)[0].split("'").reverse()[2].split(",")[1].trim().replace(/\\x3d/g, "=");
            let siteName = item.select(".iDBaYb").get(0).text().trim();
            let desc = item.select(".Yt787").get(0).text().trim();
            img = hostImage(img);
            res.push({img: img, siteName: siteName, desc: desc, site: site});
        }
        return res;
    }
    catch (e) {
        throw e;
    }
}

function searchMelon(title) {
  let result;
  let R = JSON.parse(org.jsoup.Jsoup.connect("https://www.melon.com/search/keyword/index.json?j&query=" + title).ignoreContentType(true).execute().body());
  try{ result = R.SONGCONTENTS.slice(0, 5); }
  catch(e){ result = []; }
    return result;
}

function sendNativeImage(chanId, path, type, context){
  let intent = new Intent()

  intent.setPackage("com.kakao.talk");
  intent.setType(type);
  intent.setAction(Intent.ACTION_SENDTO);
  intent.putExtra("key_id", new Long(chanId));
  intent.putExtra("key_type", new Integer(1));
  intent.putExtra("key_from_direct_share", true);
  if(path instanceof Array){
    intent.putExtra(Intent.EXTRA_STREAM, path.map(e=>Uri.fromFile(new File(e))));
  }else{
    intent.putExtra(Intent.EXTRA_STREAM, Uri.fromFile(new File(path)));
  }
  intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

  context.startActivity(intent);
}

function onStartCompile() {
  DBListener.stop();
  Api.gc();
}