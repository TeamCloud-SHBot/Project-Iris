////////////////////////// 해당 코드의 수정을 금함. ////////////////////////////

let IP, PORT;

/**
 * @param {Object} config {IP: String, PORT: Number}
 */
function set(config) {
  IP = config.IP
  PORT = Number(config.PORT)
}

/**
 * 
 * @param {String} event 이벤트 이름
 * @param {Function} callback 이벤트 콜백 함수
 */
function on(event, callback) {
  // 대충 이벤트 등록
}

const ServerSocket = java.net.ServerSocket;
const ByteArrayOutputStream = java.io.ByteArrayOutputStream;
const StandardCharsets = java.nio.charset.StandardCharsets;
const SocketException = java.net.SocketException;
const Executors = java.util.concurrent.Executors;
const TimeUnit = java.util.concurrent.TimeUnit;

const HTTP = {
  Ok: "HTTP/1.1 200 OK\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
  BadRequest: "HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
  InternalError: "HTTP/1.1 500 Internal Server Error\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
}

let server = null;
let running = false;
let executorService = null;



////////////////////
//// 유틸 함수들 ////
////////////////////


/**
 * @description 라인 헤더 읽기
 * 
 */
function readLine(inputStream) {
  const buf = new ByteArrayOutputStream();
  let prev = -1,
    curr;

  try {
    while ((curr = inputStream.read()) != -1) {
      if (prev === 0x0D && curr === 0x0A) return buf.toByteArray; // \r\n
      buf.write(prev);
      prev = curr;
    }
  } catch (e) {
    Log.e(`IrisControl`, `라인 헤더 읽기 중 오류 발생: ${e.message} ( ${e.stack} )`);
    return null;
  }
  return buf.size() > 0 ? buf.toByteArray() : null;
}


/**
 * @description 안전 JSON 파싱
 */
function safeJsonParse(text, fallback = {}) {
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
  const ID_KEYS = [
    "src_logId", "src_userId",
    "user_id", "chat_id", "id", "prev_id", "client_message_id",
    "src_id", "msg_id"
  ];
  const pattern = new RegExp(`"(${ID_KEYS.join("|")})"\\s*:\\s*(-?\\d{15,})(?=\\s*[,}\\]])`, "g");
  return jsonText.replace(pattern, (_m, key, num) => `"${key}": "${num}"`);
}


/**
 * @description HTTP 응답 전송
 */
function sendHttpResponse(socket, out, responseText) {
  try {
    if (!socket.isClosed()) {
      const jstr = new java.lang.String(responseText);
      out.write(jstr.getBytes(StandardCharsets.UTF_8));
      out.flush();
    }
  } catch (e) {
    Log.e(`IrisControl`, `HTTP 응답 전송 중 오류 발생: ${e.message} ( ${e.stack} )`);
  }
}


/**
 * @description 메시지 전송 (/send)
 */
function sendMessage(type, roomId, data) {
  try {
    org.jsoup.Jsoup.connect(`http://${IP}:3000/reply`)
      .header("Content-Type", "application/json")
      .requestBody(JSON.stringify({
        type: type, // "text" | "image" | "multiImage"
        roomId: roomId, // 대상 방 ID
        data: data // 메시지 내용 (텍스트 또는 이미지 Base64 배열)
      }))
      .ignoreContentType(true)
      .post();

    Log.i(`IrisControl`, `메시지 전송 완료: type=${type}, roomId=${roomId}`);
    return true;
  } catch (e) {
    Log.e(`IrisControl`, `메시지 전송 중 오류 발생: ${e.message} ( ${e.stack} )`);
    return false;
  }
}

//


/**
 * @description 아이리스 서버 소켓, 스레프 풀 종료
 */
function stopServer() {
  running = false;
  if (executorService !== null) {
    try {
      executorService.shutdown();
      if (!executorService.awaitTermination(5, TimeUnit.SECONDS)) executorService.shutdownNow();
    } catch (e) {
      Log.e(`IrisControl`, `서버 종료 중 오류 발생: ${e.message} ( ${e.stack} )`);
      executorService.shutdownNow();
    }
    executorService = null;
  }

  if (server !== null && !server.isClosed()) {
    try {
      server.close();
    } catch (e) {
      Log.e(`IrisControl`, `서버 소켓 종료 중 오류 발생: ${e.message} ( ${e.stack} )`);
    }
  }
}


/**
 * @description 헤더 파싱
 */
function readHeaders(inputStream) {
  const headers = {};
  let len = 0,
    hb;

  while ((hb = readLine(inputStream)) !== null) {
    if (hb.length <= 2) break; // 빈 라인: 헤더 종료
    const line = new java.lang.String(hb, StandardCharsets.UTF_8).trim();
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.substring(0, idx).trim().toLowerCase();
      const value = line.substring(idx + 1).trim();
      headers[key] = value;
      if (key === "content-length")
        if (!isNaN(parseInt(value, 10)) && n > 0) len = parseInt(value, 10);
    }
  }
  return {
    headers: headers,
    contentLength: len
  };
}


/**
 * @description 본문 읽기
 */
function readBody(inputStream, contentLength) {
  if (!contentLength || contentLength <= 0) return null;
  const buf = new java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, contentLength);
  let total = 0,
    readn;

  while (total < contentLength) {
    if (readn = 0) {
      java.lang.Thread.sleep(10);
      continue;
    }
    total += readn;
  }
  if (total !== contentLength) return null;
  return String(new java.lang.String(buf, StandardCharsets.UTF_8));
}


