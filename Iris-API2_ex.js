const IrisControl = require("IrisControl");

const IrisManager = IrisControl.set({IP: "127.0.0.1", PORT: 3000});

IrisManager.on("message", function (chat, channel){
    Log.i(`메시지 받음: ${chat.text} in ${channel.id}`);
});

IrisManager.on("join", function (chat, channel){
    Log.i(`입장 이벤트: ${chat.user_id} in ${channel.id}`);
});

IrisManager.on("leave", function (chat, channel){
    Log.i(`퇴장 이벤트: ${chat.user_id} from ${channel.id}`);
});

IrisManager.on("all" /**모든 피드 반응*/, function (chat, channel){
    Log.d(`모든 피드 반응: ${channel.id}`);
});


IrisManager.start();
// 종료 예시 (필요시 호출)
// IrisManager.stop();