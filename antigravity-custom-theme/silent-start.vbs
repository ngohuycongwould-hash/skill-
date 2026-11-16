Set WshShell = CreateObject("WScript.Shell")
Set WshEnv = WshShell.Environment("Process")
WshEnv("ELECTRON_RUN_AS_NODE") = "1"
WshShell.CurrentDirectory = "D:\skills\antigravity-custom-theme"
WshShell.Run "cmd.exe /c """"C:\Users\user\AppData\Roaming\Antigravity\bin\node.cmd"" ""D:\skills\antigravity-custom-theme\daemon\theme_daemon.js""""", 0, False
