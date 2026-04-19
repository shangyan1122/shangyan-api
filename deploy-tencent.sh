#!/usr/bin/expect -f
set timeout 300
set server "175.27.233.51"
set password "Lianger5819..."

# 启动 SSH 连接
spawn ssh -o StrictHostKeyChecking=no root@$server

expect {
    "password:" {
        send "$password\r"
    }
    "Are you sure you want to continue connecting" {
        send "yes\r"
        expect "password:"
        send "$password\r"
    }
}

expect "# "

# 创建备份目录
send "mkdir -p /root/shangyan/backup/$(date +%Y%m%d_%H%M%S)\r"
expect "# "

# 备份现有代码
send "cp -r /root/shangyan/deploy/* /root/shangyan/backup/$(date +%Y%m%d_%H%M%S)/\r"
expect "# "

# 创建临时目录
send "mkdir -p /tmp/shangyan-upload\r"
expect "# "

send "exit\r"
expect eof
