// 본 스크립트는 API2를 기반으로 제작되었음.

const bot = BotManager.getCurrentBot();
const IMGBB_KEY = "8080e762bce97982fa25924d1845eb58";

var gpt_key = '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';
var line = '\n' + '\u2501'.repeat(14) + '\n';
var Line = '\n' + '\u2501'.repeat(21) + '\n';
var Lw = '\u200b'.repeat(500);
var Lq = "\u200b".repeat(1);
var self_delete = true;

var amt = ['1', '4'];

var { openRoomDB, read, save, readByID, Info_read, Info_save, ChatRank } = require('DB_util');
var { reqChatInfo, req_userInfo, FindchatLog, getNotices, shareNotice, react, TalkApi, query, getPrevChat, getNextChat,
  makeInfo, createSC, generateId, sendKakaoLink, getdS, convertChat,
  hostImage, requestImgSearch, parseImgSearch,
  getLyrics, searchMelon, songF
} = require('utils');
var Big = require('lossless-json'); // required!

const LosslessReplacer = (key, value) => {
  try {
    if ('isLosslessNumber' in value) {
      return value.valueOf();
    }
  } catch (_) { }
  return value;
};

const eu = 'eu';

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

function onMessage(data) {
  let chat = convertChat(data, req_userInfo(data.json.user_id));
  let Chan = query(`select * from open_link where id=${reqChatInfo(chat.channel.id).link_id}`);
  let Info = Info_read(chat.channel.id);
  let delay = Date.now();
  let isReply = (Number(chat.type) === 26);
  let isAdmin = (amt.includes(chat.user.member_type));
  let user = read(chat.channel.id, chat.user.id);
  let dS = getdS();

  if (!Info) {
    let data = {
      "name": chat.channel.name,
      "roomID": chat.channel.id,
      "set": { 
        "del": true, // 
        "hide": true,
        "io": true,
        "cr": true,
        "game": false,
        "reg": false
      },
      "link": Chan.url,
      "license": {
        "approve_date": null,
        "expire_date": null,
        "remaining_day": null
      }
    }
    Info_save(chat.channel.id, data);
    Info = data;
  }

  if (!user) {
    let data = {
      "userID": chat.user.id,
      "ID": generateId(),
      "name": chat.user.name,
      "Ban": false,
      "admin": false,
      "join": { "f": null, "r": null, "count": 0 },
      "leave": { "r": null, "count": 0 },
      "chat": { "f": null, "ft": null, "r": null, "rt": null, "count": 0 },
      "mention": { "set_count": 150, "count": 0, "log": [] },
      "memo": null,
      "warn": 0,
      "nc": [],
      "e_log": [],
      "code": null,
      "isLeave": false
    }

    while (readByID(chat.channel.id, data.ID)) {
      data.ID = generateId();
    }

    save(chat.channel.id, chat.user.id, data);
    user = data;
  }

  /** 피드 메세지 처리부 */
  if (Number(chat.type) === 0) {
    let feedType = Number(chat.feedType);
    // if (chat.channel.id !== "1846419143377301421368") return; //임시 테스트용

    switch (feedType) {
      case 2:
        if (chat.text.member.nickName != user.name) {
          user.nc.push(`[ ${dS} ] ${user.name} → ${chat.text.member.nickName}`);
          user.name = chat.text.member.nickName;
        }

        user.join.f = eu;
        user.leave.r = dS;
        user.leave.count++;
        user.e_log.push(`[ ${dS} ] ${user.name} | 퇴장`);
        user.isLeave = true;
        save(chat.channel.id, chat.user.id, user);

        if (chat.channel.id !== "1846419143377301421368") return; //임시 테스트용
        send("text", chat.channel.id, `[ ${chat.text.member.nickName} ] 님의 ${user.leave.count}번째 퇴장입니다.${Lw}${makeInfo(user)}`);

        break;
      case 4:
        if (chat.text.members[0].nickName != user.name) {
          user.nc.push(`[ ${dS} ] ${user.name} → ${chat.text.members[0].nickName}`);
          user.name = chat.text.members[0].nickName;
        }

        if (!user.join.f) user.join.f = eu;
        user.join.r = dS;
        user.join.count++;
        user.e_log.push(`[ ${dS} ] ${user.name} | 입장`);
        user.isLeave = false;
        save(chat.channel.id, chat.user.id, user);

        if (chat.channel.id !== "1846419143377301421368") return; //임시 테스트용
        send("text", chat.channel.id, `[ ${chat.text.members[0].nickName} ] 님의 ${user.join.count}번째 입장입니다.${Lw}${makeInfo(user)}`);

        break;
      case 11:
      if (chat.channel.id !== "1846419143377301421368") return; //임시 테스트용
        send("text", chat.channel.id, `${chat.text.member.nickName}님이 부방장이 되었어요!`);
        break;
      case 12:
      if (chat.channel.id !== "1846419143377301421368") return; //임시 테스트용
        send("text", chat.channel.id, `${chat.text.member.nickName}님이 부방장에서 내려왔어요!`);
        break;
      case 14:
      if (chat.channel.id !== "1846419143377301421368") return; //임시 테스트용
        send("text", chat.channel.id, `${chat.user.name}님이 메세지를 삭제했어요!`);
        break;
      case 25:
      if (chat.channel.id !== "1846419143377301421368") return; //임시 테스트용
        send("text", chat.channel.id, `${chat.user.name}님이 메세지를 수정했어요!\n\n수정된 메세지: ${FindchatLog(chat.text.logId).message}`);
      case 26:
      if (chat.channel.id !== "1846419143377301421368") return; //임시 테스트용
        send("text", chat.channel.id, `${chat.user.name}님이 ${chat.text.chatLogInfos.length}개의 메세지를 가렸어요!`);
        break;
      default:
      if (chat.channel.id !== "1846419143377301421368") return; //임시 테스트용
        send("text", chat.channel.id, Lw + JSON.stringify(chat, null, 4));
        break;
    }

    return;
  }

  if(!user.chat.f){
    user.chat.f = chat.text;
    user.chat.ft = dS;
  }
  
  if(!user.join.f){
    user.join.f = dS;
    user.join.count++;
  }
  
  user.chat.rt = dS;
  user.chat.r = chat.text;
  user.chat.count++;
  save(chat.channel.id, chat.user.id, user);


  /** 봇 관리자 인증 */
  if (chat.text === ".인증") {
    if (user.admin) {
      send("text", chat.channel.id, `${chat.user.name}님은 이미 인증을 완료하였습니다.`);
      return;
    } else {
      let code;
      if (user.code == null) {
        code = createSC();
        send("text", chat.channel.id, "관리자방으로 인증코드가 전송되었습니다.");
        send("text", "18376212764476103", `인증 요청 방: ${chat.channel.name}\n요청유저: ${chat.user.name}\n인증코드: ${code}`);
        user.code = code;
        save(chat.channel.id, chat.user.id, user);
        return;
      } else {
        send("text", chat.channel.id, "이미 인증코드가 발급되었습니다.");
        return;
      }
    }
  }

  if (chat.text.startsWith(".인증 ")) {
    if (!user.code) {
      send("text", chat.channel.id, `${chat.user.name}님은 인증코드를 발급받지 않았습니다.\n'.인증'을 사용하여 인증코드를 먼저 받아주세요.`);
      return;
    } else if (user.code != chat.text.substr(4)) {
      send("text", chat.channel.id, "인증코드가 올바르지 않습니다.\n코드를 다시 발급 해주세요.");
      user.code = null;
      save(chat.channel.id, chat.user.id, user);
      return;
    } else if (user.code == chat.text.substr(4)) {
      send("text", chat.channel.id, "관리자 인증이 완료되었습니다.");
      user.code = null;
      user.admin = true;
      save(chat.channel.id, chat.user.id, user);
      return;
    }
  }

  if (chat.text.startsWith("ev.")) {
    if (user.admin) {
      try {
        send("text", chat.channel.id, String(eval(chat.text.substr(3))));
        java.lang.Thread.sleep(135);
        send("text", chat.channel.id, (Date.now() - delay - 135) / 1000 + 's');
      } catch (e) {
        send("text", chat.channel.id, '오류가 발생하였습니다.' + Lw + '\n' + Line +
          '[Error Name] : ' + ("" + e).split(':')[0].replace('E', ' E') +
          '\n[Error Message] : ' + e.message +
          '\n[Error Line] : ' + e.lineNumber +
          '\n[Code] :\n' + chat.text.substr(3) + Line +
          '\n[Stack]\n' + e.stack);
        return;
      }
    } else {
      send("text", chat.channel.id, "권한이 없습니다.");
    }
  }

  if (chat.text == "!정보") {
    send("text", chat.channel.id, `[ ${chat.user.name} ] 님의 정보입니다.${Lw + makeInfo(user)}`);
    return;
  }

  if (chat.text == "!명령어") send("text", chat.channel.id, `서형봇 명령어는 아래에서 확인하세요!\n\nhttps://shbot.mogo.kr/commands/`);

  if (chat.text == "!채팅청소") {
    if (user.admin || isAdmin) {
      for (i = 0; i < 2; i++)  send("text", chat.channel.id, "ᅠᅠᅠᅠᅠᅠᅠᅠᅠᅠᅠᅠᅠᅠᅠᅠᅠᅠ‍");
      send("text", chat.channel.id, "❗채팅청소가 완료되었습니다❗");
    } else {
      send("text", chat.channel.id, "권한이 없습니다.");
    }
  }

  /** 윗/밑메 */
  if (isReply && chat.text === "!윗메") {
    send("text", chat.channel.id, getPrevChat(chat));
    return;
  }

  if (isReply && chat.text === "!밑메") {
    send("text", chat.channel.id, getNextChat(chat));
    return;
  }

  if (chat.text === "!이미지검색") {
    let DEF_SITE = "https://shbot.mogo.kr"
    if (!chat.attachment || chat.attachment.src_type !== 2) {
      send("text", chat.channel.id, "검색하려는 이미지에 답장하는 형식으로 명령어를 사용해주세요.");
      return;
    }
    let url = JSON.parse(FindchatLog(chat.attachment.src_logId).attachment).url
    let type = JSON.parse(FindchatLog(chat.attachment.src_logId).attachment).mt
    if (Number(url.split("&")[1].substr(8)) * 1000 < Date.now()) {
      send("text", chat.channel.id, "해당 이미지가 이미 만료되었습니다.\n만료일은 전송일로부터 3일 후 입니다.");
      return;
    }

    let data;
    try {
      let stream = new java.net.URL(url).openConnection().getInputStream()
      let html = requestImgSearch(stream, (type === "image/jpg" ? "image/jpeg" : type))
      stream.close();

      data = parseImgSearch(html, 3);
    } catch (e) {
      Log.d(e);
      send("text", chat.channel.id, "이미지 검색 중 문제가 발생했습니다.");
      return;
    }

    if (!data.length) {
      send("text", chat.channel.id, "검색 결과가 없습니다.");
      return;
    }

    while (data.length < 3) {
      data.list.push({
        img: null,
        siteName: "-",
        desc: "-",
        site: DEF_SITE
      });
    }

    try {
      sendKakaoLink(chat.channel.name, {
        templateId: "117161",
        templateArgs: {
          'desc1': data[0].desc,
          'siteName1': data[0].siteName,
          'img1': data[0].img.get(),
          'url1': data[0].site,

          'desc2': data[1].desc,
          'siteName2': data[1].siteName,
          'img2': data[1].img.get(),
          'url2': data[1].site,

          'desc3': data[2].desc,
          'siteName3': data[2].siteName,
          'img3': data[2].img.get(),
          'url3': data[2].site
        }
      });
      return;
    } catch (e) {
      Log.d(e);
      send("text", chat.channel.id, "카카오링크 전송중 문제가 발생했습니다.");
      return;
    }
  }

  if (chat.text.startsWith('!노래검색 ')) {
    let a = searchMelon(chat.text.substr(6));
    if (!a.length || a.length < 2) { send("text", chat.channel.id, '검색결과가 없습니다.'); return; }

    try {
      sendKakaoLink(chat.channel.name, {
        templateId: 97132,
        templateArgs: {
          'a1_title': a[0].SONGNAME,
          'a1_artist': a[0].ARTISTNAME,
          'a1_img': a[0].ALBUMIMG,
          'a2_title': a[1].SONGNAME,
          'a2_artist': a[1].ARTISTNAME,
          'a2_img': a[1].ALBUMIMG
        }
      });
      return;
    } catch (e) {
      Log.d(e);
      send("text", chat.channel.id, "카카오링크 전송중 문제가 발생했습니다.");
      return;
    }
  }


}

