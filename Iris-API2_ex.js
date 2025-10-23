const IrisControl = require("IrisControl");


IrisControl.set({IP: "", PORT: 3000})

  exports.Iris = {
    createConnection: function (IP, PORT, ...etc){
        return "대충 아이리스 메니저"
    }
}

IrisManager.on("message", function (chat, channel){})
IrisManager.on("join", function (chat, channel){})
IrisManager.on("leave", function (chat, channel){})
IrisManager.on("all" /**모든 피드 반응*/, function (chat, channel){})

IrisManager.start()
IrisManager.stop()

