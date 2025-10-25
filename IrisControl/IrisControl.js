////////////////////////// 해당 코드의 수정을 금함. ////////////////////////////


var ServerSocket = java.net.ServerSocket;
var SocketException = java.net.SocketException;
var Executors = java.util.concurrent.Executors;
var TimeUnit = java.util.concurrent.TimeUnit;
var ByteArrayOutputStream = java.io.ByteArrayOutputStream;
var StandardCharsets = java.nio.charset.StandardCharsets;

var globalConfig = { IP: null, PORT: null };
var HTTP = {
  Ok: "HTTP/1.1 200 OK\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
  BadRequest: "HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
  InternalError: "HTTP/1.1 500 Internal Server Error\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
};

////////////////////
//// 유틸 함수들 ////
////////////////////

/**
 * @description 라인 헤더 읽기
 */
function readLine(inputStream) {
  var buf = new ByteArrayOutputStream();
  var prev = -1, curr;

  try {
    while ((curr = inputStream.read()) != -1) {
      if (prev === 0x0D && curr === 0x0A) return buf.toByteArray();
      if (prev !== -1) buf.write(prev);
      prev = curr;
    }
  } catch (e) {
    return null;
  }
  if (prev !== 0x0A && prev !== 0x0D && prev !== -1) buf.write(prev);
  return buf.size() > 0 ? buf.toByteArray() : null;
}

/**
 * @description 안전 JSON 파싱
 */
function safeJsonParse(text, fallback) {
  fallback = fallback || {};
  try {
    return JSON.parse(String(text));
  } catch (e) {
    return fallback;
  }
}

/**
 * @description BigInteger 변환
 */
function quoteBigIntIds(text) {
  var ID_KEYS = [
    "src_logId", "src_userId",
    "user_id", "chat_id", "id", "prev_id", "client_message_id",
    "src_id", "msg_id"
  ];
  var pattern = new RegExp('"' + ID_KEYS.join("|") + '"\\s*:\\s*(-?\\d{15,})(?=\\s*[,}\\]])', "g");
  return text.replace(pattern, function(_m, key, num) { return '"' + key + '": "' + num + '"'; });
}

/**
 * @description HTTP 응답 전송
 */
function sendHttpResponse(socket, out, responseText) {
  try {
    if (!socket.isClosed()) {
      var jstr = new java.lang.String(responseText);
      out.write(jstr.getBytes(StandardCharsets.UTF_8));
      out.flush();
    }
  } catch (e) {
    Log.e("IrisControl", "HTTP 응답 전송 중 오류 발생: " + e.message + " ( " + e.stack + " )");
  }
}

/**
 * @description 메시지 전송 (/reply)
 */
function sendMessage(IP, type, roomId, data) {
  try {
    org.jsoup.Jsoup.connect("http://" + IP + ":3000/reply")
      .header("Content-Type", "application/json")
      .requestBody(JSON.stringify({
        type: type,
        roomId: roomId,
        data: data
      }))
      .ignoreContentType(true)
      .post();

    Log.i("IrisControl", "메시지 전송 완료: type=" + type + ", roomId=" + roomId);
    return true;
  } catch (e) {
    Log.e("IrisControl", "메시지 전송 중 오류 발생: " + e.message + " ( " + e.stack + " )");
    return false;
  }
}

/**
 * @description 헤더 파싱 
 */
function readHeaders(inputStream) {
  var headers = {};
  var len = 0, hb;

  while ((hb = readLine(inputStream)) !== null) {
    if (hb.length <= 2) break; // 빈 라인: 헤더 종료
    var line = new java.lang.String(hb, StandardCharsets.UTF_8).trim();
    var idx = line.indexOf(":");
    if (idx > 0) {
      var key = line.substring(0, idx).trim().toLowerCase();
      var value = line.substring(idx + 1).trim();
      headers[key] = value;
      if (key === "content-length") {
        var n = parseInt(value, 10);
        if (!isNaN(n) && n > 0) len = n;
      }
    }
  }
  return { headers: headers, contentLength: len };
}

/**
 * @description 본문 읽기 
 */
function readBody(inputStream, contentLength) {
  if (!contentLength || contentLength <= 0) return null;
  
  var buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, contentLength);
  var total = 0, readn = 0;
  
  try {
    while (total < contentLength) {
      readn = inputStream.read(buf, total, contentLength - total);
      if (readn < 0) return null; // 스트림 종료
      total += readn;
    }
  } catch (e) {
    Log.e("IrisControl", "본문 읽기 중 오류 발생: " + e.message + " ( " + e.stack + " )");
    return null;
  }
  
  if (total !== contentLength) return null;
  return String(new java.lang.String(buf, StandardCharsets.UTF_8));
}