/* 
 * 아래 코드는 Iris server 환경설정임
 * 수정 금지
 */

const ServerSocket = java.net.ServerSocket;
const InputStream = java.io.InputStream;
const ByteArrayOutputStream = java.io.ByteArrayOutputStream;
const StandardCharsets = java.nio.charset.StandardCharsets;
const SocketException = java.net.SocketException;
const Executors = java.util.concurrent.Executors;
const TimeUnit = java.util.concurrent.TimeUnit;

const IP = "192.168.0.120"; // iris 봇이 설치된 서버 IP
const PORT = 4655; // 원하는 포트 번호
const HTTP_OK = "HTTP/1.1 200 OK\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
const HTTP_BAD_REQUEST = "HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
const HTTP_INTERNAL_ERROR = "HTTP/1.1 500 Internal Server Error\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";

let server = null;
let running = true;
let executorService = null;


/** @description 서버 소켓, 스레드 풀 종료 */
function stopServer() {
  running = false;
  if (executorService !== null) {
    try {
      executorService.shutdown();
      if (!executorService.awaitTermination(5, TimeUnit.SECONDS)) executorService.shutdownNow();
    } catch (e) {
      Log.e(`${e.name}\n${e.message}\n${e.stack}`);
      executorService.shutdownNow();
    }
    executorService = null;
  }

  if (server !== null && !server.isClosed()) {
    try {
      server.close();
    } catch (e) {
      Log.e(`${e.name}\n${e.message}\n${e.stack}`);
    }
  }
}

