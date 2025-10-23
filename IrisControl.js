////////////////////////// 해당 코드의 수정을 금함. ////////////////////////////

let IP, PORT;

/**
 * @param {Object} data {IP: String, PORT: Number}
 */
function set(data) {
  IP = data.IP
  PORT = data.PORT
}

function on(name, func) {
  
}

const ServerSocket = java.net.ServerSocket;
const InputStream = java.io.InputStream;
const ByteArrayOutputStream = java.io.ByteArrayOutputStream;
const StandardCharsets = java.nio.charset.StandardCharsets;
const SocketException = java.net.SocketException;
const Executors = java.util.concurrent.Executors;
const TimeUnit = java.util.concurrent.TimeUnit;

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

module.exports = {}