/**
 * @description 요청 첫 줄 파싱
 */
function parseRequestLine(requestLine) {
  var parts = requestLine.split(" ");
  return {
    method: (parts[0] || "").toUpperCase(),
    path: (parts[1] || ""),
    protocol: (parts[2] || "")
  };
}

/**
 * @description data.json의 특정 필드가 문자열 JSON이면 파싱
 */
function nestedJson(data) {
  if (!data || typeof data !== "object") return data;

  if (typeof data.msg === "string") {
    var parsedMsg = safeJsonParse(data.msg, null);
    data.msg = parsedMsg;
  }

  if (data.json && typeof data.json === "object") {
    ["message", "attachment", "v"].forEach(function(field) {
      var val = data.json[field];
      if (typeof val === "string") {
        var src = val;
        if (field === "attachment") src = quoteBigIntIds(val);
        data.json[field] = safeJsonParse(src, val);
      }
    });
  }
  return data;
}

////////////////////////////////////////
//// IrisManager 생성자 및 프로토타입 ////
////////////////////////////////////////

/**
 * @constructor
 * @description 아이리스 서버 연결 및 이벤트 관리
 */
function IrisManager(IP, PORT) {
  this.IP = IP;
  this.PORT = Number(PORT);
  this.server = null;
  this.running = false;
  this.executorService = null;
  this.listeners = {
    "message": [],
    "join": [],
    "leave": [],
    "all": []
  };
}

/**
 * @description 이벤트 리스너 등록
 */
IrisManager.prototype.on = function(event, callback) {
  if (this.listeners[event] && typeof callback === "function") {
    this.listeners[event].push(callback);
    Log.i("IrisManager", "이벤트 리스너 등록됨: " + event);
  } else {
    Log.e("IrisManager", "알 수 없는 이벤트 또는 콜백 오류: " + event);
  }
};

/**
 * @description 등록된 이벤트 리스너 호출
 */
IrisManager.prototype.emit = function(event, chat, channel) {
  var data = [chat, channel]; // 인자를 배열로 만들어 apply 사용
  if (this.listeners[event]) {
    this.listeners[event].forEach(function(callback) {
      try {
        callback.apply(null, data);
      } catch (e) {
        Log.e("IrisManager", "이벤트(" + event + ") 콜백 오류: " + e.name + "\n" + e.message + "\n" + e.stack);
      }
    });
  }
};

/**
 * @description 데이터 타입에 따라 이벤트 발송
 */
IrisManager.prototype.processMessage = function(data) {
    if (!data) return;

    var chat = data.chat;
    var channel = data.room;
    
    // 1. "all" 이벤트 (모든 피드 반응)
    this.emit("all", chat, channel);

    // 2. 메시지/조인/퇴장 이벤트 분기 (가정된 로직)
    var isJoin = data.type === "join" || (data.json && data.json.type === "join");
    var isLeave = data.type === "leave" || (data.json && data.json.type === "leave");

    if (isJoin) {
        this.emit("join", chat, channel);
    } else if (isLeave) {
        this.emit("leave", chat, channel);
    } else {
        this.emit("message", chat, channel);
    }
};

/**
 * @description 서버 종료
 */
IrisManager.prototype.stop = function() {
  this.running = false;
  var self = this;

  if (this.executorService !== null) {
    try {
      this.executorService.shutdown();
      if (!this.executorService.awaitTermination(5, TimeUnit.SECONDS)) this.executorService.shutdownNow();
    } catch (e) {
      Log.e("IrisControl", "서버 종료 중 오류 발생: " + e.message + " ( " + e.stack + " )");
      this.executorService.shutdownNow();
    }
    this.executorService = null;
  }

  if (this.server !== null && !this.server.isClosed()) {
    try {
      this.server.close();
    } catch (e) {
      Log.e("IrisControl", "서버 소켓 종료 중 오류 발생: " + e.message + " ( " + e.stack + " )");
    }
    this.server = null;
  }
  Log.i("IrisControl", "서버 종료됨: " + this.IP + ":" + this.PORT);
};

/**
 * @description 서버 메인 루프 실행
 */