/**
 * @description HTTP 응답 전송
 * @param {java.net.Socket} socket
 * @param {java.io.OutputStream} out
 * @param {string} response
 */
function sendHttpResponse(socket, out, response) {
  try {
    if (socket && !socket.isClosed() && !socket.isOutputShutdown() && out) {
      let jstr = new java.lang.String(response);
      out.write(jstr.getBytes(StandardCharsets.UTF_8));
      out.flush();
    }
  } catch (e) {
    Log.e(`${e.name}\n${e.message}\n${e.stack}`);
  }
}

/**
 * 
 * @param {String} type ["text", "image", "multiImage"]
 * @param {String|Number} roomId 방 아이디
 * @param {String} data 메시지 또는 Base64 문자열
 * @returns 
 */
function send(type, roomId, data) {
  try {
    const res = org.jsoup.Jsoup.connect(`http://${IP}:3000/reply`)
      .header("Content-Type", "application/json")
      .requestBody(JSON.stringify({
        type: type, //["text", "image", "multiImage"]
        room: String(roomId),
        data: data
      }))
      .ignoreContentType(true)
      .post();

    Log.i(`irisReply(${type}) to room ${roomId}`);
    return true;
  } catch (e) {
    Log.e(`irisReply(Jsoup) error: ${e.name}\n${e.message}\n${e.stack}`);
    return false;
  }
}


