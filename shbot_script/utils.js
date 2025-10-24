const IP = "192.168.0.120"; // iris 봇이 설치된 서버 IP
const PORT = 4655; // 원하는 포트 번호
const InfoM = '\n\n\n이 정보는 2024.07.22 이후부터 수집된 정보입니다.';
const KAKAOLINK_PATH = "sdcard/kakaolink";
const IMGBB_KEY = "121212";
const eu = 'eu';

var Big = require('lossless-json');
 // lossless 펴봤는 데 한번 해바요
 // 이거 신 스크립트에서 require 안돼있는거 같은디
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

function getdS() {
  let year = new Date().getFullYear().toString();
  let month = (new Date().getMonth() + 1).toString().padStart(2, "0");
  let day = new Date().getDate().toString().padStart(2, "0");
  let hours = new Date().getHours().toString().padStart(2, "0");
  let minutes = new Date().getMinutes().toString().padStart(2, "0");
  let seconds = new Date().getSeconds().toString().padStart(2, "0");
  return year + "." + month + "." + day + "  " + hours + ":" + minutes + ":" + seconds;
};

// userInfo는 req_userInfo에서 받아오는거에

function convertChat(data, userInfo) { // hello님 여기서 객체 v는 필요 없어요
  let result = { // ismine은 살아있으면 좋긴 합니다 // 그럼 객체 v에서 isMine만 빼주세요. 
    'text': data.msg,
    'type': data.json.type,
    'feedType': (Number(data.json.type) === 0 ? data.msg.feedType : null),
    'user': {
      'name': userInfo.nickname,
      'id': String(userInfo.user_id),
      "member_type": userInfo.link_member_type,
      "profile_type": userInfo.profile_type,
      "raw": userInfo
    },
    "channel": {
      "id": String(data.json.chat_id),
      "name": data.room
    },
    "chat_id": String(data.json.id),
    "prev_id": data.json.prev_id,
    "created_at": data.json.created_at,
    "attachment": data.json.attachment,
    "v": {
      "notDecoded": data.json.v.notDecoded,
      "origin": data.json.v.origin,
      "c": data.json.v.c,
      "modifyRevision": data.json.v.modifyRevision,
      "isSingleDefaultEmoticon": data.json.v.isSingleDefaultEmoticon,
      "defaultEmoticonsCount": data.json.v.defaultEmoticonsCount,
      "isMine": data.json.v.isMine,
      "enc": data.json.v.enc
    },
    "deleted_at": data.json.deleted_at,
    "raw": data
  }

  return result;
}

function req_userInfo(userID) {
  let url = `http://${IP}:3000/query`
  let query = `SELECT * FROM open_chat_member WHERE user_id = ${userID}`
  let result;

  try {
    result = org.jsoup.Jsoup.connect(url)
      .header("Content-Type", "application/json")
      .requestBody(JSON.stringify({ query: query, bind: [] }))
      .ignoreContentType(true)
      .method(org.jsoup.Connection.Method.POST)
      .execute().body();
  } catch (e) {
    result = e;
  }

  result = JSON.parse(result).data[0];
  return result;
}

function reqChatInfo(chatID) {
  let url = `http://${IP}:3000/query`
  let query = `SELECT * FROM chat_rooms WHERE id = ${chatID}`
  let result;

  try {
    result = org.jsoup.Jsoup.connect(url)
      .header("Content-Type", "application/json")
      .requestBody(JSON.stringify({ query: query, bind: [] }))
      .ignoreContentType(true)
      .method(org.jsoup.Connection.Method.POST)
      .execute().body();
  } catch (e) {
    result = e;
  }

  result = JSON.parse(result).data[0];
  return result;
}

function FindchatLog(logId) {
  let url = `http://${IP}:3000/query`;
  let q = `SELECT * FROM chat_logs WHERE id = ${logId}`;
  let result;

  try {
    result = org.jsoup.Jsoup.connect(url)
      .header("Content-Type", "application/json")
      .requestBody(JSON.stringify({ query: q, bind: [] }))
      .ignoreContentType(true)
      .method(org.jsoup.Connection.Method.POST)
      .execute().body();
  } catch (e) {
    result = e;
  }

  result = JSON.parse(result).data[0];
  return result;
}