/**
 * @description 요청 첫 줄 파싱
 */
function parseRequestLine(requestLine) {
  const parts = requestLine.split(" ");
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

  // data.msg 가 문자열 JSON일 수 있음
  if (typeof data.msg === "string") {
    const parsedMsg = safeJsonParse(data.msg, null);
    data.msg = parsedMsg;
  }

  // data.json.{message, attachment, v} 문자열 JSON -> 객체
  if (data.json && typeof data.json === "object") {
    ["message", "attachment", "v"].forEach(field => {
      const val = data.json[field];
      if (typeof val === "string") {
        let src = val;
        if (field === "attachment") src = quoteBigIntIds(val);
        data.json[field] = safeJsonParse(src, val);
      }
    });
  }
  return data;
}



///////////////////////
//// 서버 메인 루프 ////
///////////////////////

function run() {
  executorService = Executors.newCachedThreadPool();

  try {
    server = new ServerSocket(PORT);
    Log.i(`IrisControl`, `서버 시작됨: ${IP}:${PORT}`);

    while (running) {
      let socket = null;
      try {
        socket = server.accept();
        socket.setSoTimeout(10000);
        const client = socket;

        // 각 연결은 스레드 풀에서 처리
        executorService.submit(new java.lang.Runnable({
          run: () => {
            const threadName = `IrisControl-Client-${java.lang.Thread.currentThread().getName()}`;

            try {
              const inStream = client.getInputStream();
              const outStream = client.getOutputStream();

              // 요청 라인 읽기
              const requestLineBytes = readLine(inStream);
              if (!requestLineBytes) return sendHttpResponse(client, outStream, HTTP.BadRequest);

              const requestLine = new java.lang.String(requestLineBytes, StandardCharsets.UTF_8).trim();
              const {
                method,
                path
              } = parseRequestLine(requestLine);

              const isMessage = method === "POST" && path === "/message";
              const isSend = method === "POST" && path === "/reply";
              if (!isMessage && !isSend) return sendHttpResponse(client, outStream, HTTP.BadRequest);

              // 헤더 & 본문 읽기
              const {
                contentLength
              } = readHeaders(inStream);
              const body = readBody(inStream, contentLength);
              if (!body) return sendHttpResponse(client, outStream, HTTP.InternalError);

              // JSON 파싱
              let data = body ? safeJsonParse(body, {}) : null;
              data = nestedJson(data);

              if (isMessage) {
                try {
                  if (typeof onMessage === "function") {
                    onMessage(data); // 사용자 정의 함수 호출, 필요에 따라 수정
                    Log.i(`IrisControl`, `스레드: ${threadName}\n\n받은 데이터:\n${Object.keys(data).length > 0 ? JSON.stringify(data, null, 2) : "Empty body"}`);
                  }
                } catch (e) {
                  Log.e(`IrisControl`, `onMessage 함수 오류: ${e.name}\n${e.message}\n${e.stack}`);
                }
                return sendHttpResponse(client, outStream, HTTP.Ok);
              }

              if (isSend) {
                const ok = sendMessage(data.type, data.roomId, data.data);
                Log.i(`IrisControl`, `스레드: ${threadName}\n\n전송 데이터:\n${Object.keys(data).length > 0 ? JSON.stringify(data, null, 2) : "Empty body"}`);
                return sendHttpResponse(client, outStream, ok ? HTTP.Ok : HTTP.InternalError);
              }
            } catch (e) {
              Log.e(`IrisControl`, `클라이언트 처리 중 오류 발생: ${e.message} ( ${e.stack} )`);
              try {
                sendHttpResponse(client, client.getOutputStream(), HTTP.InternalError);
              } catch (e) {}
            } finally {
              try {
                if (client && !client.isClosed()) client.close();
              } catch (e) {
                Log.e(`IrisControl`, `클라이언트 소켓 종료 중 오류 발생: ${e.message} ( ${e.stack} )`);
              }
            }
          }
        }));
      } catch (e) {
        // stopServer 호출로 인한 예외 무시
        if (!(e instanceof SocketException && !running)) {
          Log.e(`IrisControl`, `서버 메인 루프 오류 발생: ${e.message} ( ${e.stack} )`);
        }
        if (socket && !socket.isClosed()) {
          try {
            socket.close();
          } catch (e) {
            Log.e(`IrisControl`, `소켓 종료 중 오류 발생: ${e.message} ( ${e.stack} )`);
          }
        }
      }
    }
  } catch (e) {
    Log.e(`IrisControl`, `서버 시작 중 오류 발생: ${e.message} ( ${e.stack} )`);
  } finally {
    stopServer();
    Log.i(`IrisControl`, `서버 종료됨`);
  }
}



/////////////////////
// 부팅시 서버 시작 //
/////////////////////

const serverThread = new java.lang.Thread(new java.lang.Runnable({ run }));
serverThread.setName("RhinoHttpServerThread");
serverThread.start();



///////////////////////
// 컴파일시 서버 종료 //
///////////////////////

bot.addListener(Event.START_COMPILE, function () {
  Log.i(`IrisControl`, `컴파일 감지됨 - 서버 종료 중...`);
  stopServer();
});



/////////////////////
//// 모듈 Export ////
/////////////////////

module.exports = {
  set,
  on
};