/**
 * @description 라인을 바이트 배열로 반환
 * @param {java.io.InputStream} inStream
 * @returns {byte[]|null}
 */
function readLineBytes(inStream) {
  let buf = new ByteArrayOutputStream();
  let prev = -1;
  let curr;

  try {
    while ((curr = inStream.read()) !== -1) {
      if (prev === 0x0D && curr === 0x0A) return buf.toByteArray();
      else {
        buf.write(curr);
        prev = curr;
      }
    }
  } catch (e) {
    Log.e(`${e.name}\n${e.message}\n${e.stack}`);
    return null;
  }

  return buf.size() > 0 ? buf.toByteArray() : null;
}

/** 
 * @description attachment JSON 문자열 내 큰 정수 ID 키를 문자열로 강제 
 */
function _quoteBigIntIds(jsonText) {
    // 키 목록 (필요 시 확장)
    const ID_KEYS = [
        "src_logId", "src_userId",
        "user_id", "chat_id", "id", "prev_id", "client_message_id",
        "src_id", "msg_id"
    ];
    const pattern = new RegExp(
        `"(${ID_KEYS.join("|")})"\\s*:\\s*(-?\\d{15,})(?=\\s*[,}\\]])`,
        "g"
    );
    return jsonText.replace(pattern, (_match, key, num) => `"${key}": "${num}"`);
}