function getNotices(chatID) {
  let url = `http://${IP}:3000/aot`
  let result;

  try {
    result = org.jsoup.Jsoup.connect(url)
      .header("Content-Type", "application/json")
      .ignoreContentType(true)
      .method(org.jsoup.Connection.Method.GET)
      .execute().body();
  } catch (e) {
    result = e;
  }

  let chatInfo = reqChatInfo(chatID);
  let authInfo = JSON.parse(result).aot;
  let session = authInfo.access_token + '-' + authInfo.d_id;

  let req_url = chatInfo.link_id ? 'https://open.kakao.com/moim' : 'https://talkmoim-api.kakao.com';
  req_url += '/chats/' + chatID + '/posts';
  if (chatInfo.link_id) req_url += '?link_id=' + chatInfo.link_id;
  const headers = {
    Authorization: session,
    'accept-language': 'ko',
    'content-type': 'application/x-www-form-urlencoded',
    'A': 'android/25.8.2/ko'
  };

  let built = org.jsoup.Jsoup.connect(req_url)
    .ignoreContentType(true)
    .ignoreHttpErrors(true)
    .method(org.jsoup.Connection.Method.GET);

  Object.keys(headers).map(header => built.header(header, headers[header]));

  return String(built.execute().body());
}

function shareNotice(chatID, noticeID) {
  let url = `http://${IP}:3000/aot`
  let result;

  try {
    result = org.jsoup.Jsoup.connect(url)
      .header("Content-Type", "application/json")
      .ignoreContentType(true)
      .method(org.jsoup.Connection.Method.GET)
      .execute().body();
  } catch (e) {
    result = e;
  }

  let chatInfo = reqChatInfo(chatID);
  let authInfo = JSON.parse(result).aot;
  let session = authInfo.access_token + '-' + authInfo.d_id;

  let req_url = chatInfo.link_id ? 'https://open.kakao.com/moim' : 'https://talkmoim-api.kakao.com';
  req_url += '/posts/' + noticeID + '/share';
  if (chatInfo.link_id) req_url += '?link_id=' + chatInfo.link_id;
  const headers = {
    Authorization: session,
    'accept-language': 'ko',
    'content-type': 'application/x-www-form-urlencoded',
    'A': 'android/25.8.2/ko'
  };

  let built = org.jsoup.Jsoup.connect(req_url)
    .ignoreContentType(true)
    .ignoreHttpErrors(true)
    .method(org.jsoup.Connection.Method.POST);

  Object.keys(headers).map(header => built.header(header, headers[header]));

  return String(built.execute().body());
}

function react(chatID, logID, type) {
  if (type == void 0) type = 3;
  let url = `http://${IP}:3000/aot`
  let result;

  try {
    result = org.jsoup.Jsoup.connect(url)
      .header("Content-Type", "application/json")
      .ignoreContentType(true)
      .method(org.jsoup.Connection.Method.GET)
      .execute().body();
  } catch (e) {
    result = e;
  }

  let chatInfo = reqChatInfo(chatID);
  let authInfo = JSON.parse(result).aot;
  let session = authInfo.access_token + '-' + authInfo.d_id;

  const req_url = 'https://talk-pilsner.kakao.com/messaging/chats/' + chatID + '/bubble/reactions';
  const params = {
    logId: logID,
    reqId: Date.now(),
    type: type,
    linkId: chatInfo.link_id
  };
  const headers = {
    Authorization: session,
    'talk-agent': 'android/25.8.2',
    'talk-language': 'ko',
    'content-type': 'application/json',
    'user-agent': 'okhttp/4.9.0'
  };

  let built = org.jsoup.Jsoup.connect(req_url)
    .requestBody(JSON.stringify(params))
    .ignoreContentType(true)
    .ignoreHttpErrors(true)
    .method(org.jsoup.Connection.Method.POST);

  Object.keys(headers).map(header => built.header(header, headers[header]));

  return String(built.execute().body());
}

function TalkApi(chatID, msg, attach, type) {
  if (!attach) attach = {};
  if (!type) type = 1;
  if (msg == void 0 || !chatID) return '{"result":false}';

  let url = `http://${IP}:3000/aot`
  let result;

  try {
    result = org.jsoup.Jsoup.connect(url)
      .header("Content-Type", "application/json")
      .ignoreContentType(true)
      .method(org.jsoup.Connection.Method.GET)
      .execute().body();
  } catch (e) {
    result = e;
  }

  let authInfo = JSON.parse(result).aot;
  let device_uuid = authInfo.d_id;
  let auth_token = authInfo.access_token;

  let counter = java.lang.String(device_uuid).hashCode();
  let timestamp = Date.now();

  function generate_message_id(counter, timestamp) {
    if (!timestamp) {
      timestamp = Date.now();
    }
    if (counter == void 0) {
      counter = 0;
    }
    let mod_value = 2147483547;
    let rounded_time = ((timestamp % mod_value) / 100) * 100;
    return rounded_time + counter;
  }

  let req_url = "https://talk-external.kakao.com/talk/write";

  let headers = {
    "Authorization": auth_token,
    "Duuid": device_uuid,
    "Content-Type": "application/json; charset=utf-8",
    "Accept-Encoding": "gzip, deflate, br",
    "User-Agent": "okhttp/4.12.0",
    "Connection": "keep-alive"
  };

  let data = {
    "chatId": chatID,
    "type": type,
    "message": msg,
    "attachment": Big.stringify(attach),
    "msgId": generate_message_id(counter, timestamp)
  };

  const built = org.jsoup.Jsoup.connect(req_url)
    .ignoreContentType(true)
    .ignoreHttpErrors(true)
    .method(org.jsoup.Connection.Method.POST)
    .requestBody(Big.stringify(data));

  Object.keys(headers).map(header => built.header(header, headers[header]));

  return String(built.execute().body());
}