IrisManager.prototype.run = function() {
  var self = this;
  this.executorService = Executors.newCachedThreadPool();
  this.running = true;

  try {
    this.server = new ServerSocket(this.PORT);
    Log.i("IrisControl", "서버 시작됨: " + this.IP + ":" + this.PORT);

    while (this.running) {
      var socket = null;
      try {
        socket = this.server.accept();
        socket.setSoTimeout(10000);
        var client = socket;

        this.executorService.submit(new java.lang.Runnable({
          run: function() {
            var threadName = "IrisControl-Client-" + java.lang.Thread.currentThread().getName();

            try {
              var inStream = client.getInputStream();
              var outStream = client.getOutputStream();

              var requestLineBytes = readLine(inStream);
              if (!requestLineBytes) return sendHttpResponse(client, outStream, HTTP.BadRequest);

              var requestLine = new java.lang.String(requestLineBytes, StandardCharsets.UTF_8).trim();
              var req = parseRequestLine(requestLine);
              var method = req.method;
              var path = req.path;

              var isMessage = method === "POST" && path === "/message";
              var isSend = method === "POST" && path === "/reply";
              if (!isMessage && !isSend) return sendHttpResponse(client, outStream, HTTP.BadRequest);

              var headersResult = readHeaders(inStream);
              var contentLength = headersResult.contentLength;
              var body = readBody(inStream, contentLength);
              if (!body) return sendHttpResponse(client, outStream, HTTP.InternalError);

              var data = safeJsonParse(body, null);
              if (!data) return sendHttpResponse(client, outStream, HTTP.BadRequest);
              
              data = nestedJson(data);

              if (isMessage) {
                try {
                  self.processMessage(data); // 이벤트 시스템 호출
                  Log.i("IrisControl", "스레드: " + threadName + "\n\n받은 데이터:\n" + (Object.keys(data).length > 0 ? JSON.stringify(data, null, 2) : "Empty body"));
                } catch (e) {
                  Log.e("IrisControl", "processMessage 함수 오류: " + e.name + "\n" + e.message + "\n" + e.stack);
                }
                return sendHttpResponse(client, outStream, HTTP.Ok);
              }

              if (isSend) {
                var ok = sendMessage(self.IP, 3000, data.type, data.roomId, data.data);
                Log.i("IrisControl", "스레드: " + threadName + "\n\n전송 데이터:\n" + (Object.keys(data).length > 0 ? JSON.stringify(data, null, 2) : "Empty body"));
                return sendHttpResponse(client, outStream, ok ? HTTP.Ok : HTTP.InternalError);
              }
            } catch (e) {
              Log.e("IrisControl", "클라이언트 처리 중 오류 발생: " + e.message + " ( " + e.stack + " )");
              try {
                sendHttpResponse(client, client.getOutputStream(), HTTP.InternalError);
              } catch (e) {}
            } finally {
              try {
                if (client && !client.isClosed()) client.close();
              } catch (e) {
                Log.e("IrisControl", "클라이언트 소켓 종료 중 오류 발생: " + e.message + " ( " + e.stack + " )");
              }
            }
          }
        }));
      } catch (e) {
        if (!(e instanceof SocketException && !self.running)) {
          Log.e("IrisControl", "서버 메인 루프 오류 발생: " + e.message + " ( " + e.stack + " )");
        }
        if (socket && !socket.isClosed()) {
          try {
            socket.close();
          } catch (e) {
            Log.e("IrisControl", "소켓 종료 중 오류 발생: " + e.message + " ( " + e.stack + " )");
          }
        }
      }
    }
  } catch (e) {
    Log.e("IrisControl", "서버 시작 중 오류 발생: " + e.message + " ( " + e.stack + " )");
  } finally {
    self.stop();
  }
};

/**
 * @description 서버를 시작하는 함수
 */
IrisManager.prototype.start = function() {
  if (this.running) {
    Log.i("IrisControl", "이미 서버가 실행 중입니다.");
    return;
  }
  
  var self = this;
  var serverThread = new java.lang.Thread(new java.lang.Runnable({ 
    run: function() { self.run(); } 
  }));
  serverThread.setName("IrisControlServerThread");
  serverThread.start();
};

/////////////////////
//// 모듈 Export ////
/////////////////////

/**
 * @description IP와 PORT를 설정하고, IrisManager 인스턴스 생성
 * @return {IrisManager} IrisManager 인스턴스
 */
function set(config) {
  globalConfig.IP = config.IP || "172.0.0.1";
  globalConfig.PORT = Number(config.PORT) || 3000;
  Log.i("IrisControl", "글로벌 설정 업데이트됨: IP=" + globalConfig.IP + ", PORT=" + globalConfig.PORT);
  return new IrisManager(config.IP, config.PORT);
}


module.exports = {
  set: set,
  createConnection: createConnection
};