/** @description 메인 서버 루프 */
function run() {
  executorService = Executors.newCachedThreadPool();
  try {
    server = new ServerSocket(PORT);
    Log.i(`서버 시작됨 (포트: ${PORT})`); // 서버 시작 로그, 지우고 싶으면 지워도 됨

    while (running) {
      let sock = null;
      try {
        sock = server.accept();
        sock.setSoTimeout(10000);
        let client = sock;

        executorService.submit(new java.lang.Runnable({
          run: () => {
            let threadName = java.lang.Thread.currentThread().getName();
            try {
              let inStream = client.getInputStream();
              let outStream = client.getOutputStream();

              // 헤더 첫 줄
              let rl = readLineBytes(inStream);
              if (!rl) return sendHttpResponse(client, outStream, HTTP_BAD_REQUEST);
              let reqLine = new java.lang.String(rl, StandardCharsets.UTF_8).trim();

              let isMessage = reqLine.startsWith("POST /message"); //수신
              let isSend = reqLine.startsWith("POST /send"); //발신
              if (!isMessage && !isSend) return sendHttpResponse(client, outStream, HTTP_BAD_REQUEST);


              let headers = {};
              let len = 0;
              let hb;
              while ((hb = readLineBytes(inStream)) !== null) {
                if (hb.length <= 2) break; // \r\n 만나면 헤더 끝
                let line = new java.lang.String(hb, StandardCharsets.UTF_8).trim();
                let idx = line.indexOf(":");
                if (idx > 0) {
                  let k = line.substring(0, idx).trim().toLowerCase();
                  let v = line.substring(idx + 1).trim();
                  headers[k] = v;
                  if (k.equals("content-length")) {
                    try {
                      len = parseInt(v);
                      if (len < 0) len = 0;
                    } catch (_) {
                      return sendHttpResponse(client, outStream, HTTP_BAD_REQUEST);
                    }
                  }
                }
              }

              // 본문 읽기
              let bodyJS = "";
              if (len > 0) {
                let bufBytes = new java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, len);
                let total = 0,
                  readn;

                while (total < len && (readn = inStream.read(bufBytes, total, len - total)) !== -1) {
                  if (readn === 0) {
                    java.lang.Thread.sleep(10);
                    continue;
                  } // Prevent busy-waiting
                  total += readn;
                }

                if (total !== len) return sendHttpResponse(client, outStream, HTTP_INTERNAL_ERROR);
                let jb = new java.lang.String(bufBytes, StandardCharsets.UTF_8);
                bodyJS = String(jb);
              }

              // JSON 파싱
              let data = {};
              if (bodyJS.length > 0) {
                try {
                  data = JSON.parse(bodyJS); 
                } catch (e) {
                  Logger.e(_SCRIPT_NAME, e);
                  sendHttpResponse(client, outStream, HTTP_BAD_REQUEST);
                  return;
                }
                if (typeof data.msg === "string") {
                  try {
                    data.msg = JSON.parse(data.msg);
                  } catch (_) { }
                }
                // 중첩 JSON 파싱
                if (typeof data.msg === "string") {
                    try { data.msg = JSON.parse(data.msg); } catch (_) {}
                }
                if (data.json) {
                  ["message", "attachment", "v"].forEach((field) => {
                    let val = data.json[field];
                    if (typeof val === "string") {
                      try {
                          if (field === "attachment") {
                            val = _quoteBigIntIds(val);
                          }
                          data.json[field] = JSON.parse(val);
                      } catch (_) { /* 파싱 실패 시 원본 유지 */ }
                    }
                  });
                }
              }

              if (isMessage) {
                try {
                  onMessage(data); // 사용자 정의 함수 호출, 필요에 따라 수정
                  Log.i(`스레드: ${threadName}\n\n받은 데이터:\n${data.length > 0 ? JSON.stringify(data, null, 2) : "Empty body"}`);
                } catch (e) {
                  Log.e(`onMessage 함수 오류: ${e.name}\n${e.message}\n${e.stack}`);
                }
                return sendHttpResponse(client, outStream, HTTP_OK);
              }

              if (isSend) {
                let ok = send(data.type, data.room, data.data);
                Log.i(`스레드: ${threadName}\n\n보낸 데이터:\n${bodyJS.length > 0 ? JSON.stringify(data, null, 2) : "Empty body"}\n\n결과: ${ok}`);
                return sendHttpResponse(client, outStream, ok ? HTTP_OK : HTTP_INTERNAL_ERROR);
              }
            } catch (e) {
              Log.e(`클라이언트 핸들러 오류: ${e.name}\n${e.message}\n${e.stack}`);
              try {
                sendHttpResponse(client, client.getOutputStream(), HTTP_INTERNAL_ERROR);
              } catch (_) { }
            } finally {
              try {
                if (client && !client.isClosed()) client.close();
              } catch (e) {
                Log.e(`클라이언트 소켓 종료 오류: ${e.name}\n${e.message}\n${e.stack}`);
              }
            }
          }
        }));
      } catch (e) {
        // SocketException이 아닌 경우에만 로그
        if (!(e instanceof SocketException && running === false) && running) {
          Log.e(`서버 연결 오류: ${e.name}\n${e.message}\n${e.stack}`);
        }
        if (sock && !sock.isClosed()) {
          try {
            sock.close();
          } catch (e) {
            Log.e(`서버 연결 종료 오류: ${e.name}\n${e.message}\n${e.stack}`);
          }
        }
      }
    }
  } catch (e) {
    Log.e(`서버 실행 오류: ${e.name}\n${e.message}\n${e.stack}`);
  } finally {
    Log.i("서버 종료 중...");
    stopServer();
    Log.i("서버 종료됨");
  }
}

// 서버 실행
let serverThread = new java.lang.Thread(new java.lang.Runnable({
  run: run
}));
serverThread.setName("RhinoHttpServerThread");
serverThread.start();

/**
 * @description 컴파일 시작 시 서버 종료
 * 레거시 API 기준으로 작성한 거라, API2라면 이벤트 등록을 해야 합니다
 */
function onStartCompile() {
  Log.i("컴파일 시작, 서버 종료 중...");
  stopServer();
}

bot.addListener(Event.START_COMPILE, onStartCompile);