TalkApi.toString = function () {
  return 'function TalkApi() { [native code] }';
}

TalkApi.toString.toString = function () {
  return 'function toString() { [native code] }';
}

TalkApi.toString.toString.toString = TalkApi.toString.toString;

/**
 * @param {object} user_data 
 * @returns {string}
 * 
 * 유저정보 출력 함수
 */
function makeInfo(user_data) {
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
    "\n\n\n[ 닉네임 변경 기록 ] :\n" + (!!user_data.nc.length ? user_data.nc.join('\n') : '닉네임 변경 기록이 없어요!') +
    InfoM;
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

/** 고유ID 생성 함수 */
function generateId() {
  let result = '';
  let characters = 'AqBz1wCDxe2acEbbFGv3HsIJKdL5fMtN4pgOnPQmRSrhT6jUVoWkXyYiZ0l78u9';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function query(q) {
  let url = `http://${IP}:3000/query`
  let result;

  try {
    result = org.jsoup.Jsoup.connect(url)
      .header("Content-Type", "application/json")
      .requestBody(JSON.stringify({ query: q, bind: [] }))
      .ignoreContentType(true)
      .method(org.jsoup.Connection.Method.POST)
      .execute().body();
  } catch (e) {
    result = e;
  }

  result = JSON.parse(result).data[0];
  return result;
}

function getPrevChat(chat) {
  let sid = chat.attachment.src_logId
  let pid = query(`SELECT prev_id FROM chat_logs WHERE id = ${sid}`).prev_id
  return query(`SELECT * FROM chat_logs WHERE id = ${pid}`)
}

function getNextChat(chat) {
  let sid = chat.attachment.src_logId
  let nid = query(`SELECT id FROM chat_logs WHERE prev_id = ${sid}`).id
  return query(`SELECT * FROM chat_logs WHERE id = ${nid}`)
}

function sendKakaoLink(room, config) {
  let data = {
    room: room,
    config: config
  }

  fs.write(
    KAKAOLINK_PATH + "/" + (Math.floor(Math.random() * 99999) + 1).toString() + Date.now().toString() + ".json",
    JSON.stringify(data)
  );
}


function hostImage(image) {
  return java.util.concurrent.CompletableFuture.supplyAsync(() => JSON.parse(org.jsoup.Jsoup.connect("https://astraloa.mogo.kr/api/v1/image/create").requestBody(JSON.stringify({ image: image })).ignoreHttpErrors(true).ignoreContentType(true).post().text()).image);
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
      res.push({ img: img, siteName: siteName, desc: desc, site: site });
    }
    return res;
  }
  catch (e) {
    throw e;
  }
}

function getLyrics(songId) {
  try {
    return org.jsoup.Jsoup.connect("https://www.melon.com/song/detail.htm?songId=" + songId).ignoreContentType(true).get().select("div#d_video_summary").html().split("--> ")[1].replace(/<br>/g, "");
  } catch (e) {
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

module.exports = {
  getdS: getdS,
  reqChatInfo: reqChatInfo,
  req_userInfo: req_userInfo,
  FindchatLog: FindchatLog,
  convertChat: convertChat,
  getNotices: getNotices,
  shareNotice: shareNotice,
  TalkApi: TalkApi,
  react: react,
  createSC: createSC,
  generateId: generateId,
  makeInfo: makeInfo,
  query: query,
  getPrevChat: getPrevChat,
  getNextChat: getNextChat,
  sendKakaoLink: sendKakaoLink,
  hostImage: hostImage,
  requestImgSearch: requestImgSearch,
  parseImgSearch: parseImgSearch,
  getLyrics: getLyrics,
  searchMelon: searchMelon,
  songF: songF
}